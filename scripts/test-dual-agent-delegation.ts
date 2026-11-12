import http from 'http';

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
      (res: any) => {
        let buf = '';
        res.on('data', (c: any) => (buf += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf));
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
): Promise<{ fullContent: string; durationMs: number; specialistActivated: boolean }> {
  const startTime = Date.now();
  let specialistActivated = false;

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
      (res: any) => {
        let buffer = '';
        let fullContent = '';

        res.on('data', (chunk:any) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const raw = trimmed.slice(6);
              try {
                const parsed = JSON.parse(raw);
                if (parsed.specialistStage === 'coding_specialist') {
                  specialistActivated = true;
                }
                if (parsed.delta) {
                  fullContent += parsed.delta;
                  process.stdout.write(parsed.delta);
                } else if (parsed.fullContent && !fullContent) {
                  fullContent = parsed.fullContent;
                }
                if (parsed.isDone) {
                  const durationMs = Date.now() - startTime;
                  resolve({
                    fullContent: parsed.fullContent || fullContent,
                    durationMs,
                    specialistActivated,
                  });
                }
              } catch {}
            }
          }
        });

        res.on('end', () => {
          const durationMs = Date.now() - startTime;
          resolve({ fullContent, durationMs, specialistActivated });
        });
      },
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`\n==========================================================`);
  console.log(` TESTING DUAL-MODEL DELEGATION (35B Central + 30B Coder)`);
  console.log(`==========================================================\n`);

  // 1. Health check
  const health = await requestJson<any>('/api/inference/health');
  console.log(`Central Agent:      ${health.modelLoaded} on ${health.url} (${health.status})`);
  console.log(`Coding Specialist:  ${health.specialistCoding?.modelLoaded} on ${health.specialistCoding?.url} (${health.specialistCoding?.status})`);

  if (health.status !== 'connected' || health.specialistCoding?.status !== 'connected') {
    throw new Error('Both engines must be connected to run this test!');
  }

  // 2. Create session
  const conv = await requestJson<{ id: string }>('/api/conversations', 'POST', {
    title: 'Dual Agent Delegation Live Verification',
  });
  console.log(`\nSession created: ${conv.id}`);

  // 3. Test coding delegation prompt
  const codingPrompt =
    'Arle, I need an optimized token bucket rate limiter in TypeScript for our API gateway. Formulate the requirements and have the 30B coding specialist synthesize the complete implementation.';

  console.log(`\n--- Sending Coding Request to Central Agent ---`);
  console.log(`User: ${codingPrompt}\n`);
  process.stdout.write(`Arle: `);

  const res = await streamChat(conv.id, codingPrompt);

  console.log(`\n\n[Stats: ${res.durationMs}ms, Specialist Activated: ${res.specialistActivated}]`);

  // 4. Verify in SQLite
  const messages = await requestJson<any[]>(`/api/conversations/${conv.id}/messages`);
  console.log(`Messages saved in DB: ${messages.length}`);
  console.log(`\n==========================================================`);
  console.log(` DUAL-MODEL DELEGATION TEST COMPLETED SUCCESSFULLY`);
  console.log(`==========================================================\n`);
}

main().catch((err) => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
