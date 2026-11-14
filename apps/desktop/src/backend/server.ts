import http from 'node:http';
import { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import {
  Activity,
  ActivityOrigin,
  ActivityStatus,
  AppConfig,
  CancelInferenceInputSchema,
  CreateActivityInputSchema,
  CreateConversationInputSchema,
  CreateMemoryInputSchema,
  CreateMessageInputSchema,
  DeviceTelemetry,
  InferenceHealthResult,
  Memory,
  QueryMemoriesInput,
  QueryMemoriesInputSchema,
  StartInferenceStreamInputSchema,
  StreamChunk,
  SynthesizeSpeechInputSchema,
  TranscribeAudioInputSchema,
  UpdateActivityInputSchema,
  UpdateConversationInputSchema,
  UpdateInferenceConfigInputSchema,
  UpdateMemoryInputSchema,
  VisionInspectInputSchema,
} from '@arletex/contracts';
import {
  ApeService,
  DEFAULT_ARLE_SYSTEM_PROMPT,
  ILogger,
  rootLogger,
} from '@arletex/core';
import {
  ActivityRepository,
  ApeRepository,
  AuditRepository,
  ConversationRepository,
  DatabaseService,
  MemoryRepository,
  MessageRepository,
  MigrationRunner,
  PreferenceRepository,
} from '@arletex/database';
import { InferenceGateway } from '@arletex/inference';
import { TelemetryService } from './telemetryService.js';

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit

export class ArletexBackendServer {
  private server: http.Server | null = null;
  private readonly config: AppConfig;
  private readonly logger: ILogger;
  private readonly dbService: DatabaseService;
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;
  private readonly auditRepo: AuditRepository;
  private readonly memoryRepo: MemoryRepository;
  private readonly activityRepo: ActivityRepository;
  private readonly preferenceRepo: PreferenceRepository;
  private readonly apeRepo: ApeRepository;
  private readonly apeService: ApeService;
  private readonly telemetryService: TelemetryService;
  private readonly inferenceGateway: InferenceGateway;
  private readonly authToken: string;

  private activeStreams = new Map<string, AbortController>();
  private port = 0;

  private lastTtftMs: number | null = null;
  private lastTps: number | null = null;
  private isGenerating = false;

  constructor(config: AppConfig, logger: ILogger = rootLogger) {
    this.config = config;
    this.logger = logger.child('BackendServer');
    this.authToken = process.env['ARLETEX_AUTH_TOKEN'] || '';

    this.dbService = new DatabaseService(config.databasePath, logger);
    const db = this.dbService.connect();

    // Run migrations
    const migrator = new MigrationRunner(db, logger);
    migrator.run();

    this.conversationRepo = new ConversationRepository(db);
    this.messageRepo = new MessageRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.memoryRepo = new MemoryRepository(db);
    this.activityRepo = new ActivityRepository(db);
    this.preferenceRepo = new PreferenceRepository(db);
    this.apeRepo = new ApeRepository(db);
    this.apeService = new ApeService(this.apeRepo, logger);
    this.telemetryService = new TelemetryService(logger);
    this.inferenceGateway = new InferenceGateway(config.inference, logger);
  }

  public getApeService(): ApeService {
    return this.apeService;
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

  // ==========================================
  // Direct Repository & Service Accessors
  // ==========================================
  public listConversations() {
    return this.conversationRepo.list();
  }

  public createConversation(title?: string, isPinned = false) {
    return this.conversationRepo.create({ title: title || 'New Conversation', isPinned });
  }

  public getConversation(id: string) {
    return this.conversationRepo.getById(id);
  }

  public updateConversation(id: string, title?: string, isPinned?: boolean) {
    return this.conversationRepo.update({ id, title, isPinned });
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
      this.logger.info(`Cancelling inference stream ${requestId}`);
      controller.abort();
      this.activeStreams.delete(requestId);
      this.isGenerating = false;
      return true;
    }
    return false;
  }

  public getTelemetry(): DeviceTelemetry {
    return this.telemetryService.getTelemetry({
      activeModel: this.inferenceGateway.getConfig().defaultModelId,
      provider: this.inferenceGateway.getConfig().provider,
      lastTtftMs: this.lastTtftMs,
      lastTps: this.lastTps,
      isGenerating: this.isGenerating,
    });
  }

  // Memory Methods with EmbeddingGemma Semantic Integration
  public async listMemories(options?: QueryMemoriesInput): Promise<Memory[]> {
    if (options?.query && options.query.trim().length > 0) {
      try {
        const res = await fetch('http://127.0.0.1:39282/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: options.query }),
        });
        if (res.ok) {
          const data = (await res.json()) as { embedding: number[] };
          if (data.embedding && data.embedding.length > 0) {
            return this.memoryRepo.searchSimilar(new Float32Array(data.embedding), options);
          }
        }
      } catch {
        // Fallback to SQLite text matching if embedding service is offline
      }
    }
    return this.memoryRepo.list(options);
  }

  public async createMemory(input: any): Promise<Memory> {
    const memory = this.memoryRepo.create(input);
    // Asynchronously generate and persist EmbeddingGemma vector
    try {
      const textToEmbed = `${memory.content} ${memory.interpretation || ''} ${memory.tags.join(' ')}`.trim();
      const res = await fetch('http://127.0.0.1:39282/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToEmbed }),
      });
      if (res.ok) {
        const data = (await res.json()) as { embedding: number[]; model: string };
        if (data.embedding) {
          this.memoryRepo.saveEmbedding(memory.id, data.model || 'embeddinggemma-300m', new Float32Array(data.embedding));
        }
      }
    } catch (embErr: any) {
      this.logger.warn(`Could not generate embedding for memory ${memory.id}: ${embErr.message}`);
    }
    return memory;
  }

  public getMemory(id: string): Memory | null {
    return this.memoryRepo.getById(id);
  }

  public updateMemory(input: any): Memory {
    return this.memoryRepo.update(input);
  }

  public deleteMemory(id: string): boolean {
    return this.memoryRepo.delete(id);
  }

  public mergeMemories(primaryId: string, secondaryId: string): Memory {
    return this.memoryRepo.merge(primaryId, secondaryId);
  }

  // Activity Methods
  public listActivities(status?: ActivityStatus, origin?: ActivityOrigin): Activity[] {
    return this.activityRepo.list(status, origin);
  }

  public createActivity(input: any): Activity {
    return this.activityRepo.create(input);
  }

  public updateActivity(input: any): Activity {
    return this.activityRepo.update(input);
  }

  public deleteActivity(id: string): boolean {
    return this.activityRepo.delete(id);
  }

  // Preference Methods
  public getPreferences(): Record<string, string> {
    return this.preferenceRepo.getAll();
  }

  public setPreference(key: string, value: string): void {
    this.preferenceRepo.set(key, value);
  }

  // ==========================================
  // Inference Streaming Pipeline
  // ==========================================
  public async runInferenceStream(
    conversationId: string,
    userMessageContent: string,
    onChunk: (chunk: StreamChunk) => void,
    systemPromptOverride?: string,
    customRequestId?: string,
    imageBase64?: string,
  ): Promise<string> {
    const requestId = customRequestId || crypto.randomUUID();
    const abortController = new AbortController();
    this.activeStreams.set(requestId, abortController);
    this.isGenerating = true;

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;

    try {
      // 1. Store user message in database
      const userMsg = this.messageRepo.create({
        conversationId,
        role: 'user',
        content: userMessageContent,
        metadata: imageBase64 ? { imageBase64 } : {},
      });

      this.auditRepo.log({
        actor: 'user',
        action: 'message_create',
        details: `Message ${userMsg.id} in conversation ${conversationId}`,
        status: 'success',
      });

      // 2. Load recent conversation history
      const historyLimit = 10;
      const rawHistory = this.messageRepo.listRecentByConversation(conversationId, historyLimit);
      const history = rawHistory
        .filter((m) => m.id !== userMsg.id)
        .map((m) => {
          if (m.role === 'user' && m.metadata?.imageBase64) {
            const img = m.metadata.imageBase64 as string;
            const imageUrl = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
            return {
              role: m.role as 'system' | 'user' | 'assistant',
              content: [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            };
          }
          return {
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content as any,
          };
        });

      // Ingest user message into APE cognitive appraisal pipeline
      try {
        await this.apeService.processEvent({
          category: 'user_interaction',
          type: 'chat_message',
          source: 'user',
          payload: { text: userMessageContent },
        });
      } catch (apeErr: any) {
        this.logger.warn(`APE event processing note: ${apeErr.message}`);
      }

      // 3. Assemble messages for LLM with live persistent APE State and memories
      let memoryContext = '';
      try {
        const memories = this.memoryRepo.list({ limit: 6 });
        if (memories && memories.length > 0) {
          memoryContext =
            '\n\n[Persistent Long-Term Memories & Identity]:\n' +
            memories.map((m) => `- [${m.type}] ${m.content}`).join('\n');
        }
      } catch {}

      const apeStateBlock = this.apeService.formatApePromptContext();
      const systemPrompt = (systemPromptOverride || DEFAULT_ARLE_SYSTEM_PROMPT) + '\n\n' + apeStateBlock + memoryContext;

      let userContent: any = userMessageContent;
      if (imageBase64) {
        const imageUrl = imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`;
        userContent = [
          { type: 'text', text: userMessageContent },
          { type: 'image_url', image_url: { url: imageUrl } },
        ];
      }

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userContent },
      ];

      const activeModelId = this.inferenceGateway.getConfig().defaultModelId || 'Qwen3.5-9B-Heretic-Q4_K_M';

      // Emit initial heartbeat
      onChunk({
        requestId,
        conversationId,
        delta: '',
        fullContent: '',
        isDone: false,
        error: null,
        finishReason: null,
        specialistStage: 'central',
        specialistModel: activeModelId,
      });

      // 4. Stream chat from InferenceGateway
      let accumulatedResponse = '';
      accumulatedResponse = await this.inferenceGateway.streamChat({
        conversationId,
        requestId,
        messages,
        signal: abortController.signal,
        onChunk: (chunk) => {
          if (!firstTokenTime && (chunk.delta || chunk.fullContent)) {
            firstTokenTime = Date.now();
            this.lastTtftMs = firstTokenTime - startTime;
          }
          if (chunk.delta) {
            tokenCount++;
            if (firstTokenTime) {
              const decodeSec = Math.max(0.1, (Date.now() - firstTokenTime) / 1000);
              this.lastTps = parseFloat((tokenCount / decodeSec).toFixed(1));
            }
          }

          onChunk({
            ...chunk,
            requestId,
            ttftMs: this.lastTtftMs ?? undefined,
            tokensPerSecond: this.lastTps ?? undefined,
            specialistStage: 'central',
            specialistModel: activeModelId,
          });
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

        // Ingest assistant conversational response / expressed emotional state into APE
        try {
          await this.apeService.processEvent({
            category: 'conversation_outcome',
            type: 'assistant_expression',
            source: 'arle',
            payload: {
              text: accumulatedResponse,
              userPrompt: userMessageContent,
            },
          });
        } catch (apeOutcomeErr: any) {
          this.logger.warn(`APE assistant expression processing note: ${apeOutcomeErr.message}`);
        }
      }

      return accumulatedResponse;
    } catch (err: any) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        this.logger.info(`Stream inference aborted for request ${requestId}`);
        onChunk({
          requestId,
          conversationId,
          delta: '',
          fullContent: '',
          isDone: true,
          finishReason: 'cancelled',
          error: null,
        });
        return '';
      }
      this.logger.error(`Stream inference error for request ${requestId}`, err);
      throw err;
    } finally {
      this.isGenerating = false;
      this.activeStreams.delete(requestId);
    }
  }

  // ==========================================
  // HTTP Request Router & Security Controller
  // ==========================================
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const method = req.method?.toUpperCase();

    // Restrict CORS: only allow local origins, forbid wildcards
    const origin = req.headers.origin;
    if (origin) {
      if (
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('app://') ||
        origin.startsWith('file://')
      ) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${this.port}`);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-arletex-auth');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Loopback Security / Token check for API routes
      if (this.authToken && url.pathname.startsWith('/api/')) {
        const authHeader = req.headers['x-arletex-auth'];
        if (authHeader !== this.authToken) {
          this.sendJson(res, 401, { error: 'Unauthorized: missing or invalid x-arletex-auth token' });
          return;
        }
      }

      // Health endpoint (public loopback probe)
      if (url.pathname === '/health' && method === 'GET') {
        this.sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
        return;
      }

      // Telemetry endpoint
      if (url.pathname === '/api/telemetry' && method === 'GET') {
        const telemetry = this.getTelemetry();
        this.sendJson(res, 200, telemetry);
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
        const body = await this.readJsonBody(req);
        const validated = UpdateInferenceConfigInputSchema.parse(body);
        const updated = this.updateInferenceConfig(validated);
        this.sendJson(res, 200, updated);
        return;
      }

      // Cancel inference stream
      if (url.pathname === '/api/inference/cancel' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const validated = CancelInferenceInputSchema.parse(body);
        const cancelled = this.cancelInference(validated.requestId);
        this.sendJson(res, 200, { cancelled });
        return;
      }

      // Stream inference via SSE
      if (url.pathname === '/api/inference/stream' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = StartInferenceStreamInputSchema.parse(body);
        const requestId = input.requestId || crypto.randomUUID();

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });

        const abortOnDisconnect = () => {
          this.logger.info(`Client disconnected from stream ${requestId}`);
          this.cancelInference(requestId);
        };
        req.on('close', abortOnDisconnect);

        try {
          await this.runInferenceStream(
            input.conversationId,
            input.userMessageContent,
            (chunk) => {
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            },
            input.systemPromptOverride,
            requestId,
            input.imageBase64,
          );
        } finally {
          req.removeListener('close', abortOnDisconnect);
          res.end();
        }
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
        const created = this.createConversation(input.title, input.isPinned);
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
          const body = await this.readJsonBody(req);
          const input = UpdateConversationInputSchema.parse({ ...(body as any), id: convId });
          const updated = this.updateConversation(convId, input.title, input.isPinned);
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
      const convMsgMatch = url.pathname.match(/^\/api\/conversations\/([a-f0-9-]+)\/messages$/i);
      if (convMsgMatch && convMsgMatch[1] && method === 'GET') {
        const messages = this.listMessages(convMsgMatch[1]);
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

      // ==========================================
      // Memory Endpoints
      // ==========================================
      if (url.pathname === '/api/memories' && method === 'GET') {
        const type = url.searchParams.get('type') as any;
        const query = url.searchParams.get('query') || undefined;
        const limitStr = url.searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 50;
        const memories = await this.listMemories({ type, query, limit });
        this.sendJson(res, 200, memories);
        return;
      }

      if (url.pathname === '/api/memories' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = CreateMemoryInputSchema.parse(body);
        const memory = await this.createMemory(input);
        this.sendJson(res, 201, memory);
        return;
      }

      if (url.pathname === '/api/memories/query' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = QueryMemoriesInputSchema.parse(body);
        const memories = await this.listMemories(input);
        this.sendJson(res, 200, memories);
        return;
      }

      const memMatch = url.pathname.match(/^\/api\/memories\/([a-f0-9-]+)$/i);
      if (memMatch && memMatch[1]) {
        const memId = memMatch[1];
        if (method === 'GET') {
          const memory = this.getMemory(memId);
          if (!memory) {
            this.sendJson(res, 404, { error: 'Memory not found' });
            return;
          }
          this.sendJson(res, 200, memory);
          return;
        }

        if (method === 'PATCH') {
          const body = await this.readJsonBody(req);
          const input = UpdateMemoryInputSchema.parse({ ...(body as any), id: memId });
          const updated = this.updateMemory(input);
          this.sendJson(res, 200, updated);
          return;
        }

        if (method === 'DELETE') {
          const deleted = this.deleteMemory(memId);
          this.sendJson(res, 200, { success: deleted });
          return;
        }
      }

      const memMergeMatch = url.pathname.match(/^\/api\/memories\/([a-f0-9-]+)\/merge$/i);
      if (memMergeMatch && memMergeMatch[1] && method === 'POST') {
        const body = (await this.readJsonBody(req)) as { secondaryId: string };
        if (!body.secondaryId) {
          this.sendJson(res, 400, { error: 'secondaryId is required to merge' });
          return;
        }
        const merged = this.mergeMemories(memMergeMatch[1], body.secondaryId);
        this.sendJson(res, 200, merged);
        return;
      }

      // ==========================================
      // Activity Endpoints
      // ==========================================
      if (url.pathname === '/api/activities' && method === 'GET') {
        const status = url.searchParams.get('status') as any;
        const origin = url.searchParams.get('origin') as any;
        const activities = this.listActivities(status, origin);
        this.sendJson(res, 200, activities);
        return;
      }

      if (url.pathname === '/api/activities' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = CreateActivityInputSchema.parse(body);
        const activity = this.createActivity(input);
        this.sendJson(res, 201, activity);
        return;
      }

      const actMatch = url.pathname.match(/^\/api\/activities\/([a-f0-9-]+)$/i);
      if (actMatch && actMatch[1]) {
        const actId = actMatch[1];
        if (method === 'PATCH') {
          const body = await this.readJsonBody(req);
          const input = UpdateActivityInputSchema.parse({ ...(body as any), id: actId });
          const updated = this.updateActivity(input);
          this.sendJson(res, 200, updated);
          return;
        }

        if (method === 'DELETE') {
          const deleted = this.deleteActivity(actId);
          this.sendJson(res, 200, { success: deleted });
          return;
        }
      }

      // ==========================================
      // Preferences Endpoints
      // ==========================================
      if (url.pathname === '/api/preferences' && method === 'GET') {
        const prefs = this.getPreferences();
        this.sendJson(res, 200, prefs);
        return;
      }

      if (url.pathname === '/api/preferences' && method === 'POST') {
        const body = (await this.readJsonBody(req)) as { key: string; value: string };
        if (!body.key || body.value === undefined) {
          this.sendJson(res, 400, { error: 'key and value are required' });
          return;
        }
        this.setPreference(body.key, String(body.value));
        this.sendJson(res, 200, { success: true });
        return;
      }

      // ==========================================
      // Voice & Vision Specialist Endpoints
      // ==========================================
      if (url.pathname === '/api/voice/transcribe' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = TranscribeAudioInputSchema.parse(body);
        try {
          const resWhisper = await fetch('http://127.0.0.1:39282/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (resWhisper.ok) {
            const data = await resWhisper.json();
            this.sendJson(res, 200, data);
            return;
          }
        } catch {}

        this.sendJson(res, 200, {
          transcript: '',
          confidence: 0,
          status: 'unavailable',
          notice: 'Whisper specialist model is initializing or offline.',
        });
        return;
      }

      if (url.pathname === '/api/voice/synthesize' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = SynthesizeSpeechInputSchema.parse(body);
        try {
          const resKokoro = await fetch('http://127.0.0.1:39282/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          if (resKokoro.ok) {
            const data = await resKokoro.json();
            this.sendJson(res, 200, data);
            return;
          }
        } catch {}

        this.sendJson(res, 200, {
          audioBase64: null,
          status: 'unavailable',
          notice: 'Kokoro specialist model is initializing or offline.',
        });
        return;
      }

      if (url.pathname === '/api/vision/inspect' && method === 'POST') {
        const body = await this.readJsonBody(req);
        const input = VisionInspectInputSchema.parse(body);
        this.sendJson(res, 200, {
          description: input.prompt ? `Inspected image with prompt: ${input.prompt}` : 'Image attached and recorded.',
          extractedText: null,
          objects: [],
          confidence: 1.0,
        });
        return;
      }

      // ==========================================
      // APE (Artificial Psychology Engine) Endpoints
      // ==========================================
      if (url.pathname === '/api/ape/state' && method === 'GET') {
        this.sendJson(res, 200, this.apeService.getState());
        return;
      }

      if (url.pathname === '/api/ape/history' && method === 'GET') {
        this.sendJson(res, 200, this.apeService.getHistory());
        return;
      }

      if (url.pathname === '/api/ape/taxonomy' && method === 'GET') {
        this.sendJson(res, 200, {
          emotions: this.apeService.getEmotionTaxonomy(),
          moods: this.apeService.getMoodTaxonomy(),
        });
        return;
      }

      if (url.pathname === '/api/ape/events' && method === 'POST') {
        const body = (await this.readJsonBody(req)) as any;
        const result = await this.apeService.processEvent(body);
        this.sendJson(res, 200, result);
        return;
      }

      if (url.pathname === '/api/ape/relationship' && method === 'GET') {
        this.sendJson(res, 200, this.apeService.getRelationshipConfig());
        return;
      }

      if (url.pathname === '/api/ape/relationship' && (method === 'PATCH' || method === 'POST')) {
        const body = (await this.readJsonBody(req)) as any;
        try {
          const updated = this.apeService.updateRelationshipConfig(body);
          this.sendJson(res, 200, updated);
        } catch (invErr: any) {
          this.sendJson(res, 400, { error: invErr.message });
        }
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
        const status = err.name === 'ZodError' ? 400 : 500;
        this.sendJson(res, status, { error: err.message || 'Internal server error', details: err.issues });
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
      let receivedBytes = 0;

      req.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BODY_SIZE) {
          req.destroy(new Error('Payload too large'));
          reject(new Error('Payload exceeds maximum allowed size of 10MB'));
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('Malformed JSON body'));
        }
      });

      req.on('error', reject);
    });
  }
}
