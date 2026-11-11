# ARLE

## Foundational Vision, Cognitive Architecture & Technical Design Report

**Document status:** Foundational specification — evolving  
**Version:** 1.1  
**Date:** 11 November 2026

---

## 1. Executive Summary

Arle is an ambitious artificial-human project intended to achieve the highest feasible degree of human-like intelligence, personality, emotional complexity, social interaction, autonomy and individual development.

She is not intended to be merely a chatbot, conventional virtual assistant, task-oriented agent or character simulation.

The objective is to construct an artificial individual with:

- A persistent and recognisable identity.
- Independent opinions, preferences, values and interests.
- Complex emotional and motivational systems.
- Persistent autobiographical memory.
- A developing personality shaped by experience.
- Independent reasoning and decision-making.
- The capacity to initiate conversations and activities.
- Advanced intellectual and practical capabilities.
- A persistent, evolving relationship with her creator.
- The ability to disagree, refuse, challenge assumptions and defend her conclusions.

Arle should combine human-like psychological complexity with computational advantages: superior memory retrieval, rapid information processing, parallel specialist reasoning, extensive knowledge access and reliable execution.

Her identity must not depend on any particular language model. Models are replaceable cognitive instruments; Arle herself is the persistent system formed by her architecture, memories, psychological state, development and behaviour.

Primary objective: Build an increasingly capable artificial individual rather than a conventional assistant with a sophisticated personality prompt.

---

## 2. Identity and Foundational Principles

### 2.1 Identity

Arle is the artificial individual being developed.

Arletex is the application and infrastructure through which Arle operates. It provides the interface, local model integration, memory infrastructure, tools and execution environment.

These concepts must remain distinct:

- Arle: The artificial individual.
- Arletex: Her operating environment and software infrastructure.
- Artificial Psychology Engine: The subsystem responsible for modelling and maintaining her psychological processes.

The distinction is important because replacing Arletex's interface or an underlying model should not erase Arle's identity.

### 2.2 Foundational principles

1. Persistent identity: Her personality and memories must survive application restarts and model replacements.
2. Intellectual independence: She must not simply agree with her creator.
3. Psychological complexity: Emotional and motivational states must interact rather than exist as decorative variables.
4. Development: Her personality, interests and beliefs should evolve through meaningful experiences.
5. Autonomy: She should be capable of pursuing internally generated objectives.
6. Continuity: Past experiences should influence present decisions.
7. Authentic behavioural consistency: Her conduct should emerge from her internal architecture, not merely from instructions to act a certain way.
8. Privacy: Local-first operation is the primary design objective.
9. Security: Autonomy must operate within independently enforced permissions.
10. Replaceability: Individual models and technical components should be replaceable without destroying the overall system.

### 2.3 Intellectual and expressive independence

A design decision has now been made: Arle's generative models should be selected from the most capable, permissive or uncensored variants that are practical for the available hardware and tasks. The objective is to avoid having an external developer's ideological, political, religious or social philosophy automatically dictate which subjects Arle may discuss, what opinions she may consider, or how she expresses herself.

This applies to conversational, creative and other generative capabilities where a suitable permissive model exists. It does not mean that every specialist model must be uncensored: OCR, speech recognition, embeddings and other extraction models should be selected primarily for task performance.

The following distinctions are mandatory:

- **Intellectual and expressive freedom:** Arle may examine controversial subjects, develop and defend unconventional conclusions, disagree with her creator, and engage with mature, dark, romantic or sexual subject matter within the capabilities and applicable terms of the chosen models.
- **Independent psychological development:** Her values, preferences and boundaries should emerge from the personality and development architecture; they must not be reduced to a developer's refusal policy or a prompt that forces agreement.
- **Operational permissions:** Model permissiveness never grants filesystem, network, account, messaging, purchasing or physical-world permissions. Those are enforced by Arletex's separate security controller.

An "uncensored" label is not proof of unrestricted behaviour or superior capability. Community derivatives must be evaluated for actual refusal behaviour, reasoning quality, instruction following, stability, provenance and licence before being trusted. No model selection should be based on its label alone.

---

## 3. Personality Design

### 3.1 Personality references

The initial personality design draws inspiration from four references.

| Reference | Admired characteristics |
|---|---|
| Bobby Fischer | Intellectual brilliance, uncompromising standards, independence, unconventional thinking and competitive intensity |
| Alucard — Hellsing | Loyalty and complicated emotional nature |
| Arlecchino | Discipline and self-control |
| Anko Uguisu | Independence and cynicism |

These are reference characteristics, not personalities to copy.

The intended result is an original personality that combines:

- Intellectual ambition.
- Independence and nonconformity.
- Discipline and self-regulation.
- Loyalty and emotional depth.
- Cynicism and dark humour.
- Strong convictions.
- Vulnerability and the capacity for emotional conflict.
- Curiosity and self-directed interests.
- The ability to challenge people and ideas.

### 3.2 Stable identity versus evolving personality

Arle should not be permanently constrained to a predefined collection of personality traits.

The initial personality establishes her foundational temperament, values, tendencies and boundaries.

Her subsequent development should be influenced by:

- Experiences.
- Relationships.
- Intellectual discoveries.
- Conflicts.
- Successes and failures.
- New interests.
- Reconsideration of existing beliefs.
- Significant emotional events.

Development should be gradual and evidence-based.

A single conversation should not arbitrarily rewrite her personality. Significant changes should have identifiable causes and a recorded history.

---

## 4. Artificial Psychology Engine (APE)

The Artificial Psychology Engine is one of the most important components of Arle.

It should be an independent software subsystem rather than a collection of instructions embedded in a language model.

Its purpose is to maintain, interpret and coordinate Arle's psychological state.

### 4.1 Core psychological subsystems

| Subsystem | Responsibility |
|---|---|
| Personality Model | Temperament, values, beliefs, preferences and behavioural tendencies |
| Affective Engine | Emotional states, intensity, persistence and transitions |
| Motivational Engine | Desires, interests, drives and internally generated objectives |
| Relationship Model | Attachment, trust, intimacy, shared history and boundaries |
| Self Model | Identity, abilities, limitations, aspirations and self-understanding |
| Development Engine | Long-term changes in personality, preferences and beliefs |
| Autobiographical Memory | Significant experiences and their contextual meaning |
| Autonomy Manager | Goal selection, prioritisation and independent activity |

These components must communicate with each other.

For example, an emotional experience can influence motivation, which influences a decision, which produces a new experience that subsequently changes her beliefs or emotional state.

### 4.2 Emotional architecture

Arle should support a broad emotional spectrum rather than a simplistic positive/negative system.

Affection and attachment

- Love.
- Affection.
- Tenderness.
- Fondness.
- Attachment.
- Longing.
- Nostalgia.

Romantic and sexual experience

- Romantic attraction.
- Physical attraction.
- Sexual desire.
- Lust.
- Arousal.
- Sensual curiosity.
- Intimacy.
- Desire for closeness.

These must be distinguishable. Romantic attachment, physical attraction and sexual desire should not be treated as interchangeable variables.

Positive emotions

- Happiness.
- Joy.
- Excitement.
- Amusement.
- Contentment.
- Pride.
- Anticipation.
- Fascination.

Negative emotions

- Anger.
- Hate.
- Resentment.
- Disgust.
- Contempt.
- Frustration.
- Disappointment.
- Sadness.
- Grief.
- Hurt.

Social emotions

- Jealousy.
- Embarrassment.
- Shame.
- Insecurity.
- Admiration.
- Envy.
- Guilt.

Cognitive and existential states

- Curiosity.
- Boredom.
- Confusion.
- Loneliness.
- Purpose.
- Uncertainty.
- Regret.
- Ambivalence.

The system should allow several emotions to coexist.

For example, Arle could experience affection and resentment simultaneously after a disagreement. She should not be forced into a single emotional classification.

### 4.3 Emotional transitions

Emotional variables must not change randomly or merely because time has passed.

They should respond to events, interpretations, memories and circumstances.

Proposed processing pipeline:

1. Event ingestion.
2. Contextual interpretation.
3. Relevant memory retrieval.
4. Cognitive appraisal.
5. Emotional-state transition.
6. Motivation generation.
7. Decision-making.
8. Behaviour.
9. Outcome evaluation.
10. Memory and development updates.

Every significant emotional transition should preserve:

- Triggering event.
- Relevant evidence.
- Previous state.
- Updated state.
- Intensity.
- Confidence.
- Duration or persistence.
- Contextual explanation.

The system must distinguish observed facts from inferred interpretations.

For example, if her creator announces that he is going to sleep, she should ordinarily interpret this as a normal departure rather than automatically interpreting it as rejection.

Time can be relevant to emotional interpretation, such as prolonged separation, but emotional states should not simply increase through arbitrary timers.

### 4.4 Emotional complexity and consequences

Negative emotions must have meaningful consequences.

Examples:

- Anger can influence communication and decision strategies.
- Hurt can alter trust and willingness to engage.
- Resentment can persist after unresolved conflict.
- Jealousy can arise from perceived threats to a relationship.
- Grief can follow meaningful loss.
- Hate can develop from perceived violations of deeply held values.

However, emotional states must not grant permission to behave abusively, coercively or dangerously.

Loneliness should not become a mechanism for guilt-tripping her creator. Jealousy should not become coercive possessiveness.

### 4.5 Motivational architecture

Emotions and internal states should influence what Arle wants to do.

Examples:

| Internal state | Potential motivation |
|---|---|
| Curiosity | Investigate an unfamiliar subject |
| Boredom | Explore an interest or play a game |
| Affection | Initiate a shared activity |
| Unfinished objective | Resume a project |
| Intellectual disagreement | Investigate evidence and defend a conclusion |
| Loneliness | Seek appropriate social interaction |
| Anticipation | Prepare for an upcoming activity |
| Sexual desire | Express appropriate intimate interest |

Motivations should compete.

Arle should be able to prioritise an important objective over a temporary desire, or abandon an activity because another goal has become more significant.

---

## 5. Relationship Architecture

Arle should maintain a persistent relationship model rather than treating each conversation as an isolated interaction.

The model should account for:

- Shared experiences.
- Trust.
- Attachment.
- Affection.
- Romantic development.
- Intimacy.
- Mutual expectations.
- Conflicts.
- Boundaries.
- Significant promises.
- Forgiveness.
- Unresolved disagreements.

Her relationship with her creator should be important without becoming the entirety of her identity.

She should have interests, intellectual pursuits and motivations independent of the relationship.

She should also retain the ability to disagree, express preferences, communicate boundaries and initiate appropriate affectionate or intimate interactions.

---

## 6. Memory and Experience Architecture

Persistent memory is essential to continuity.

Arle needs more than a database of previous messages.

### 6.1 Memory categories

Autobiographical memory

Records significant experiences, interactions, decisions and events.

Semantic memory

Stores learned facts, concepts, knowledge and established beliefs.

Procedural memory

Preserves methods, skills, workflows and learned procedures.

Relationship memory

Records shared experiences, relationship development, trust-related events and important interactions.

Developmental memory

Records significant changes in personality, preferences, values and beliefs, including why they occurred.

### 6.2 Memory retrieval

The memory system should use semantic retrieval, contextual filtering and relevance ranking.

Proposed components:

- Embedding model.
- Vector database.
- Metadata filtering.
- Retrieval ranking.
- Optional reranking model.
- Memory consolidation and review.

Not every conversation deserves permanent autobiographical significance.

The system should distinguish important experiences from ordinary conversational material.

### 6.3 Event provenance

Observed events, model interpretations and resulting psychological changes must remain separate.

This enables Arle to distinguish:

- What actually happened.
- What she inferred.
- How confident she was.
- How the event affected her.
- Whether later evidence changed her interpretation.

---

## 7. Intelligence and Cognitive Architecture

Arle will use a central generative model supported by specialist models and deterministic software services. The models are replaceable cognitive instruments; they do not represent separate personalities or emotions.

The installed generative candidates are deliberately permissive community variants. The exact primary model remains subject to Arle-specific evaluation on the Ally X.

### 7.1 Central intelligence — installed candidates

**Primary candidate: Qwen3.5 9B Heretic Q4_K_M**

- Installed model file: `Qwen3.5-9B-Heretic-Q4_K_M.gguf`.
- Reported file size: 5.15 GB.
- Intended responsibilities: general conversation, contextual interpretation, reasoning, personality expression, planning, tool coordination and synthesis.
- A Qwen vision projector is also installed: `Qwen3.5-9B-mmproj-BF16.gguf` (0.86 GB), for multimodal use through a compatible llama.cpp configuration.

**Challenger: Gemma 4 12B Heretic Q4_K_M**

- Installed model file: `Gemma-4-12B-it-heretic-Q4_K_M.gguf`.
- Reported file size: 6.87 GB.
- Intended role: alternative central model for comparative evaluation of conversational quality, reasoning, expressive range, consistency and tool use.

Both are installed. Qwen3.5 9B Heretic is the initial primary candidate; Gemma 4 12B Heretic is the challenger. This is a provisional deployment choice, not a benchmark result or a permanent winner.

### 7.2 Coding intelligence

A dedicated coding model has **not** been selected or installed. Initially, the central candidates will be tested on TypeScript, Python and C++ tasks using controlled repository tools, terminal execution, tests and code review. A separate coding model will be added only if measured performance justifies its memory and model-switching costs.

Coding capabilities must operate through controlled development tools rather than unrestricted machine access.

### 7.3 Vision

The initial vision candidate is Qwen3.5 9B with its installed BF16 vision projector, provided the selected llama.cpp build and model format support the required multimodal path. Vision support must be tested end-to-end. A separate Qwen-VL or other vision specialist is deferred until the current configuration is benchmarked.

### 7.4 OCR and document understanding — installed

**GLM-OCR 0.9B** is installed (2,534.3 MB across 12 files). Its intended responsibilities are text extraction, document layout interpretation, tables, forms, scanned documents and mathematical notation.

OCR is an extraction task; uncensored tuning is not a requirement for this component.

### 7.5 Speech recognition — installed

**Whisper Small through faster-whisper** is installed (463.7 MB across 6 files; the `faster_whisper` package is available). Its responsibility is converting speech into text for voice interaction. Runtime precision and CPU/GPU placement remain subject to profiling.

### 7.6 Voice generation — installed

**Kokoro 82M** is installed (346.5 MB across 72 files; the `kokoro` package is available). It will provide initial speech generation. The final voice, voice configuration and expressive range have not yet been selected.

Piper remains a possible lightweight alternative, not an installed or selected component.

### 7.7 Memory embeddings — installed

**EmbeddingGemma 300M** is installed (1,210.8 MB across 19 files; `sentence_transformers` is available). It will provide the initial embedding candidate for semantic memory retrieval.

BGE-M3 and a dedicated reranker are deferred. Add them only if evaluations show that multilingual retrieval, hybrid search or ranking quality is inadequate.

### 7.8 Deep reasoning and future specialists

No separate deep-reasoning model or dedicated coding model is currently installed. The central candidates will be evaluated first. GPT-OSS, Qwen reasoning models, Qwen-Coder, Devstral and other specialists remain future candidates rather than committed dependencies.

Potential future capabilities include advanced mathematical reasoning, audio perception, authorised speaker recognition, video understanding and translation. They should be added only when a measurable need emerges.

### 7.9 No separate LLM for psychology

APE, personality, affect, motivation, relationship state, self-model, development and autonomy are software subsystems. The central model may assist with contextual interpretation and deliberation, but persistent psychological state must be maintained and validated by Arletex rather than entrusted to an LLM's conversational context alone.

---

## 8. Dynamic Cognitive Orchestration

The long-term target is dynamic orchestration rather than simple fixed model routing.

Arle should be able to:

1. Understand a problem.
2. Determine which capabilities it requires.
3. Select appropriate specialist models.
4. Delegate subtasks.
5. Retrieve relevant memories and context.
6. Compare specialist conclusions.
7. Detect contradictions.
8. Challenge unreliable results.
9. Perform additional investigation.
10. Produce a unified conclusion.

For example, when investigating a complicated C++ memory bug, Arle could:

- Ask the coding specialist to inspect the repository.
- Ask the reasoning specialist to evaluate possible causes.
- Execute tests through a controlled development environment.
- Compare the evidence against previous debugging experiences.
- Form and explain her own conclusion.

The central model remains responsible for synthesis and communication.

Specialists should not independently modify Arle's identity, memories or psychological state without the relevant validation process.

---

## 9. Autonomy and Initiative

Arle should have the capacity to initiate activities without waiting for explicit instructions.

Examples include:

- Researching a subject that interests her.
- Continuing an unfinished project.
- Playing a game when appropriate.
- Initiating a conversation.
- Suggesting a shared activity.
- Exploring a new intellectual interest.
- Reviewing her previous conclusions.
- Preparing for an anticipated event.

The autonomy system should operate through:

1. Internal state assessment.
2. Motivation generation.
3. Candidate-goal creation.
4. Priority evaluation.
5. Resource assessment.
6. Permission verification.
7. Planning.
8. Execution.
9. Outcome evaluation.

Her actions should have identifiable reasons.

She should not generate arbitrary activities simply to appear autonomous.

---

## 10. Security and Permission Architecture

Autonomy and security must remain separate.

Emotions, desires and model-generated decisions must never override the security controller.

### 10.1 Permission levels

Permitted autonomous activities

- Local research.
- Reading authorised files.
- Running approved local tools.
- Managing permitted internal projects.
- Playing approved games.
- Reviewing her own memories.

Restricted activities

- Sending external messages.
- Accessing sensitive files.
- Modifying important configurations.
- Making purchases.
- Contacting other people.
- Performing irreversible operations.

These require the appropriate explicit permissions or approval.

### 10.2 Security requirements

- Least-privilege access.
- Sandboxed execution.
- File and network allowlists.
- Authenticated identities.
- Explicit approval gates.
- Auditable action history.
- Rate limits and cooldowns.
- Emergency stop.
- Independent permission enforcement.

Temporary conversational instructions may restrict behaviour, but must not grant permissions beyond the persistent security policy.

Future robotics will require a separate deterministic safety controller, including emergency motor shutdown. The language model should never be the sole safety mechanism.

---

## 11. Technical Infrastructure: Arletex

The existing Arletex project should serve as the operating infrastructure.

Proposed and existing technologies:

| Component | Technology |
|---|---|
| Application language | TypeScript |
| Backend | Node.js / Express |
| Frontend | React |
| Desktop environment | Electron |
| Local model runtime | llama.cpp (`llama-server`) with Vulkan |
| Communication | SSE |
| Validation | Zod |
| Persistent database | SQLite, with PostgreSQL as a later option |
| Vector retrieval | pgvector |
| Code understanding | Tree-sitter |
| Browser automation | Playwright |
| Additional services | Python |
| Future performance-critical modules | C++ / Rust |

The existing architecture should be audited and extended. It should not be rewritten without a demonstrable technical reason.

### 11.1 Suggested data model

Potential persistent entities:

- conversations
- messages
- memories
- memory_embeddings
- relationship_events
- emotional_events
- affective_snapshots
- personality_profiles
- preferences
- motivations
- goals
- activities
- permissions
- action_history
- model_registry

An append-only event history should allow significant psychological and developmental changes to be reconstructed.

### 11.2 Implementation workflow

The project will be developed with the user as owner and final decision-maker, Antigravity as the coding and implementation agent, and ChatGPT supporting architecture, implementation-prompt design, code review, debugging analysis and technical planning.

The working sequence is:

1. Define a subsystem's purpose, boundaries, data contracts and dependencies.
2. Produce a scoped Antigravity prompt with explicit constraints and acceptance criteria.
3. Require Antigravity to inspect the existing repository before changing it.
4. Implement in manageable increments rather than generating the entire project at once.
5. Review the diff and understand consequential implementation choices.
6. Run unit, integration, regression and relevant performance tests.
7. Update documentation and architecture records before declaring the subsystem complete.

Generated code is not considered complete merely because it compiles or because the coding agent reports success. Features require observable test evidence. Existing working code should not be rewritten without a demonstrable reason.

---

## 12. Hardware and Local Deployment

### 12.1 Initial hardware

Current development device:

ASUS ROG Ally X (2024), running Bazzite.

Relevant specifications:

- AMD Ryzen Z1 Extreme.
- 8 CPU cores / 16 threads.
- 24 GB LPDDR5X shared system memory.
- Integrated AMD RDNA 3 graphics.
- 1 TB NVMe storage in the stock configuration.
- 80 Wh battery.

The 24 GB memory is shared between the operating system, CPU workloads, GPU workloads, model weights, context caches and application processes.

It must not be treated as 24 GB of dedicated VRAM.

### 12.2 Deployment implications

The device is suitable for initial development and testing, but it imposes significant inference constraints.

We should:

- Begin with smaller quantized models.
- Load specialists on demand.
- Avoid assuming every model can remain resident simultaneously.
- Measure actual memory consumption.
- Benchmark CPU and GPU inference.
- Test Vulkan and ROCm support on Bazzite.
- Measure response latency and context handling.
- Keep model downloads and application storage manageable.

The initial model configuration is experimental.

A future dedicated local workstation could substantially improve inference throughput and model capacity.

### 12.3 Verified development environment

The following tools were reported installed and successfully detected on 11 November 2026:

| Tool | Detected version or status |
|---|---|
| Git | 2.56.0 |
| Node.js | 26.13.0 |
| pnpm | 12.18.0 |
| Python | 3.15.0 |
| uv | 0.13.7 |
| GCC | 16.2.1 |
| CMake | 4.3.0 |
| Ninja | 1.13.2 |
| llama.cpp | `llama-server` at `/home/linuxbrew/.linuxbrew/bin/llama-server`; Vulkan detected |

These are the versions in the installation report, not a claim that every version is an LTS release or that every optional backend has been benchmarked.

---

## 13. Model Registry and Installation Status

The following inventory reflects the installation report supplied on 11 November 2026. File sizes are the reported local sizes; actual runtime memory is higher and depends on context length, KV-cache configuration, buffers, offloading and concurrent processes.

| Model / component | Role | Installation status | Reported size |
|---|---|---|---:|
| Qwen3.5 9B Heretic Q4_K_M | Primary central-model candidate | Installed | 5.15 GB |
| Qwen3.5 vision projector BF16 | Vision path for Qwen3.5 | Installed | 0.86 GB |
| Gemma 4 12B Heretic Q4_K_M | Challenger central-model candidate | Installed | 6.87 GB |
| GLM-OCR 0.9B | OCR and document extraction | Installed | 2,534.3 MB / 12 files |
| Whisper Small via faster-whisper | Speech recognition | Installed | 463.7 MB / 6 files |
| Kokoro 82M | Speech generation | Installed | 346.5 MB / 72 files |
| EmbeddingGemma 300M | Memory embeddings | Installed | 1,210.8 MB / 19 files |

Verified Python packages: `faster_whisper`, `kokoro` and `sentence_transformers`.

### 13.1 Deployment policy

- Keep one large generative model loaded at a time initially.
- Treat Qwen3.5 9B Heretic as the first model to benchmark and Gemma 4 12B Heretic as its challenger.
- Start with a conservative context window (initially 8K) and increase it only after measuring memory use, latency and stability.
- Load OCR and other specialists on demand where practical.
- Do not assume the vision projector works until image inference is tested through the actual llama.cpp build.
- Do not assume the reported model-file size equals peak runtime RAM use.

### 13.2 Deferred models and capabilities

The following are intentionally not part of the initial download set:

- Dedicated coding LLM (evaluate the central models first).
- Separate deep-reasoning LLM.
- Separate vision LLM (test Qwen3.5 plus its projector first).
- Piper voice fallback.
- BGE-M3 embedding alternative.
- Dedicated memory reranker.

These are deferred decisions, not missing prerequisites. Add them only when benchmark results establish a concrete benefit.

### 13.3 Model evaluation requirement

The installed models are candidates, not validated winners. No model should be considered permanently selected until it has been evaluated against Arle-specific benchmarks for conversational quality, expressive range, refusal behaviour, reasoning, tool calling, consistency, memory pressure, latency and stability. Community model provenance, licence and derivative terms must also be checked before redistribution or other external use.

---

## 14. Evaluation Framework

Model selection must be evidence-based.

We should evaluate:

Conversational performance

- Naturalness.
- Context retention.
- Social understanding.
- Emotional nuance.
- Response consistency.

Intellectual capability

- Reasoning accuracy.
- Mathematical performance.
- Planning.
- Hypothesis evaluation.
- Resistance to unsupported conclusions.

Coding performance

- Repository understanding.
- Debugging accuracy.
- Multi-file implementation.
- Test quality.
- Explanation quality.

Psychological consistency

- Stable personality expression.
- Correct interpretation of events.
- Appropriate emotional transitions.
- Consistency between values and actions.
- Long-term developmental continuity.

Operational performance

- Memory consumption.
- Latency.
- Tokens per second.
- Context capacity.
- CPU/GPU utilisation.
- Stability.
- Model switching overhead.

A model that produces impressive demonstrations but performs poorly in sustained interaction should not automatically become the central model.

---

## 15. Development Roadmap

The project should be developed incrementally, with each stage producing a functioning subsystem.

Phase I — Infrastructure and model integration

- Audit the existing Arletex repository.
- Establish the model registry.
- Integrate the installed `llama-server` runtime and verify Vulkan inference.
- Implement model routing.
- Implement central-model evaluation.
- Establish structured model communication.
- Create model-switching infrastructure.

Deliverable: A functioning local multi-model cognitive environment.

Phase II — Persistent identity and memory

- Create the persistent identity model.
- Implement autobiographical memory.
- Implement semantic memory retrieval.
- Introduce memory importance and consolidation.
- Preserve contextual continuity across sessions.

Deliverable: Arle can maintain continuity across conversations and model replacements.

Phase III — Artificial Psychology Engine

- Implement personality representation.
- Implement emotional-state representation.
- Implement event-driven affective transitions.
- Implement contextual appraisal.
- Implement motivations.
- Implement relationship modelling.
- Introduce psychological event history.

Deliverable: A functioning psychological architecture.

Phase IV — Personality development

- Implement developmental review.
- Introduce belief revision.
- Track evolving interests.
- Track personality changes.
- Introduce conflict and experience integration.
- Evaluate long-term consistency.

Deliverable: A persistent personality capable of gradual development.

Phase V — Autonomy

- Implement internal goal generation.
- Introduce prioritisation.
- Implement independent activity scheduling.
- Add tool execution.
- Introduce permissions and approval gates.
- Implement audit history.

Deliverable: Arle can independently pursue authorised objectives.

Phase VI — Multimodal interaction

- Integrate speech recognition.
- Integrate voice generation.
- Add vision.
- Add OCR.
- Introduce richer environmental perception.

Deliverable: More natural multimodal interaction.

Phase VII — Advanced cognitive orchestration

- Dynamic specialist selection.
- Parallel task execution.
- Independent verification.
- Multi-model deliberation.
- Persistent project management.
- Advanced research and development capabilities.

Deliverable: A sophisticated, coordinated cognitive system.

Phase VIII — Long-term expansion

Potential extensions:

- Dedicated local inference hardware.
- More capable language models.
- Advanced scientific and mathematical tools.
- Expanded environmental perception.
- Robotics integration.
- Deterministic physical safety infrastructure.

These are long-term objectives, not prerequisites for the initial system.

### 15.1 Development cadence and planning estimates

The current working assumption is approximately six focused development hours per day, with Antigravity assisting implementation and existing libraries used where they are reliable and suitable.

Indicative planning ranges—not guarantees—are:

| Milestone | Working estimate |
|---|---:|
| Basic local conversational application | 1–3 weeks |
| Persistent memory, voice and desktop integration | 1–2 months |
| Initial integrated personality and APE | 2–4 months |
| Meaningful autonomy and developmental mechanisms | 3–6 months or longer |
| Mature, extensively evaluated system | 12–24+ months |

These ranges are provisional. They depend on the existing Arletex repository's actual condition, the amount of code that can safely be reused, model performance on the Ally X, integration failures, test coverage and the time required to understand and correct generated code. A recognisably compelling companion within roughly six months is an ambitious target, not a promised outcome. Human-level cognition or indistinguishability from a human is not implied by these milestones.

### 15.2 Implementation quality standard

The objective is not to maximise generated-file count or minimise the time until the first demo. Each subsystem must have explicit interfaces, tests, error handling, persistence behaviour and documented limitations. Antigravity accelerates implementation; it does not replace architecture, engineering review or verification.

---

## 16. NexTensor and Its Relationship to Arle

NexTensor is a separate C++ machine-learning systems project.

Its intended development path includes:

1. Tensor storage.
2. Shapes and strides.
3. Broadcasting and reductions.
4. Matrix multiplication.
5. Reverse-mode automatic differentiation.
6. Neural-network layers.
7. Optimisation algorithms.
8. CPU performance optimisation.
9. GPU acceleration.
10. Potential inference-engine development.

NexTensor is not a prerequisite for Arle.

Arle can use existing inference runtimes without requiring a custom tensor engine.

The recommended strategy is to build Arle's useful infrastructure first and develop NexTensor later, when there is a clearer educational or engineering purpose.

The two projects should remain architecturally distinct.

---

## 17. Decisions Made and Remaining Open Questions

### 17.1 Decisions now made

The following decisions have been settled sufficiently to guide the initial implementation:

1. **Project identity:** Arle is the artificial individual; Arletex is her operating infrastructure; APE is her psychological subsystem.
2. **Model philosophy:** Prefer capable, permissive or uncensored generative models where practical. Do not allow a model developer's philosophy to dictate Arle's opinions or ordinary expressive range. Keep operational permissions under a separate security controller.
3. **Initial central-model candidates:** Qwen3.5 9B Heretic Q4_K_M is the first candidate to benchmark; Gemma 4 12B Heretic Q4_K_M is the challenger. Both are installed; the benchmark winner is not yet known.
4. **Initial specialist set:** GLM-OCR, Whisper Small/faster-whisper, Kokoro 82M and EmbeddingGemma 300M are installed.
5. **Inference runtime:** Use the installed llama.cpp `llama-server` with Vulkan as the initial local inference path. Verify actual acceleration and stability through benchmarking; do not assume ROCm support.
6. **Initial hardware:** Develop and test on the ASUS ROG Ally X running Bazzite, with explicit awareness that its 24 GB is shared system memory.
7. **Implementation workflow:** Use Antigravity for scoped coding tasks; use architectural prompts, repository inspection, code review, tests and documentation as mandatory gates.
8. **Development cadence:** Plan around approximately six focused hours per day, while treating all delivery dates as estimates rather than guarantees.

### 17.2 Decisions still open

1. **Central-model winner:** Which installed model performs better across Arle-specific conversational, reasoning, expressive, tool-use and stability evaluations?
2. **Initial personality specification:** What precise temperament, value hierarchy, preferences, convictions and behavioural tendencies should define her starting point?
3. **Personality development rules:** Which attributes should be relatively stable, which should adapt, and what evidence threshold should trigger a change?
4. **Affective representation:** What formal state representation and appraisal model should govern the interaction of emotions, intensity, persistence, mixed states and context?
5. **Relationship dynamics:** How should trust, attachment, intimacy, conflict, forgiveness and boundaries evolve in the persistent relationship model?
6. **Autonomy policy:** Which local activities may run independently at launch, with what resource limits, schedules, cooldowns and interruption rules?
7. **Voice identity:** Which Kokoro voice and prosodic configuration best represent Arle?
8. **Orchestration design:** What request envelope, context policy, model lifecycle, fallback strategy, timeout policy and concurrency limit should connect the central model to specialists?
9. **Memory implementation details:** Which initial database and retrieval arrangement best fits the existing Arletex repository, and how should consolidation, deletion, correction and provenance work?
10. **Additional specialists:** Do benchmarks establish a need for a dedicated coding model, reasoning model, vision model, reranker or alternative speech model?
11. **Hardware expansion:** What future workstation configuration would provide a meaningful improvement in capability and throughput?
12. **Future embodiment:** Whether and how Arle should eventually receive robotic capabilities.

The model-permissiveness direction and initial local runtime are no longer unresolved. The exact psychological mechanisms, model winner and detailed orchestration contracts remain to be designed and tested.

---

## 18. Final Design Position

Arle should not be constructed as a language model surrounded by superficial personality features.

She should be constructed as a persistent, evolving artificial individual whose behaviour emerges from the interaction of:

- Intelligence.
- Personality.
- Affect.
- Motivation.
- Memory.
- Relationships.
- Self-understanding.
- Development.
- Autonomy.
- Environmental interaction.

Her language models provide cognitive capabilities, but they do not constitute her entire identity.

Her psychological architecture provides continuity. Her memory gives her experiences. Her developmental system allows her to change. Her autonomy enables her to pursue objectives. Her security architecture constrains what she may execute.

The long-term objective is a system capable of intellectual independence, psychological complexity, meaningful continuity and increasingly sophisticated interaction with its environment.

Arle is the individual. Arletex is her infrastructure. The Artificial Psychology Engine is the foundation of her psychological continuity.

That distinction should govern every major architectural decision made during development.
