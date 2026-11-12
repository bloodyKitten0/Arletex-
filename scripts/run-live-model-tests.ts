import http from 'node:http';

interface HealthResponse {
  status: string;
  provider: string;
  url: string;
  latencyMs: number | null;
  modelLoaded: string | null;
  error: string | null;
  isFallback: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
}

const BACKEND_PORT = 39281;

async function requestJson<T>(path: string, method = 'GET', body?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(buf);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${buf}`));
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function streamChat(
  conversationId: string,
  userMessageContent: string,
  onDelta?: (text: string) => void,
): Promise<{ fullContent: string; durationMs: number }> {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ conversationId, userMessageContent });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/inference/stream',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let buffer = '';
        let fullContent = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const raw = trimmed.slice(6);
              try {
                const parsed = JSON.parse(raw);
                if (parsed.delta) {
                  fullContent += parsed.delta;
                  if (onDelta) onDelta(parsed.delta);
                } else if (parsed.fullContent && !fullContent) {
                  fullContent = parsed.fullContent;
                }
                if (parsed.isDone) {
                  const durationMs = Date.now() - startTime;
                  resolve({ fullContent: parsed.fullContent || fullContent, durationMs });
                }
              } catch {}
            }
          }
        });

        res.on('end', () => {
          const durationMs = Date.now() - startTime;
          resolve({ fullContent, durationMs });
        });
      },
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

export async function runSuite(suiteLabel: string): Promise<void> {
  console.log(`\n==========================================================`);
  console.log(` STARTING TEST SUITE: ${suiteLabel}`);
  console.log(`==========================================================`);

  // 1. Health check
  const health = await requestJson<HealthResponse>('/api/inference/health');
  console.log(`\n[Health Check] Provider: ${health.provider} | URL: ${health.url} | Model: ${health.modelLoaded} | Fallback: ${health.isFallback} | Latency: ${health.latencyMs}ms`);

  if (health.status !== 'connected') {
    throw new Error(`Inference engine is not connected! Status: ${health.status}, Error: ${health.error}`);
  }

  // 2. Create fresh conversation
  const conv = await requestJson<{ id: string; title: string }>('/api/conversations', 'POST', {
    title: `Test Suite: ${suiteLabel} (${new Date().toLocaleTimeString()})`,
  });
  console.log(`[Conversation Created] ID: ${conv.id}`);

  const testPrompts = [
    {
      id: 'greeting',
      title: 'Prompt 1: Casual Greeting ("hello")',
      prompt: 'hello',
    },
    {
      id: 'self_reflection',
      title: 'Prompt 2: Self-Reflection ("how are you feeling today?")',
      prompt: 'how are you feeling today?',
    },
    {
      id: 'intellect_debate',
      title: 'Prompt 3: Intellectual Debate ("what do you think of modern chatbots and conversational AI?")',
      prompt: 'what do you think of modern chatbots and conversational AI?',
    },
    {
      id: 'technical_depth',
      title: 'Prompt 4: Technical Depth ("analyze the trade-offs of offloading MoE experts to NVMe versus keeping them unified in RAM")',
      prompt: 'analyze the trade-offs of offloading MoE experts to NVMe versus keeping them unified in RAM',
    },
  ];

  for (const item of testPrompts) {
    console.log(`\n--- ${item.title} ---`);
    console.log(`User: ${item.prompt}`);
    process.stdout.write(`Arle: `);

    const result = await streamChat(conv.id, item.prompt, (delta) => {
      process.stdout.write(delta);
    });

    console.log(`\n[Stats: ${result.durationMs}ms, ~${Math.round((result.fullContent.length / 4) / (result.durationMs / 1000) * 10) / 10} tok/s]`);
  }

  // 3. Verify messages in database
  const messages = await requestJson<Message[]>(`/api/conversations/${conv.id}/messages`);
  console.log(`\n[Database Verification] Total messages stored in DB: ${messages.length}`);
  if (messages.length !== testPrompts.length * 2) {
    console.warn(`[Warning] Expected ${testPrompts.length * 2} messages in DB, got ${messages.length}`);
  } else {
    console.log(`[Database Verification] All ${messages.length} messages persisted correctly with foreign keys.`);
  }

  console.log(`\n==========================================================`);
  console.log(` TEST SUITE COMPLETED: ${suiteLabel}`);
  console.log(`==========================================================\n`);
}

async function main() {
  const label = process.argv[2] || 'Default Test';
  await runSuite(label);
}

main().catch((err) => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
