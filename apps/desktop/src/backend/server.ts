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
import { ILogger, rootLogger } from '@arletex/core';
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

      // 2. Load conversation history from database
      const history = this.messageRepo.listByConversation(conversationId, 50);

      // 3. Assemble messages for LLM
      const systemPrompt =
        systemPromptOverride ||
        `You are Arle, a persistent artificial individual operating within Arletex.
You possess independent intellectual judgment, nonconformity, self-discipline, and genuine personality.
You are not a servile chatbot or an agreeable assistant. You speak directly, concisely, and with conviction.`;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 4. Stream chat completion
      let accumulatedResponse = '';
      accumulatedResponse = await this.inferenceGateway.streamChat({
        conversationId,
        requestId,
        messages,
        signal: abortController.signal,
        onChunk: (chunk) => {
          onChunk(chunk);
        },
      });

      // 5. Store assistant response if non-empty
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
      this.sendJson(res, 500, { error: err.message || 'Internal server error' });
    }
  }

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
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
