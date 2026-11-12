import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
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

const logger = rootLogger.child('MainProcess');

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = 39281;

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
  // In development/production, points to dist/backend/index.js
  return path.join(__dirname, '../backend/index.js');
}

async function startBackendService(): Promise<number> {
  return new Promise((resolve, reject) => {
    const backendScript = getBackendScriptPath();
    const nodeBinary = findSystemNode();
    logger.info(`Starting backend service: ${backendScript} using node: ${nodeBinary}`);

    backendProcess = fork(backendScript, [], {
      execPath: nodeBinary,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, ARLETEX_PORT: '39281' },
    });

    backendProcess.stdout?.on('data', (data) => {
      logger.info(`[Backend stdout] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      logger.error(`[Backend stderr] ${data.toString().trim()}`);
    });

    backendProcess.on('message', (msg: any) => {
      if (msg && msg.type === 'ready') {
        backendPort = msg.port;
        logger.info(`Backend service ready on port ${backendPort}`);
        resolve(backendPort);
      }
    });

    backendProcess.on('error', (err) => {
      logger.error('Failed to spawn backend process', err);
      reject(err);
    });

    backendProcess.on('exit', (code, signal) => {
      logger.warn(`Backend process exited with code ${code}, signal ${signal}`);
    });

    // Timeout safety
    setTimeout(() => {
      resolve(backendPort);
    }, 4000);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 600,
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
  // Helper for calling local backend HTTP endpoints
  const callBackend = async <T>(
    endpoint: string,
    method = 'GET',
    body?: unknown,
  ): Promise<IPCResponse<T>> => {
    try {
      const res = await fetch(`http://127.0.0.1:${backendPort}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
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

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_CREATE, async (_, title?: string) => {
    return callBackend('/api/conversations', 'POST', { title: title || 'New Conversation' });
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_GET, async (_, id: string) => {
    return callBackend(`/api/conversations/${id}`);
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_UPDATE, async (_, id: string, title?: string) => {
    return callBackend(`/api/conversations/${id}`, 'PATCH', { title });
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATIONS_DELETE, async (_, id: string) => {
    return callBackend(`/api/conversations/${id}`, 'DELETE');
  });

  // Messages
  ipcMain.handle(IPC_CHANNELS.MESSAGES_LIST, async (_, conversationId: string) => {
    return callBackend(`/api/conversations/${conversationId}/messages`);
  });

  // Inference Health
  ipcMain.handle(IPC_CHANNELS.INFERENCE_HEALTH, async () => {
    return callBackend('/api/inference/health');
  });

  // Inference Configuration Update
  ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE, async (_, config) => {
    return callBackend('/api/inference/config', 'POST', config);
  });

  // Cancel Stream
  ipcMain.handle(IPC_CHANNELS.INFERENCE_STREAM_CANCEL, async (_, requestId: string) => {
    return callBackend('/api/inference/cancel', 'POST', { requestId });
  });

  // Stream Inference Start
  // IMPORTANT: Do NOT await the full stream read inside the handler.
  // ipcMain.handle serializes concurrent calls to the same channel, so
  // awaiting a multi-minute stream would block all subsequent messages.
  // Instead, kick off the stream in the background and return immediately.
  ipcMain.handle(
    IPC_CHANNELS.INFERENCE_STREAM_START,
    async (event, input: StartInferenceStreamInput) => {
      // Launch the stream reader as a detached async task using native http.request
      // to avoid undici 300s BodyTimeoutError during long CPU MoE generations
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
                      requestId: crypto.randomUUID(),
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
              res.setEncoding('utf8');
              res.on('data', (chunkStr: string) => {
                buffer += chunkStr;
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.slice(6);
                    try {
                      const chunk = JSON.parse(jsonStr) as StreamChunk;
                      if (!event.sender.isDestroyed()) {
                        event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, chunk);
                      }
                    } catch (e) {
                      logger.warn('Failed to parse SSE line from backend', e);
                    }
                  }
                }
              });

              res.on('error', (err) => {
                logger.error('Backend response stream error', err);
                if (!event.sender.isDestroyed()) {
                  event.sender.send(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, {
                    requestId: crypto.randomUUID(),
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
                requestId: crypto.randomUUID(),
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

      // Fire-and-forget: don't await
      streamTask().catch((e) => logger.error('Unhandled stream task error', e));

      // Return immediately so the IPC channel is free for subsequent calls
      return { success: true, data: null };
    },
  );
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
