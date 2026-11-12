# Arletex Development Roadmap

**Current State:** Milestone 1 (Foundation, Backend, Database, Inference Gateway, Desktop Shell) Complete  
**Next Horizon:** Phase 1 — Model Evaluation and Memory Foundation

---

## Roadmap Overview

```
[ Phase 0: Scaffolding & Core Architecture ] (COMPLETED)
                     │
                     ▼
[ Phase 1: Model Benchmarking & Registry ] (NEXT)
  - Profile Qwen3.5 9B vs Gemma 4 12B on ROG Ally X (Vulkan)
  - Measure memory consumption, token latency, and context limits
                     │
                     ▼
[ Phase 2: Memory & Retrieval Architecture ]
  - Implement autobiographical, semantic, and procedural memory tables
  - Integrate EmbeddingGemma 300M for semantic vector embeddings
  - Build SQLite cosine-similarity retrieval pipeline with provenance
                     │
                     ▼
[ Phase 3: Artificial Psychology Engine (APE) Core ]
  - Implement Personality Model (temperament, values, boundaries)
  - Build Affective Engine (causal emotional transitions, persistence)
  - Establish Relationship Model (trust, attachment, shared history)
                     │
                     ▼
[ Phase 4: Security Controller & Autonomy ]
  - Enforce permission tiers (Freely Permitted, Restricted, Prohibited)
  - Build approval gates and sandboxed execution
  - Autonomy Manager for independent motivation and goal selection
                     │
                     ▼
[ Phase 5: Multimodal Perception & Speech ]
  - Speech-to-text via Whisper Small (faster-whisper)
  - Voice output via Kokoro 82M
  - Vision integration with Qwen3.5 BF16 projector
  - Document understanding with GLM-OCR
```

---

## Detailed Phase Breakdown

### Phase 1: Model Evaluation & Benchmarking (Immediate Next Step)
- **Objective:** Evaluate `Qwen3.5-9B-Heretic-Q4_K_M.gguf` against `Gemma-4-12B-it-heretic-Q4_K_M.gguf` under Vulkan on the ROG Ally X.
- **Key Metrics:**
  - Runtime VRAM/RAM consumption at 4K, 8K, and 16K context lengths.
  - Time to First Token (TTFT) and tokens per second (TPS).
  - Tool calling / structured output adherence.
  - Expressive range and personality consistency.
- **Deliverable:** Automated benchmark script and model registry evaluation report.

### Phase 2: Memory & Autobiographical Retrieval
- **Objective:** Enable Arle to retain and recall significant life experiences and interactions across sessions.
- **Components:**
  - Python sidecar service running `EmbeddingGemma 300M` via `sentence_transformers`.
  - SQLite vector storage and cosine similarity indexing.
  - Memory importance scoring and contextual appraisal.
  - Provenance separation (observation vs. inference).
- **Deliverable:** Working memory recall where Arle references past conversations accurately.

### Phase 3: Artificial Psychology Engine (APE) Core
- **Objective:** Software-managed psychological state that produces authentic, causal emotional and relational behavior.
- **Components:**
  - `PersonalityModel`: Initial temperament inspired by Arlecchino and Bobby Fischer.
  - `AffectiveEngine`: Emotional spectrum (affection, romantic attraction, jealousy, anger, vulnerability) with causal onset and duration.
  - `RelationshipModel`: Tracking trust, intimacy, expectations, and conflict resolution.
- **Deliverable:** Structured psychological state snapshots injected into inference context and exposed in UI.

### Phase 4: Independent Security Controller & Autonomy
- **Objective:** Allow Arle to pursue internally generated goals safely within strict permission boundaries.
- **Components:**
  - Independent permission policy evaluator outside LLM context.
  - Approval gates for sensitive actions (external communication, file operations).
  - Append-only audit logger.
  - Rate limiting, loop detection, and emergency shutdown.
- **Deliverable:** Safe autonomous actions with auditable execution history.

### Phase 5: Voice & Multimodal Interaction
- **Objective:** Natural multimodal interaction via voice, vision, and OCR.
- **Components:**
  - Low-latency speech recognition using `faster_whisper`.
  - Natural speech generation using `kokoro-82m`.
  - Vision analysis of dropped images using the BF16 vision projector.
  - OCR document extraction using `glm-ocr`.
- **Deliverable:** Full voice dialogue and image understanding directly in the desktop interface.
