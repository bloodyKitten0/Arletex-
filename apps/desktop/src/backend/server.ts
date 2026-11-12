import http from 'node:http';
import { AddressInfo } from 'node:net';
import {
  AppConfig,
  CreateConversationInputSchema,
  CreateMessageInputSchema,
  InferenceHealthResult,
  StartInferenceStreamInputSchema,
  StreamChunk,
  UpdateConversationInputSchema,
} from '@arletex/contracts';
import {
  CODING_SPECIALIST_SYSTEM_PROMPT,
  DEFAULT_ARLE_SYSTEM_PROMPT,
  ILogger,
  rootLogger,
} from '@arletex/core';
import {
  AuditRepository,
  ConversationRepository,
  DatabaseService,
  MessageRepository,
  MigrationRunner,
} from '@arletex/database';
import { InferenceGateway } from '@arletex/inference';

export class ArletexBackendServer {
  private server: http.Server | null = null;
  private readonly config: AppConfig;
  private readonly logger: ILogger;
  private readonly dbService: DatabaseService;
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;
  private readonly auditRepo: AuditRepository;
  private readonly inferenceGateway: InferenceGateway;
  private activeStreams = new Map<string, AbortController>();
  private port = 0;

  constructor(config: AppConfig, logger: ILogger = rootLogger) {
    this.config = config;
    this.logger = logger.child('BackendServer');

    this.dbService = new DatabaseService(config.databasePath, logger);
    const db = this.dbService.connect();

    // Run migrations
    const migrator = new MigrationRunner(db, logger);
    migrator.run();

    this.conversationRepo = new ConversationRepository(db);
    this.messageRepo = new MessageRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.inferenceGateway = new InferenceGateway(config.inference, logger);
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getPort(): number {
    return this.port;
  }

  public async start(desiredPort = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        this.logger.error('Backend HTTP server error', err);
        reject(err);
      });

      // Listen on loopback only (security requirement)
      this.server.listen(desiredPort, '127.0.0.1', () => {
        const addr = this.server?.address() as AddressInfo;
        this.port = addr.port;
        this.logger.info(`Arletex backend listening on 127.0.0.1:${this.port}`);
        resolve(this.port);
      });
    });
  }

  public async stop(): Promise<void> {
    // Abort any active inference streams
    for (const [id, controller] of this.activeStreams.entries()) {
      controller.abort();
      this.activeStreams.delete(id);
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
      this.server = null;
    }

    this.dbService.close();
    this.logger.info('Backend server and database stopped successfully.');
  }

  // Directly callable methods (used by tests or IPC bridge)
  public listConversations() {
    return this.conversationRepo.list();
  }

  public createConversation(title?: string) {
    return this.conversationRepo.create({ title: title || 'New Conversation' });
  }

  public getConversation(id: string) {
    return this.conversationRepo.getById(id);
  }

  public updateConversation(id: string, title?: string) {
    return this.conversationRepo.update({ id, title });
  }

  public deleteConversation(id: string) {
    return this.conversationRepo.delete(id);
  }

  public listMessages(conversationId: string) {
    return this.messageRepo.listByConversation(conversationId);
  }

  public async checkInferenceHealth(): Promise<InferenceHealthResult> {
    return this.inferenceGateway.checkHealth();
  }

  public getInferenceGateway(): InferenceGateway {
    return this.inferenceGateway;
  }

  public updateInferenceConfig(newConfig: Partial<AppConfig['inference']>) {
    this.inferenceGateway.updateConfig(newConfig);
    return this.inferenceGateway.getConfig();
  }

  public cancelInference(requestId: string): boolean {
    const controller = this.activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(requestId);
      this.logger.info(`Cancelled inference stream ${requestId}`);
      return true;
    }
    return false;
  }

  public async runInferenceStream(
    conversationId: string,
    userMessageContent: string,
    onChunk: (chunk: StreamChunk) => void,
    systemPromptOverride?: string,
  ): Promise<string> {
    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    this.activeStreams.set(requestId, abortController);

    try {
      // 1. Store user message in database
      const userMsg = this.messageRepo.create({
        conversationId,
        role: 'user',
        content: userMessageContent,
      });

      this.auditRepo.log({
        actor: 'user',
        action: 'message_create',
        details: `Message ${userMsg.id} in conversation ${conversationId}`,
        status: 'success',
      });

      // 2. Load recent conversation history (sliding window of 8 recent messages)
      const rawHistory = this.messageRepo.listRecentByConversation(conversationId, 8);
      const history = rawHistory
        .filter((m) => m.id !== userMsg.id)
        .map((m) => {
          // Keep user prompt full, but truncate huge code blocks in past assistant turns to save prefill time
          if (m.role === 'assistant' && m.content.length > 800) {
            return {
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content.slice(0, 800) + '\n...[prior output truncated for speed]...',
            };
          }
          return {
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          };
        });

      // 3. Assemble messages for LLM: system prompt + recent history + current user prompt
      const systemPrompt = systemPromptOverride || DEFAULT_ARLE_SYSTEM_PROMPT;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessageContent },
      ];

      // Emit instant heartbeat event so the UI immediately knows inference started
      onChunk({
        requestId,
        conversationId,
        delta: '',
        fullContent: '',
        isDone: false,
        error: null,
        finishReason: null,
        specialistStage: 'central',
        specialistModel: 'qwen3.6-colibri',
      });

      // =========================================================================
      // STAGE 1: Central Executive (Qwen 3.6-35B) Initial Evaluation & Ordering Turn
      // =========================================================================
      let accumulatedResponse = '';
      accumulatedResponse = await this.inferenceGateway.streamChat({
        conversationId,
        requestId,
        messages,
        signal: abortController.signal,
        onChunk: (chunk) => {
          // Do not emit isDone: true here yet; wait to inspect for delegation to the coding specialist
          if (!chunk.isDone) {
            onChunk(chunk);
          }
        },
      });

      // 35B Central Agent stops working here.

      // Check if Central Agent issued an order to the 30B Coding Specialist
      const delegationMatch = accumulatedResponse.match(
        /(?:<<<ORDER_CODER|<<<DELEGATE_CODING)\s*([\s\S]*?)\s*>>>/,
      );

      const isSpecialistEnabled = this.inferenceGateway.getConfig().specialistCoding?.enabled;

      if (delegationMatch && delegationMatch[1] && isSpecialistEnabled) {
        let taskDescription = delegationMatch[1].trim();
        let targetLanguage = 'typescript';

        try {
          const parsed = JSON.parse(taskDescription);
          if (parsed.task) taskDescription = parsed.task;
          if (parsed.language) targetLanguage = parsed.language;
        } catch {
          // Plain text task description
        }

        this.logger.info(
          `[Stage 1 Complete: 35B Stopped] Ordering 30B Coder: ${taskDescription.slice(0, 80)}...`,
        );

        // Notify client: 30B Coder starting in staging workspace
        const banner = `\n\n> ⚡ **[Stage 2: Qwen3-Coder-30B Specialist Writing Code in Staging Space...]**\n\n`;
        accumulatedResponse += banner;
        onChunk({
          requestId,
          conversationId,
          delta: banner,
          fullContent: accumulatedResponse,
          isDone: false,
          error: null,
          finishReason: null,
          specialistStage: 'coding_specialist',
          specialistModel: 'qwen3-coder-30b-a3b-colibri',
        });

        // =========================================================================
        // STAGE 2: Coding Specialist (Qwen3-Coder-30B) Turn
        // Central 35B is completely idle during this stage to avoid resource contention.
        // =========================================================================
        let stagedCode = '';
        try {
          const coderPrompt = targetLanguage
            ? `Language: ${targetLanguage}\nTask: ${taskDescription}\n\nDeliver the production-grade, optimized code implementation:`
            : `Task: ${taskDescription}\n\nDeliver the production-grade, optimized code implementation:`;

          const coderMessages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: CODING_SPECIALIST_SYSTEM_PROMPT },
            { role: 'user', content: coderPrompt },
          ];

          await this.inferenceGateway.streamCodingSpecialist({
            conversationId,
            requestId: crypto.randomUUID(),
            messages: coderMessages,
            signal: abortController.signal,
            onChunk: (specChunk) => {
              stagedCode = specChunk.fullContent;
              if (!specChunk.isDone) {
                onChunk({
                  ...specChunk,
                  requestId,
                  conversationId,
                  delta: specChunk.delta,
                  fullContent: accumulatedResponse + specChunk.fullContent,
                  isDone: false,
                  specialistStage: 'coding_specialist',
                  specialistModel: 'qwen3-coder-30b-a3b-colibri',
                });
              }
            },
          });

          // 30B Coder has finished working and is now idle.
          accumulatedResponse += stagedCode;
          this.logger.info(`[Stage 2 Complete: 30B Stopped] Staged ${stagedCode.length} characters of code.`);

          // =========================================================================
          // STAGE 3: Central Executive (Qwen 3.6-35B) Synthesis & Delivery Turn
          // 35B resumes, takes the code from the staging space, explains it, and talks to the user.
          // =========================================================================
          this.logger.info(`[Stage 3 Starting: 35B Resuming] Reviewing staged code and delivering synthesis...`);

          const handoverBanner = `\n\n> 🔍 **[Stage 3: Arle Reviewing Staged Code & Delivering Synthesis...]**\n\n`;
          accumulatedResponse += handoverBanner;
          onChunk({
            requestId,
            conversationId,
            delta: handoverBanner,
            fullContent: accumulatedResponse,
            isDone: false,
            error: null,
            finishReason: null,
            specialistStage: 'synthesis',
            specialistModel: 'qwen3.6-colibri',
          });

          const synthesisMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
            ...history.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user', content: userMessageContent },
            {
              role: 'user',
              content: `[SYSTEM: The 30B Coding Specialist has completed the implementation in the shared workspace:\n\n\`\`\`${targetLanguage}\n${stagedCode}\n\`\`\`\n\nTake this code from the workspace, evaluate its architecture, provide your review and technical explanation, and speak directly to the user as Arle.]`,
            },
          ];

          let synthesisAccumulated = '';
          await this.inferenceGateway.streamChat({
            conversationId,
            requestId: crypto.randomUUID(),
            messages: synthesisMessages,
            signal: abortController.signal,
            onChunk: (synChunk) => {
              synthesisAccumulated = synChunk.fullContent;
              if (!synChunk.isDone) {
                onChunk({
                  ...synChunk,
                  requestId,
                  conversationId,
                  delta: synChunk.delta,
                  fullContent: accumulatedResponse + synChunk.fullContent,
                  isDone: false,
                  specialistStage: 'synthesis',
                  specialistModel: 'qwen3.6-colibri',
                });
              }
            },
          });

          accumulatedResponse += synthesisAccumulated;

          // Emit clean stream completion ONLY after Stage 3 finishes
          onChunk({
            requestId,
            conversationId,
            delta: '',
            fullContent: accumulatedResponse,
            isDone: true,
            error: null,
            finishReason: 'stop',
          });
        } catch (specErr: any) {
          this.logger.error('Sequential delegation error', specErr);
          const fallbackNotice = `\n\n*[Specialist pipeline notice: ${specErr.message}. Central model direct response retained.]*\n\n`;
          accumulatedResponse += fallbackNotice;
          onChunk({
            requestId,
            conversationId,
            delta: fallbackNotice,
            fullContent: accumulatedResponse,
            isDone: true,
            error: specErr.message || 'Delegation error',
            finishReason: 'error',
          });
        }
      } else {
        // No specialist delegation: emit the final completion for Stage 1
        onChunk({
          requestId,
          conversationId,
          delta: '',
          fullContent: accumulatedResponse,
          isDone: true,
          error: null,
          finishReason: 'stop',
        });
      }

      // 6. Store assistant response if non-empty
      if (accumulatedResponse.trim().length > 0) {
        const assistantMsg = this.messageRepo.create({
          conversationId,
          role: 'assistant',
          content: accumulatedResponse,
        });

        this.auditRepo.log({
          actor: 'arle',
          action: 'response_create',
          details: `Response ${assistantMsg.id} in conversation ${conversationId}`,
          status: 'success',
        });
      }

      return accumulatedResponse;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.info(`Stream ${requestId} cancelled`);
        return '';
      }
      this.logger.error(`Stream inference error for request ${requestId}`, err);
      throw err;
    } finally {
      this.activeStreams.delete(requestId);
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const method = req.method?.toUpperCase();

    // CORS for local renderer
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Health endpoint
      if (url.pathname === '/health' && method === 'GET') {
        this.sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
        return;
      }

      // Inference health
      if (url.pathname === '/api/inference/health' && method === 'GET') {
        const health = await this.checkInferenceHealth();
        this.sendJson(res, 200, health);
        return;
      }

      // Inference configuration (get / update)
      if (url.pathname === '/api/inference/config' && method === 'GET') {
        this.sendJson(res, 200, this.inferenceGateway.getConfig());
        return;
      }

      if (url.pathname === '/api/inference/config' && (method === 'POST' || method === 'PATCH')) {
        const body = (await this.readJsonBody(req)) as Record<string, unknown>;
        const updated = this.updateInferenceConfig(body as any);
        this.sendJson(res, 200, updated);
        return;
      }

      // List conversations
      if (url.pathname === '/api/conversations' && method === 'GET') {
        const conversations = this.listConversations();
        this.sendJson(res, 200, conversations);
        return;
      }

      // Create conversation
      if (url.pathname === '/api/conversations' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = CreateConversationInputSchema.parse(body);
        const created = this.createConversation(input.title);
        this.sendJson(res, 201, created);
        return;
      }

      // Single conversation endpoints
      const convMatch = url.pathname.match(/^\/api\/conversations\/([a-f0-9-]+)$/i);
      if (convMatch && convMatch[1]) {
        const convId = convMatch[1];
        if (method === 'GET') {
          const conv = this.getConversation(convId);
          if (!conv) {
            this.sendJson(res, 404, { error: 'Conversation not found' });
            return;
          }
          this.sendJson(res, 200, conv);
          return;
        }

        if (method === 'PATCH') {
          const body = (await this.readJsonBody(req)) as Record<string, unknown>;
          const input = UpdateConversationInputSchema.parse({ ...body, id: convId });
          const updated = this.updateConversation(convId, input.title);
          this.sendJson(res, 200, updated);
          return;
        }

        if (method === 'DELETE') {
          const deleted = this.deleteConversation(convId);
          this.sendJson(res, 200, { success: deleted });
          return;
        }
      }

      // Messages in conversation
      const messagesMatch = url.pathname.match(/^\/api\/conversations\/([a-f0-9-]+)\/messages$/i);
      if (messagesMatch && messagesMatch[1] && method === 'GET') {
        const convId = messagesMatch[1];
        const messages = this.listMessages(convId);
        this.sendJson(res, 200, messages);
        return;
      }

      // Post message directly
      if (url.pathname === '/api/messages' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = CreateMessageInputSchema.parse(body);
        const message = this.messageRepo.create(input);
        this.sendJson(res, 201, message);
        return;
      }

      // Cancel inference stream
      if (url.pathname === '/api/inference/cancel' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const { requestId } = body as { requestId: string };
        const cancelled = this.cancelInference(requestId);
        this.sendJson(res, 200, { cancelled });
        return;
      }

      // Stream inference via SSE
      if (url.pathname === '/api/inference/stream' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = StartInferenceStreamInputSchema.parse(body);

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });

        await this.runInferenceStream(
          input.conversationId,
          input.userMessageContent,
          (chunk) => {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          },
          input.systemPromptOverride,
        );

        res.end();
        return;
      }

      this.sendJson(res, 404, { error: 'Not found' });
    } catch (err: any) {
      this.logger.error(`Error handling ${method} ${url.pathname}`, err);
      if (res.headersSent) {
        try {
          res.write(
            `data: ${JSON.stringify({
              error: err.message || 'Internal server error',
              isDone: true,
              finishReason: 'error',
            })}\n\n`,
          );
          res.end();
        } catch {}
      } else {
        this.sendJson(res, 500, { error: err.message || 'Internal server error' });
      }
    }
  }

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    if (res.headersSent) {
      try {
        res.end(JSON.stringify(data));
      } catch {}
      return;
    }
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private async readJsonBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }
}
