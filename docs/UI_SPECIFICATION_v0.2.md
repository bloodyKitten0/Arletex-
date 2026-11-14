# Arletex UI Specification v0.2

**Authoritative Specification for Arle's Operating Environment**  
*Document Version: 0.2.0*  
*Target Hardware: ASUS ROG Ally X (AMD Ryzen Z1 Extreme, Radeon 780M, 24GB Unified Memory, Linux/Bazzite)*

---

## 1. Design Philosophy

Arletex is not a chatbot wrapper or a conventional conversational toy. It is:
1. **Arle's Personal Operating Environment:** Her digital locus where she maintains persistent identity, autobiographical memory, affective state, and autonomous pursuits.
2. **A Technical Control Center:** An honest, disciplined cockpit for inspecting her environment, activities, hardware performance, and operational boundaries.

### The Anti-Fabrication Mandate
The interface must reflect **authentic system state at all times**:
- **Never fabricate activity, thoughts, telemetry, progress, or capabilities** merely to make the application appear busy.
- If a hardware sensor cannot be read on Linux/sysfs, display `Unavailable`.
- If a psychological subsystem (such as APE) is awaiting initialization, display its genuine developmental status rather than rendering arbitrary meters or oscillating progress bars.
- When no background activity is active, indicate that no background task is recorded.

---

## 2. Global Layout & Visual Foundation

The desktop layout is composed of three primary columns:
1. **Left Navigation Sidebar (64px collapsed / 180px expanded):**
   - Quick navigation between the six primary sections.
   - Pinned indicator for current section.
2. **Central Workspace (Flexible):**
   - Renders the active primary section.
   - For `Main`, houses the presence header, conversation stream, and rich composer.
   - Supports **Full-Screen Conversation Mode** when focused exclusively on dialog.
3. **Right Technical Telemetry Rail (260px fixed / collapsible):**
   - Live hardware, memory, power, and inference performance.
   - Exclusively technical data; psychological state belongs in `Emo`, never here.

### Visual Styling
- **Foundation:** Dark graphite (`#0b0d11`, `#11141c`, `#181c26`).
- **Borders & Dividers:** Subtle steel (`rgba(255, 255, 255, 0.08)`).
- **Accents:** Restrained violet (`#8b5cf6`, `#a78bfa`) and electric blue (`#3b82f6`, `#60a5fa`).
- **Typography:** Mature, clean sans-serif for UI (`Inter`, `system-ui`) paired with monospaced numbers for metrics (`JetBrains Mono`, `ui-monospace`).
- **Information Density:** Compact, high-utility density optimized for the 7-inch 1080p ROG Ally X display.

---

## 3. The Six Primary Sections

```
+------------------------------------------------------------------------------------+
|  [Sidebar]  |  [Central Workspace]                                |  [Telemetry]   |
|             |                                                     |                |
|  1. Main    |  Presence & Immediate Focus                         |  CPU / APU     |
|  2. Memory  |  Conversation Stream (Full-Screen Toggleable)       |  Unified RAM   |
|  3. Emo     |  Composer (+) (Mic) [Voice Switch] [Send]           |  Radeon 780M   |
|  4. History |                                                     |  Inference     |
|  5. Acts    |                                                     |  TTFT / TPS    |
|  6. Env     |                                                     |  Storage / Bat |
+------------------------------------------------------------------------------------+
```

### Section 1: Main (Presence & Conversation)
- **Presence Header:** Displays Arle's current activity, immediate intentions, and recent experiences derived from actual background events.
- **Voluntary Thoughts:** Area where Arle can voluntarily share selected reflections (private deliberations remain private).
- **Conversation Stream:** 
  - Conversation exists exclusively in `Main`. Other sections do not render a global chat panel.
  - Distinguishes user messages from messages initiated independently by Arle.
  - Message action tools: "Save to Memory" button to save notable insights directly to autobiographical memory.
- **Rich Composer:**
  - Plus (`+`) button for file attachments, code snippets, and image understanding.
  - Microphone button for local **Whisper Small** voice input (records -> transcribes -> user reviews before sending).
  - Master **Voice Output Switch (Speak / Mute)** toggle button powered by **Kokoro 82M**.
  - Send button and keyboard shortcut (`Enter`, `Shift+Enter` for newline).

### Section 2: Memory (Autobiographical & Persistent Knowledge)
- Distinct from chat history. Stores synthesized knowledge and experiences.
- Accommodates six memory types:
  1. `episodic`: Autobiographical events and personal milestones.
  2. `semantic`: Facts, concepts, and technical knowledge.
  3. `procedural`: How-to steps, workflows, and automated routines.
  4. `relationship`: Trust milestones, shared history, and boundary events with Creator.
  5. `emotional`: Significant affective impressions and reactions.
  6. `developmental`: Identity evolution and self-narrative shifts.
- **Record Properties:** Provenance, timestamp, importance (`0.0–1.0`), confidence, tags, and correction history.
- **Operations:** Inspection, search, semantic vector retrieval via **EmbeddingGemma 300M**, manual correction, duplicate merging, archiving, and soft/hard deletion.

### Section 3: Emo (Psychological Monitoring)
- Dedicated cockpit for the **Artificial Psychology Engine (APE)**.
- **Honest Status:** Displays current development state:
  - *Module Status:* Active/Initialized or Awaiting Engine Hook.
  - *PAD Affective Coordinates:* Pleasure, Arousal, Dominance vectors.
  - *Temperament Anchor:* Composed, intellectually dominant, guarded baseline.
  - *State Transition Timeline:* Real event log from SQLite (`emotional_transitions`) with explicit triggering causes.
- Does not render arbitrary random meters or fake psychological values.

### Section 4: History (Conversation Archive)
- Chronological archive of all past conversations.
- **Features:**
  - Date grouping (Today, Yesterday, Last 7 Days, Older).
  - Search by title and message content.
  - Pinning conversations to the top.
  - Renaming and deleting sessions.
  - "Continue Conversation" button that opens the selected session in `Main`.

### Section 5: Activities (Independent Pursuits & Tasks)
- Displays Arle's pursuits beyond active user chat.
- **Distinction:** Clearly labels `arle_initiated` vs `user_assigned`.
- **Status States:** `planned`, `in_progress`, `paused`, `completed`, `cancelled`.
- Displays objective, progress (`0–100%`), associated memories, and relevant actions taken.
- Shows honest empty state when no activity is currently scheduled.

### Section 6: Environment (Digital Agency & Permissions)
- Transparency into Arle's presence on the host OS:
  - **Digital Accounts:** Configured identities (e.g. Email address, local accounts).
  - **Filesystem Access:** Dedicated storage directory (`~/.arletex`) and permissions.
  - **Browser & Network:** Activity logs, web research domains, and proxy status.
  - **Terminal / Execution:** Sandboxed script runner status.
  - **Security Controller:** Separation between intended actions and authorized actions.

---

## 4. Device Telemetry Rail

Placed on the right side of the layout. Displays strictly verified Linux hardware metrics:
- **CPU:** Usage percentage, current clock frequency (MHz), temperature (°C), model (`AMD Ryzen Z1 Extreme`).
- **Memory:** Total, used, available, percentage, swap usage.
- **GPU:** AMD Radeon 780M utilization %, temperature (°C), unified memory architecture note.
- **Storage:** Root/home filesystem capacity and usage %.
- **Battery & Power:** Percentage, charging state, wattage.
- **Inference Performance:** Active model ID, provider (`llama.cpp`), real Time-to-First-Token (TTFT in ms), and real tokens per second (t/s).
- **Services Health:** Status indicators for Backend, SQLite Database, Vulkan Llama-Server, EmbeddingGemma, Whisper, and Kokoro.

---

## 5. Security & Boundary Rules
- Security decisions and permission boundaries remain independent of model text.
- Image files, audio data, and temporary uploads stay on local disk; no external cloud transmission.
- Renderer process remains sandboxed with `contextIsolation: true` and `nodeIntegration: false`.
