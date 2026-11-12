# Architectural Decision Records (ADRs) — Arletex

---

## ADR-001: Hard Distinction Between Arle, Arletex, and Language Models

- **Status:** Accepted
- **Context:** AI companions often collapse prompt, personality, application, and model into a single monolith. When the underlying model is upgraded or replaced, the character's memory, personality, and relationship continuity are lost.
- **Decision:**
  - **Arle** is the artificial individual, defined exclusively by her persistent state, autobiographical memories, and psychological history in SQLite.
  - **Arletex** is the desktop operating platform.
  - **APE (Artificial Psychology Engine)** is a deterministic software subsystem.
  - Language models are replaceable cognitive instruments.
- **Consequences:** Upgrading or swapping models (e.g. from Qwen3.5 9B to Gemma 4 12B) does not destroy Arle's identity or memories.

---

## ADR-002: Process Architecture: Electron Shell with Dedicated Node.js Backend Service

- **Status:** Accepted
- **Context:** The development host runs Bazzite Linux with Node.js 26.13.1 and GCC 16.2.1. Electron 34 ships with Node.js 20.19.1. Compiling native C++ extensions like `better-sqlite3` directly into Electron's embedded Node runtime leads to ABI incompatibilities and crashes when compiled against cutting-edge system headers.
- **Decision:**
  - The Electron main process acts as window host and process supervisor.
  - The backend runs as a native Node.js process using the host's Node.js runtime, communicating over loopback IPC/HTTP.
  - The renderer communicates strictly via Electron IPC through `contextBridge`.
- **Consequences:**
  - `better-sqlite3` runs natively at maximum speed with 0 ABI rebuild issues.
  - The backend can be tested headless via Vitest without needing a display server or Electron mock.
  - Strict security boundary: renderer has 0 Node integration and no direct filesystem access.

---

## ADR-003: SQLite with Write-Ahead Logging (WAL) as Initial Storage

- **Status:** Accepted
- **Context:** Needs persistent, zero-maintenance, single-file local storage capable of concurrent reads and fast transaction commits on the ROG Ally X NVMe drive.
- **Decision:**
  - Use SQLite via `better-sqlite3`.
  - Enforce `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON`, `PRAGMA synchronous = NORMAL`, and `PRAGMA busy_timeout = 5000`.
  - Use versioned, idempotent migrations tracked in `_migrations`.
- **Consequences:**
  - Sub-millisecond read/write latencies.
  - Database survives application crashes and restarts without corruption.
  - Zero external database daemon dependencies.

---

## ADR-004: Native HTTP/SSE Gateway for Local Inference

- **Status:** Accepted
- **Context:** The project requires local inference via `llama-server` (Vulkan backend) rather than proprietary cloud APIs or Ollama abstraction layers.
- **Decision:**
  - Implement `LlamaServerGateway` directly connecting to `llama-server`'s OpenAI-compatible HTTP endpoints (`/v1/chat/completions`, `/health`, `/v1/models`).
  - Use `eventsource-parser` to stream tokens in real-time.
  - Use `AbortController` to provide immediate user-initiated generation cancellation.
- **Consequences:**
  - Minimal latency overhead.
  - Independent health checking allows the application to function cleanly when the model server is offline.

---

## ADR-005: Support for Reasoning Tokens (`reasoning_content`)

- **Status:** Accepted
- **Context:** Testing against the installed `Qwen3.5-9B-Heretic-Q4_K_M.gguf` revealed that community uncensored thinking models emit `reasoning_content` deltas during their internal deliberation phase before emitting `content`.
- **Decision:**
  - Extend `StreamChunk` contract and parser to capture both `reasoning_content` and `content`.
  - Ensure token limits are budgeted to accommodate internal thinking processes.
- **Consequences:**
  - Thinking models function transparently without dropping tokens or outputting empty responses.
  - Prepares the groundwork for exposing internal cognition in future APE development.
