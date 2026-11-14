import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fork, ChildProcess, execSync } from 'node:child_process';
import {
  IPC_CHANNELS,
  IPCResponse,
  StartInferenceStreamInput,
  StreamChunk,
} from '@arletex/contracts';
import { rootLogger } from '@arletex/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = rootLogger.child('ElectronMain');

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = 39281;
let backendAuthToken = '';

function findSystemNode(): string {
  if (process.env['NODE_BINARY'] && fs.existsSync(process.env['NODE_BINARY'])) {
    return process.env['NODE_BINARY'];
  }
  const candidates = [
    '/home/linuxbrew/.linuxbrew/bin/node',
    '/usr/bin/node',
    '/usr/local/bin/node',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const whichNode = execSync('which node', { encoding: 'utf-8' }).trim();
    if (whichNode && fs.existsSync(whichNode)) return whichNode;
  } catch {}
  return 'node';
}

function getBackendScriptPath(): string {
  return path.join(__dirname, '../backend/index.js');
}

async function startBackendService(): Promise<number> {
  return new Promise((resolve, reject) => {
    const backendScript = getBackendScriptPath();
    const nodeBinary = findSystemNode();
    logger.info(`Starting backend service: ${backendScript} using node: ${nodeBinary}`);

    backendAuthToken = crypto.randomBytes(32).toString('hex');
    let hasResolved = false;

    backendProcess = fork(backendScript, [], {
      execPath: nodeBinary,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        ARLETEX_PORT: '39281',
        ARLETEX_AUTH_TOKEN: backendAuthToken,
      },
    });

    backendProcess.stdout?.on('data', (data) => {
      logger.info(`[Backend stdout] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      logger.error(`[Backend stderr] ${data.toString().trim()}`);
    });

    backendProcess.on('message', async (msg: any) => {
      if (msg && msg.type === 'ready') {
        backendPort = msg.port;
        logger.info(`Backend reported ready on port ${backendPort}. Verifying health...`);
        try {
          const res = await fetch(`http://127.0.0.1:${backendPort}/health`);
          if (res.ok) {
            hasResolved = true;
            logger.info(`Backend service verified healthy on 127.0.0.1:${backendPort}`);
            resolve(backendPort);
          } else {
            throw new Error(`Health check returned status ${res.status}`);
          }
        } catch (healthErr: any) {
          logger.error('Backend health check failed', healthErr);
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(`Backend health check failed: ${healthErr.message}`));
          }
        }
      }
    });

    backendProcess.on('error', (err) => {
      logger.error('Failed to spawn backend process', err);
      if (!hasResolved) {
        hasResolved = true;
        reject(err);
      }
    });

    backendProcess.on('exit', (code, signal) => {
      logger.warn(`Backend process exited with code ${code}, signal ${signal}`);
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error(`Backend exited unexpectedly with code ${code}`));
      }
    });

    // Timeout safety
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error('Backend process timed out waiting for readiness signal'));
      }
    }, 10000);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0f1115',
    title: 'Arletex',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error(`[Preload Error] in ${preloadPath}:`, error);
  });

  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    logger.info(`[Renderer Console] ${message}`);
  });

  const isDev = process.env['NODE_ENV'] === 'development' || !app.isPackaged;
  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  const callBackend = async <T>(
    endpoint: string,
    method = 'GET',
    body?: unknown,
  ): Promise<IPCResponse<T>> => {
    try {
      const res = await fetch(`http://127.0.0.1:${backendPort}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-arletex-auth': backendAuthToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: errText || res.statusText, code: `HTTP_${res.status}` };
      }

      const data = (await res.json()) as T;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Backend connection failed' };
    }
  };

  // Conversations
  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_LIST, async () => {
    return callBackend('/api/conversations');
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_CREATE, async (_, title?: string, isPinned = false) => {
    return callBackend('/api/conversations', 'POST', { title: title || 'New Conversation', isPinned });
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_GET, async (_, id: string) => {
    return callBackend(`/api/conversations/${id}`);
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_UPDATE, async (_, id: string, title?: string, isPinned?: boolean) => {
    return callBackend(`/api/conversations/${id}`, 'PATCH', { title, isPinned });
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_DELETE, async (_, id: string) => {
    return callBackend(`/api/conversations/${id}`, 'DELETE');
  });

  // Messages
  ipcMain.handle(IPC_CHANNELS.MESSAGES_LIST, async (_, conversationId: string) => {
    return callBackend(`/api/conversations/${conversationId}/messages`);
  });

  // Inference Health & Config
  ipcMain.handle(IPC_CHANNELS.INFERENCE_HEALTH, async () => {
    return callBackend('/api/inference/health');
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE, async (_, config) => {
    return callBackend('/api/inference/config', 'POST', config);
  });

  // Stream Cancellation
  ipcMain.handle(IPC_CHANNELS.INFERENCE_STREAM_CANCEL, async (_, requestId: string) => {
    return callBackend('/api/inference/cancel', 'POST', { requestId });
  });

  // Stream Inference Start
  ipcMain.handle(
    IPC_CHANNELS.INFERENCE_STREAM_START,
    async (event, input: StartInferenceStreamInput) => {
      const streamTask = async () => {
        try {
          const reqBody = JSON.stringify(input);
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: backendPort,
              path: '/api/inference/stream',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                'x-arletex-auth': backendAuthToken,
                'Content-Length': Buffer.byteLength(reqBody),
              },
            },
            (res) => {
              if (res.statusCode && res.statusCode >= 400) {
                let errText = '';
                res.on('data', (d) => (errText += d.toString()));
                res.on('end', () => {
                  if (!event.sender.isDestroyed()) {
                    event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, {
                      requestId: input.requestId || crypto.randomUUID(),
                      conversationId: input.conversationId,
                      delta: '',
                      fullContent: '',
                      isDone: true,
                      finishReason: 'error',
                      error: `Inference failed: ${errText || res.statusMessage}`,
                    } as StreamChunk);
                  }
                });
                return;
              }

              let buffer = '';
              res.on('data', (chunkBuffer: Buffer) => {
                buffer += chunkBuffer.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const chunk: StreamChunk = JSON.parse(jsonStr);
                      if (!event.sender.isDestroyed()) {
                        event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, chunk);
                      }
                    } catch {}
                  }
                }
              });

              res.on('end', () => {
                if (buffer.trim().startsWith('data: ')) {
                  try {
                    const chunk: StreamChunk = JSON.parse(buffer.trim().slice(6));
                    if (!event.sender.isDestroyed()) {
                      event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, chunk);
                    }
                  } catch {}
                }
              });

              res.on('error', (err) => {
                logger.error('SSE response error', err);
                if (!event.sender.isDestroyed()) {
                  event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, {
                    requestId: input.requestId || crypto.randomUUID(),
                    conversationId: input.conversationId,
                    delta: '',
                    fullContent: '',
                    isDone: true,
                    finishReason: 'error',
                    error: err.message,
                  } as StreamChunk);
                }
              });
            },
          );

          req.on('error', (err) => {
            logger.error('Error connecting to backend inference stream', err);
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, {
                requestId: input.requestId || crypto.randomUUID(),
                conversationId: input.conversationId,
                delta: '',
                fullContent: '',
                isDone: true,
                finishReason: 'error',
                error: err.message,
              } as StreamChunk);
            }
          });

          req.write(reqBody);
          req.end();
        } catch (err: any) {
          logger.error('Error initiating stream task', err);
        }
      };

      streamTask().catch((e) => logger.error('Unhandled stream task error', e));
      return { success: true, data: null };
    },
  );

  // Memory Handlers
  ipcMain.handle(IPC_CHANNELS.MEMORIES_LIST, async (_, options) => {
    return callBackend('/api/memories/query', 'POST', options || {});
  });

  ipcMain.handle(IPC_CHANNELS.MEMORIES_CREATE, async (_, input) => {
    return callBackend('/api/memories', 'POST', input);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORIES_GET, async (_, id: string) => {
    return callBackend(`/api/memories/${id}`);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORIES_UPDATE, async (_, input) => {
    return callBackend(`/api/memories/${input.id}`, 'PATCH', input);
  });

  ipcMain.handle(IPC_CHANNELS.MEMORIES_DELETE, async (_, id: string) => {
    return callBackend(`/api/memories/${id}`, 'DELETE');
  });

  ipcMain.handle(IPC_CHANNELS.MEMORIES_QUERY, async (_, input) => {
    if (input.primaryId && input.secondaryId) {
      return callBackend(`/api/memories/${input.primaryId}/merge`, 'POST', { secondaryId: input.secondaryId });
    }
    return callBackend('/api/memories/query', 'POST', input);
  });

  // Activities Handlers
  ipcMain.handle(IPC_CHANNELS.ACTIVITIES_LIST, async (_, status, origin) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (origin) params.set('origin', origin);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return callBackend(`/api/activities${qs}`);
  });

  ipcMain.handle(IPC_CHANNELS.ACTIVITIES_CREATE, async (_, input) => {
    return callBackend('/api/activities', 'POST', input);
  });

  ipcMain.handle(IPC_CHANNELS.ACTIVITIES_UPDATE, async (_, input) => {
    return callBackend(`/api/activities/${input.id}`, 'PATCH', input);
  });

  ipcMain.handle(IPC_CHANNELS.ACTIVITIES_DELETE, async (_, id: string) => {
    return callBackend(`/api/activities/${id}`, 'DELETE');
  });

  // Telemetry & Preferences
  ipcMain.handle(IPC_CHANNELS.TELEMETRY_GET, async () => {
    return callBackend('/api/telemetry');
  });

  ipcMain.handle(IPC_CHANNELS.PREFERENCES_GET, async () => {
    return callBackend('/api/preferences');
  });

  ipcMain.handle(IPC_CHANNELS.PREFERENCES_SET, async (_, key: string, value: string) => {
    return callBackend('/api/preferences', 'POST', { key, value });
  });

  // Voice & Vision
  ipcMain.handle(IPC_CHANNELS.VOICE_TRANSCRIBE, async (_, input) => {
    return callBackend('/api/voice/transcribe', 'POST', input);
  });

  ipcMain.handle(IPC_CHANNELS.VOICE_SYNTHESIZE, async (_, input) => {
    return callBackend('/api/voice/synthesize', 'POST', input);
  });

  ipcMain.handle(IPC_CHANNELS.VISION_INSPECT, async (_, input) => {
    return callBackend('/api/vision/inspect', 'POST', input);
  });
}

app.whenReady().then(async () => {
  logger.info('Electron app ready. Starting Arletex...');
  await startBackendService();
  registerIpcHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  logger.info('Application quitting. Terminating backend service...');
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
});
