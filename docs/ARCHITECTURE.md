# Arletex System Architecture (Milestone 1)

**Status:** Foundational Architecture Implemented  
**Date:** 12 November 2026  
**Target:** ASUS ROG Ally X (24GB Unified LPDDR5X, Bazzite Linux)

---

## 1. Architectural Philosophy

Arletex is designed as a **modular monolith** optimized for local execution on shared-memory hardware. It avoids premature distributed microservices while enforcing strict subsystem boundaries and single-direction dependency flows.

### Core Boundaries

1. **Arle vs. Arletex vs. APE:**
   - **Arle:** The artificial individual. Her continuous identity is defined by her persistent database records, autobiographical memories, and psychological history.
   - **Arletex:** The software container and operating platform. Changing the UI or underlying runtime does not rewrite Arle.
   - **APE:** The deterministic software subsystem that maintains structured psychological state (personality, affect, motivation, relationship, self-model). APE is NOT a system prompt.
   - **LLM as Cognitive Instrument:** Generative models are interchangeable execution tools. They assist with language generation, context appraisal, and tool calling, but do not own Arle's memory or persistent state.

---

## 2. Workspace & Module Responsibilities

The codebase is organized as a pnpm workspace:

```text
arletex/
├── packages/
│   ├── contracts/     # Single source of truth for DTOs, Zod schemas, and IPC channels
│   ├── core/          # Configuration, structured logging, typed EventBus, error classes
│   ├── database/      # SQLite connection, WAL pragmas, migration runner, repositories
│   └── inference/     # llama-server gateway, SSE streaming parser, health checks
└── apps/
    └── desktop/       # Electron desktop host, preload bridge, React 18 UI
```

### Dependency Flow

```
contracts (Zero dependencies)
    ▲
    │
core (Depends on contracts)
    ▲
    │
database (Depends on contracts, core)
    ▲
    │
inference (Depends on contracts, core)
    ▲
    │
desktop (Depends on contracts, core, database, inference)
```

No circular dependencies exist. Each package is independently typechecked and built.

---

## 3. Communication & Security Boundaries

```
┌────────────────────────────────────────────────────────┐
│                   Renderer (React 18)                 │
│  - No direct Node.js APIs (nodeIntegration: false)    │
│  - No direct filesystem access                        │
│  - No direct SQLite access                            │
│  - Strict context isolation enabled                   │
└──────────────────────────┬─────────────────────────────┘
                           │ window.arletexApi (contextBridge)
┌──────────────────────────▼─────────────────────────────┐
│                 Preload Boundary                       │
│  - Exposes typed methods over ipcRenderer              │
│  - Validates IPC messages                              │
└──────────────────────────┬─────────────────────────────┘
                           │ Electron IPC Channels
┌──────────────────────────▼─────────────────────────────┐
│             Electron Main Host Process                 │
│  - Supervises lifecycle of backend process             │
│  - Forwards requests to local backend loopback HTTP    │
│  - Streams SSE chunks to renderer via webContents.send │
└──────────────────────────┬─────────────────────────────┘
                           │ Local loopback HTTP (127.0.0.1:39281)
┌──────────────────────────▼─────────────────────────────┐
│              Node.js Backend Service                   │
│  - SQLite (WAL mode, foreign keys enabled)             │
│  - Versioned migration execution                       │
│  - LlamaServerGateway (HTTP/SSE connection)            │
│  - Audit log recorder (append-only)                    │
└──────────────────────────┬─────────────────────────────┘
                           │ Loopback HTTP (127.0.0.1:8080)
┌──────────────────────────▼─────────────────────────────┐
│               Local llama-server                       │
│  - Vulkan GPU offload on AMD RDNA 3                    │
│  - 8K context window                                   │
│  - Qwen3.5 9B Heretic Q4_K_M                           │
└────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema (Milestone 1)

Database persistence uses SQLite via `better-sqlite3` located at `~/.arletex/arletex.sqlite`.

### Core Tables

1. **`_migrations`**: Tracks executed migration versions idempotently.
2. **`conversations`**:
   - `id` (TEXT, UUID, PK)
   - `title` (TEXT)
   - `created_at` (TEXT, ISO timestamp)
   - `updated_at` (TEXT, ISO timestamp)
   - `metadata` (TEXT, JSON string)
3. **`messages`**:
   - `id` (TEXT, UUID, PK)
   - `conversation_id` (TEXT, FK -> conversations.id ON DELETE CASCADE)
   - `role` (TEXT, CHECK: system | user | assistant)
   - `content` (TEXT)
   - `token_count` (INTEGER, nullable)
   - `created_at` (TEXT, ISO timestamp)
   - `metadata` (TEXT, JSON string)
4. **`system_configs`**: Key-value configuration store.
5. **`audit_logs`**: Append-only security and operational audit trail.
6. **`model_configs`**: Registry of local model files, parameters, and active state.

---

## 5. Streaming Inference Lifecycle

1. **User input:** User submits message in React UI.
2. **IPC Trigger:** Renderer calls `window.arletexApi.startInferenceStream()`.
3. **Optimistic UI:** UI renders user message bubble immediately.
4. **Message Persistence:** Backend stores user message in SQLite and records audit event.
5. **Context Assembly:** Backend retrieves conversation history and prepends system prompt.
6. **Inference Request:** `InferenceGateway` dispatches to active provider (`ColibriAdapter` or `LlamaServerAdapter`) `POST /v1/chat/completions` with `stream: true`.
7. **SSE Parsing:** Eventsource parser decodes incoming delta tokens, including `reasoning_content` (thinking tokens) and `content`.
8. **IPC Stream:** Chunks are sent to the renderer window in real-time via `webContents.send()`.
9. **Finalization:** When `[DONE]` is received, backend stores assistant message in SQLite, updates conversation timestamp, and emits done chunk.
10. **Cancellation:** If user clicks "Stop", `AbortController.abort()` cancels the HTTP stream immediately, logs the cancellation, and marks the stream finished.

---

## 6. Process Supervision & Failure Handling

- **Provider Agnosticism:** Inference runtimes are stateless external engines. See [`docs/INFERENCE_PROVIDERS.md`](./INFERENCE_PROVIDERS.md) for configuration and provider switching.
- **Automatic Fallback:** If the primary provider (Colibri) is offline or unreachable, `InferenceGateway` automatically routes requests to `llama-server` (if fallback is enabled), tagging health results with `isFallback: true` for UI awareness.
- If all inference providers are offline, health checks report `status: "disconnected"` with network error details. The desktop app remains 100% usable (browsing history, viewing sessions, exporting data).
- If inference generation fails, non-200 HTTP statuses are caught and emitted as clean error chunks without crashing the backend or Electron main.
- When Electron quits, `will-quit` terminates the backend child process cleanly, ensuring database locks and transactions are closed without corruption.
