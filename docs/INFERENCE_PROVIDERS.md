# Inference Providers in Arletex

Arletex is designed with strict **model-runtime agnosticism**. Arle is a persistent artificial individual whose identity, psychology (APE), relationship models, and memories exist outside of any specific language model. Local inference engines are treated as stateless, replaceable cognitive execution services.

Arletex currently supports two first-class local providers via a unified, provider-independent interface:
1. **Colibri Local Engine** (Primary default)
2. **llama.cpp / Vulkan** (Alternative & automatic fallback)

---

## 1. Provider Architecture

```
                    ┌───────────────────────────────┐
                    │       Arletex Backend         │
                    └──────────────┬────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────────┐
                    │       InferenceGateway        │
                    └───────┬───────────────┬───────┘
                            │               │
                            ▼ (Primary)     ▼ (Fallback)
                  ┌────────────────┐ ┌────────────────┐
                  │ ColibriAdapter │ │  LlamaAdapter  │
                  └───────┬────────┘ └───────┬────────┘
                          │                  │
                          ▼ (OpenAI HTTP)    ▼ (OpenAI HTTP)
                  ┌────────────────┐ ┌────────────────┐
                  │ Colibri Daemon │ │  llama-server  │
                  └────────────────┘ └────────────────┘
```

Both adapters implement `IInferenceProvider` (`@arletex/contracts` and `@arletex/inference`):
- `checkHealth(): Promise<InferenceHealthResult>`
- `streamChat(options: ChatStreamOptions): Promise<string>`
- `updateConfig(newConfig: Partial<InferenceConfig>): void`
- `getConfig(): InferenceConfig`

---

## 2. Configuration Options

Inference configuration can be defined via environment variables or updated dynamically at runtime via HTTP API.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ARLETEX_INFERENCE_PROVIDER` | Active primary provider: `colibri` or `llama.cpp` | `colibri` |
| `COLIBRI_SERVER_URL` | Colibri OpenAI-compatible HTTP daemon endpoint | `http://127.0.0.1:8000` |
| `COLIBRI_MODEL_ID` | Model identifier passed to Colibri (`qwen3.6-colibri` or `qwen3-coder-30b-a3b-colibri`) | `qwen3.6-colibri` |
| `LLAMA_SERVER_URL` | llama.cpp HTTP daemon endpoint | `http://127.0.0.1:8080` |
| `LLAMA_MODEL_ID` | Model identifier passed to llama-server | `Qwen3.5-9B-Heretic-Q4_K_M` |
| `ARLETEX_INFERENCE_FALLBACK` | Enable automatic failover to alternative provider if primary is offline (`true` / `false`) | `true` |

---

## 3. Colibri Models & Launch Scripts

Arletex is equipped to operate with two local Colibri MoE models:

1. **Qwen3.6-35B-A3B** (General intelligence & conversation):
   - Path: `/home/proof/colibri-models/qwen36-heretic-i4`
   - Model ID: `qwen3.6-colibri`
   - Start with: `./scripts/start-colibri-qwen36.sh`

2. **Qwen3-Coder-30B-A3B Heretic** (Code, technical synthesis & development):
   - Path: `/home/proof/colibri-models/qwen3-coder-heretic-gguf/Qwen3-Coder-30B-A3B-IT-Heretic.i1-Q4_K_M.colibri`
   - Model ID: `qwen3-coder-30b-a3b-colibri`
   - Start with: `./scripts/start-colibri-coder.sh`

3. **Stop Colibri:**
   - Run: `./scripts/stop-colibri.sh`

---

## 4. Switching Providers and Models

### Method A: Environment Variables (Launch Time)
To run Arletex using Colibri with Qwen3.6-35B:
```bash
export ARLETEX_INFERENCE_PROVIDER=colibri
export COLIBRI_SERVER_URL=http://127.0.0.1:8000
export COLIBRI_MODEL_ID=qwen3.6-colibri
pnpm start
```

To run Arletex using Colibri with Qwen3-Coder-30B:
```bash
export ARLETEX_INFERENCE_PROVIDER=colibri
export COLIBRI_SERVER_URL=http://127.0.0.1:8000
export COLIBRI_MODEL_ID=qwen3-coder-30b-a3b-colibri
pnpm start
```

To run Arletex using llama.cpp as primary:
```bash
export ARLETEX_INFERENCE_PROVIDER=llama.cpp
export LLAMA_SERVER_URL=http://127.0.0.1:8080
pnpm start
```

### Method B: Runtime API (Without Restarting Application)
Arletex exposes a local configuration endpoint on loopback:

**Check current provider & configuration:**
```bash
curl http://127.0.0.1:39281/api/inference/config
```

**Switch active model to Qwen3-Coder-30B on Colibri:**
```bash
curl -X POST http://127.0.0.1:39281/api/inference/config \
  -H "Content-Type: application/json" \
  -d '{"provider": "colibri", "serverUrl": "http://127.0.0.1:8000", "defaultModelId": "qwen3-coder-30b-a3b-colibri"}'
```

**Switch active provider dynamically to llama.cpp fallback:**
```bash
curl -X POST http://127.0.0.1:39281/api/inference/config \
  -H "Content-Type: application/json" \
  -d '{"provider": "llama.cpp", "serverUrl": "http://127.0.0.1:8080", "defaultModelId": "Qwen3.5-9B-Heretic-Q4_K_M"}'
```

---

## 4. Fallback & Fault Tolerance

When `fallbackEnabled: true` (default):
1. Arletex probes the primary provider (Colibri).
2. If Colibri is unreachable or returns a connection error, `InferenceGateway` automatically routes chat completion requests to `llama-server`.
3. The desktop status bar marks the server online with a `(FALLBACK)` badge and displays `FAILOVER ACTIVE` so you are immediately aware that fallback execution is in progress.
4. When Colibri resumes running, health probes automatically clear the fallback state and resume routing to Colibri.

---

## 5. Testing & Verification

### Automated Integration Tests
Automated tests use an in-process mock HTTP server to simulate OpenAI-compatible endpoints without requiring any local models to be loaded:
```bash
pnpm test
```

### Testing Live Colibri Connection
When Colibri is installed and running on your device, verify connectivity using the standalone probe script:
```bash
./scripts/test-colibri-connection.sh [OPTIONAL_URL] [OPTIONAL_MODEL_ID]
# Example:
./scripts/test-colibri-connection.sh http://127.0.0.1:8080 colibri-default
```
