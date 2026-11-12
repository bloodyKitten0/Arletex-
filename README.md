# Arletex

**Local-first desktop environment and host infrastructure for Arle, a persistent artificial individual.**

---

## 1. Foundational Concept & Distinctions

Arletex is built around three distinct architectural concepts:

- **Arle:** The persistent artificial individual. She is not a generic chatbot, a virtual assistant, or a character prompt. Her identity, evolving personality, autobiographical memories, emotional dynamics, and values exist independently of any individual generative model.
- **Arletex:** The desktop application, local runtime, and host infrastructure through which Arle operates. It provides the UI, local model inference, database persistence, IPC boundaries, and security enforcement.
- **APE (Artificial Psychology Engine):** The deterministic software subsystem within Arletex responsible for maintaining Arle's psychological processes (personality, affect, motivation, relationship history, and developmental continuity).

Models are replaceable cognitive instruments; Arle herself is the persistent individual maintained by the software architecture and memories.

---

## 2. Current Milestone 1 Capabilities

- **Desktop Host:** Electron 34 desktop shell running on Bazzite Linux (ROG Ally X optimized) with strict context isolation, secure preload boundary, and disabled renderer Node integration.
- **Frontend Interface:** Clean, dark, restrained React 18 interface with conversation list, real-time response streaming, generation cancellation, and live model health indicator.
- **Engineered Backend:** Modular Node.js service managing SQLite database, migrations, audit logging, and inference orchestration.
- **Persistent Storage:** SQLite persistence via `better-sqlite3` with Write-Ahead Logging (WAL), foreign key cascade enforcement, and versioned migrations.
- **Local Inference Gateway:** Native integration with local `llama-server` over HTTP/SSE with real-time token streaming, thinking token (`reasoning_content`) support, and `AbortController` cancellation.
- **Robust Automated Tests:** 20 comprehensive unit and integration tests passing in ~400ms across contracts, core, database, inference, and backend lifecycle.

---

## 3. Architecture Overview

```text
/Arletex
├── apps/
│   └── desktop/                     # Electron desktop application & host process
│       ├── src/
│       │   ├── backend/             # Standalone Node.js service (DB, Inference, Audit)
│       │   │   ├── index.ts         # Service process entry point
│       │   │   └── server.ts        # Native HTTP + SSE server & orchestration logic
│       │   ├── main/
│       │   │   └── index.ts         # Electron main (process supervisor, secure IPC)
│       │   ├── preload/
│       │   │   └── index.ts         # contextBridge boundary (window.arletexApi)
│       │   └── renderer/            # React 18 frontend (Vite-bundled)
│       │       ├── index.html       # Single-page app root
│       │       └── src/
│       │           ├── App.tsx      # Main application state & stream coordinator
│       │           ├── main.tsx     # React DOM root
│       │           ├── components/
│       │           │   ├── ChatView.tsx     # Message bubbles, stream text, error banner
│       │           │   ├── MessageInput.tsx # Multi-line input, Send & Stop buttons
│       │           │   ├── Sidebar.tsx      # Session list, New Session, delete, device tag
│       │           │   └── StatusBar.tsx    # Live model connection pill, latency, refresh
│       │           └── styles/
│       │               └── index.css        # Clean, dark, restrained design system
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   ├── contracts/                   # Shared DTOs, Zod schemas, IPC channel constants
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── core/                        # Config loader, Structured Logger, EventBus, Errors
│   │   ├── src/
│   │   │   ├── config.ts
│   │   │   ├── errors.ts
│   │   │   ├── events.ts
│   │   │   ├── logger.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/                    # SQLite connection, WAL mode, migrations, repos
│   │   ├── src/
│   │   │   ├── connection.ts        # better-sqlite3 manager with WAL & busy timeout
│   │   │   ├── migrationRunner.ts   # Versioned idempotent migration engine
│   │   │   ├── migrations/index.ts  # Migration 001 (conversations, messages, audit, config)
│   │   │   ├── repositories/
│   │   │   │   ├── auditRepository.ts
│   │   │   │   ├── conversationRepository.ts
│   │   │   │   └── messageRepository.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── inference/                   # Local llama-server client
│       ├── src/
│       │   ├── llamaGateway.ts      # Health checking, SSE parser, reasoning tokens, cancel
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   └── start-llama-server.sh       # Script to launch llama-server with Vulkan on Ally X
│
├── tests/
│   └── backend.integration.test.ts  # End-to-end HTTP/SSE backend integration suite
│
├── docs/
│   ├── ARCHITECTURE.md              # Detailed subsystem architecture & process boundaries
│   ├── DECISIONS.md                 # Architectural decision records (ADRs 001–005)
│   └── ROADMAP.md                   # Detailed path for Phases 1–5
│
├── .gitignore                       # Git ignore for node_modules, build artifacts, sqlite files
├── ARLE_Foundational_Specification_v1.1.md
├── package.json                     # Workspace root manifest
├── pnpm-workspace.yaml              # pnpm workspace definition
├── tsconfig.base.json               # Root TypeScript configuration (strict mode)
├── vitest.config.ts                 # Vitest test runner configuration
└── README.md                        # Quickstart, setup, and usage documentation
```

### Process Architecture

```
[ Electron Main Process ]
         │ (IPC via contextBridge)
         ▼
[ React Renderer UI ]
         ▲
         │ (Strict Typed IPC / WebContents SSE)
[ Electron Main Process ]
         │ (Supervises via ChildProcess fork)
         ▼
[ Node.js Backend Service ] ───► [ SQLite Database (~/.arletex/arletex.sqlite) ]
         │
         ▼ (HTTP / SSE on 127.0.0.1:8080)
[ llama-server (Vulkan) ] ─────► [ Qwen3.5 9B Heretic Q4_K_M.gguf ]
```

---

## 4. Hardware & System Requirements

- **Primary Target:** ASUS ROG Ally X (2024), AMD Ryzen Z1 Extreme, 24 GB shared LPDDR5X RAM, AMD RDNA 3 graphics.
- **Operating System:** Bazzite Linux / Linux x86_64.
- **Runtimes:**
  - Node.js >= 22 (tested on v26.13.1)
  - pnpm >= 10 (tested on v12.18.0)
  - `llama-server` with Vulkan support
- **Model Files:**
  - `Qwen3.5-9B-Heretic-Q4_K_M.gguf` (stored at `/home/proof/models/qwen-heretic/`)

---

## 5. Installation & Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build All Packages and Desktop App

```bash
pnpm build
```

### 3. Run Automated Tests

```bash
pnpm test
```

### 4. Typecheck the Workspace

```bash
pnpm typecheck
```

---

## 6. How to Run

### Step 1: Launch Local Inference (`llama-server`)

In a terminal, launch the local inference runtime using the provided script:

```bash
./scripts/start-llama-server.sh
```

By default, this binds to `127.0.0.1:8080` with an 8K context (`-c 8192`), 8 CPU threads (`-t 8`), and Vulkan GPU offload (`-ngl 99`).

### Step 2: Start the Desktop Application

In another terminal, start the Electron application:

```bash
pnpm start
```

Or for development with Vite hot reload:

```bash
pnpm dev
```

---

## 7. Configuration

Configuration options can be customized via environment variables:

| Variable | Description | Default |
|---|---|---|
| `ARLETEX_DATA_DIR` | Directory for database and local storage | `~/.arletex` |
| `LLAMA_SERVER_URL` | Local inference endpoint | `http://127.0.0.1:8080` |
| `LLAMA_MODEL_ID` | Active model identifier | `Qwen3.5-9B-Heretic-Q4_K_M` |
| `ARLETEX_LOG_LEVEL` | Console log verbosity (`debug`, `info`, `warn`, `error`) | `info` |
| `ARLETEX_PORT` | Internal backend service port | `39281` |


**Note: files in drafts folder are the core of building**