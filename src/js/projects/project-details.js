/**
 * Sync-safe curated metadata for game projects and Unity toolkits.
 * Keeps breakdown details, roles, and case-study links intact even when
 * `scripts/sync-itch.mjs` or `scripts/sync-github.mjs` regenerates JSON feeds.
 */

import { PINNED_REPOS, resolveRepoReleaseDate } from "./github-config.js";

export const GAME_PROJECT_DETAILS = {
  trashfrenzy: {
    role: "Project Manager · Game Designer · Gameplay Programmer · Quality Assurance",
    engine: "Unity 2D (URP) · C#",
    team: "4-person Capstone Team",
    focus: "Gameplay Systems & Educational Design",
    summary:
      "A 2D educational action side-scroller for Android where a robotic fish cleans polluted Philippine tourist waters and sorts collected waste in a drag-and-drop minigame. Evaluated at 4.70 / 5 overall across 75 users and IT experts (ISO/IEC 25010).",
    highlights: [
      "Built an EnvironmentToxin system mapping toxin percentage through a gradient to 2D URP light color/intensity, post-processing filter, and backdrop tint so pollution is readable directly in the world.",
      "Implemented the boss (Atlantis) as a coroutine-driven encounter with telegraphed charges, capped tracking windows, timed weak spots, and ScriptableObject-driven tuning data.",
      "Engineered a cross-scene trash inventory pipeline (gameplay, menu, and minigame inventories) persisting collected waste IDs so each Trash-O-Sorter sorting round dynamically tests what the player gathered.",
      "Designed 5 escalating levels inspired by Philippine waters (Manila Bay, Boracay, Pagudpud, El Nido, Dahican) with touch-only controls and survival pickups.",
    ],
    stack: ["Unity 2D", "URP", "C#", "ScriptableObjects", "Android", "Figma"],
    caseStudyUrl: "/docs/trash-frenzy-case-study.pdf",
  },
  cyclescape: {
    role: "Gameplay Programmer & Game Designer",
    engine: "Unity · C#",
    team: "Student Team Project",
    focus: "Top-Down Shooter & Educational Loop",
    summary:
      "An educational Android top-down shooter guiding players through the four phases of the menstrual cycle, turning biology concepts into readable arcade encounters.",
    highlights: [
      "Designed core combat, movement, and phase progression loops so each stage reinforces the distinct mechanics and themes of the four cycle phases.",
      "Implemented responsive touch-oriented top-down shooting, enemy wave behaviors, and stage transitions in Unity (C#).",
      "Balanced pacing, clarity, and difficulty curves for casual mobile players through iterative playtesting.",
    ],
    stack: ["Unity", "C#", "Android", "Gameplay Systems", "Game Design"],
  },
  "orders-please": {
    role: "Gameplay Programmer & Game Designer",
    engine: "Unity · C#",
    team: "Student Team Project",
    focus: "Time-Management Simulation",
    summary:
      "A fast-paced campus street food vendor simulator for Windows where players track, prepare, and fulfill hungry students' cravings against the clock.",
    highlights: [
      "Designed the core order-queue and time-pressure loop to create clear risk-reward prioritization during rush waves.",
      "Implemented order generation, recipe/fulfillment validation, timer scoring, and UI feedback systems in Unity (C#).",
      "Tuned customer arrival pacing and order complexity so difficulty escalates naturally across shifts.",
    ],
    stack: ["Unity", "C#", "Windows", "Systems Design", "Simulation"],
  },
  "night-light": {
    role: "Gameplay Programmer & Game Designer",
    engine: "Unity · C#",
    team: "Student Team Project",
    focus: "2D Platformer & Level Flow",
    summary:
      "A Windows 2D platformer following Lila and her companion Aria across five stages to collect scattered light orbs, evade hazards, and lift the curse of darkness.",
    highlights: [
      "Implemented player platforming controls, collectible orb tracking, hazard/enemy interactions, and multi-stage progression in Unity (C#).",
      "Designed level layouts and pacing across five stages to introduce traversal hazards and collectible routes progressively.",
      "Tuned jump feel, collision responsiveness, and visual readability in dark environments through playtesting.",
    ],
    stack: ["Unity", "C#", "Windows", "Level Design", "Platformer"],
  },
};

export const TOOL_PROJECT_DETAILS = {
  DevQAToolkit: {
    category: "QA & Debug",
    cardDescription:
      "Zero-dependency Unity 6 in-game bug reporter, repro capture, and release-guarded debug console with .zip bundles and a UI Toolkit workbench.",
    cardTags: ["Bug Reporter", "Debug Console", "UI Toolkit"],
    role: "Systems & Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "In-Game QA Capture & Developer Debug Console",
    summary:
      "A zero-dependency Unity 6 runtime QA and developer console toolkit unifying always-on bug reporting, repro capture, and a strongly typed debug command console with automatic release-build command stripping and a UI Toolkit Editor workbench.",
    highlights: [
      "Captures thread-safe ring-buffered console logs, input breadcrumbs, FPS/memory metrics, scene hierarchy snapshots, pre-overlay screenshots, and recent debug console history into portable .zip bundles or Discord, GitHub Issues, and Trello transports.",
      "Provides quoted argument tokenization, typed and [DebugCommand]-attributed commands (primitives, Vector2/3, Color, enums), Tab autocomplete, Up/Down history, and a built-in bugreport command while stripping command execution outside Editor/Development builds.",
      "Ships zero-prefab runtime IMGUI overlays, an optional New Input System bridge via versionDefines with Legacy Input fallback, and a three-tab UI Toolkit DevQA Workbench (Debug Console, Bug Report Viewer, Settings & Build Status).",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "UPM", "QA Tooling", "Webhooks"],
  },
  NetQAToolkit: {
    category: "Netcode QA",
    cardDescription:
      "Unity 6 multiplayer QA workbench combining NGO, Mirror, and FishNet static scene/prefab auditing with a localhost UDP/TCP simulator and Painter2D bandwidth inspector.",
    cardTags: ["Static Analysis", "UDP/TCP Proxy", "UI Toolkit"],
    role: "Systems & Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Multiplayer Static Auditing & Network Simulation",
    summary:
      "A netcode-agnostic Unity 6 multiplayer QA workbench combining static scene/prefab auditing (NGO, Mirror, FishNet, and [NetAuditTracked] components) with a localhost UDP/TCP impairment proxy, live Painter2D bandwidth inspector, and Chaos Timeline runner.",
    highlights: [
      "Runs 9 built-in static audit rules (NA001–NA009) detecting orphaned NetworkBehaviours, nested NetworkObjects, unregistered prefabs, bandwidth-heavy NetworkTransforms, RPC security issues, MPPM static state, and broken UnityEvents, paired with Hierarchy badges, Quick Fixes, and a pre-build guard.",
      "Simulates latency, Uniform/Normal/Spiky jitter, random and Gilbert-Elliott burst loss, reordering, duplication, token-bucket throttling, and blackouts over a pure C# localhost UDP/TCP proxy with a runtime F8 QA HUD and zero kernel drivers.",
      "Splits lightweight runtime attributes from the simulation runtime and ships a six-tab UI Toolkit NetQA Workbench with live Painter2D sparklines and combined Markdown, JSON, and .zip QA report exports.",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "Painter2D", "UDP/TCP Proxy", "NGO / Mirror / FishNet"],
  },
  ScriptableDataToolkit: {
    category: "Data Pipeline",
    cardDescription:
      "Unity 6 UI Toolkit workbench for CSV/TSV/XLSX to ScriptableObject import, batch authoring, bulk renaming, C# class generation, and CSV round-trip export.",
    cardTags: ["CSV / XLSX", "Batch Authoring", "UI Toolkit"],
    role: "Tools Programmer & Author",
    engine: "Unity 6 Editor · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "ScriptableObject Data Import, Batch Authoring & Export",
    summary:
      "A zero-dependency Unity 6 Editor UI Toolkit workbench unifying CSV/TSV/XLSX spreadsheet importing, C# ScriptableObject class generation, batch creation/cloning, bulk editing/renaming, and RFC 4180 ScriptableObject-to-CSV round-trip export.",
    highlights: [
      "Parses RFC 4180 CSV/TSV and OpenXML (.xlsx) multi-sheet workbooks in pure C# with GUID-preserving non-destructive updates, attribute mapping ([SpreadsheetColumn], [SpreadsheetId], [SpreadsheetIgnore]), auto-reimport profiles, and C# class generation.",
      "Includes Batch Create and Bulk Edit & Rename tabs with tokenized naming patterns ({type}, {00}, {000}), cloning, Copy-to-All field broadcasting, prefix/suffix/find-replace renaming, and cross-tab handoffs.",
      "Supports ScriptableObject-to-CSV round-trip export respecting spreadsheet attributes, Unity types, collections, and asset references so designers can edit existing project data in spreadsheets and re-import cleanly.",
    ],
    stack: ["Unity 6", "Unity Editor", "UI Toolkit", "C#", "ScriptableObjects", "OpenXML"],
  },
  UtilityAIEngine: {
    category: "Game AI",
    cardDescription:
      "Unity 6 Utility AI runtime engine with parametric response curves, EditMode what-if simulation, and a UI Toolkit workbench debugger.",
    cardTags: ["Utility AI", "Painter2D", "UI Toolkit"],
    role: "Systems and Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Utility AI Runtime Engine, Authoring & Live Debugging",
    summary:
      "A Unity 6 Utility AI runtime engine and UI Toolkit workbench combining parametric response curves, Dave Mark compensated scoring, hysteresis controls, an EditMode What-If Simulator, and a Play Mode Live Runtime Debugger.",
    highlights: [
      "Implements parametric ResponseCurve evaluation (Linear, Polynomial, Logistic, Logit, Step, Invert, and CustomAnimationCurve), Dave Mark compensated product scoring, HighestScore/WeightedTopK/Softmax selection, cooldown gating, inertia bonuses, and minimum commitment locks.",
      "Provides a case-insensitive typed UtilityBlackboard, bounded DecisionRingBuffer, TypeCache-discovered UtilityConsiderationBase and UtilityActionBase extensions, and a Domain Reload-safe UtilityAIAgent registry.",
      "Ships a UI Toolkit Utility AI Workbench (Tools > HaruChanZ64 > AI > UtilityAIEngine > Utility AI Workbench) with GPU-accelerated Painter2D curve previews, an EditMode What-If Simulator with auto-generated Blackboard sliders, and a Play Mode Live Runtime Debugger with pause/step, timeline scrubbing, and JSON/CSV trace export.",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "Painter2D", "Utility AI", "UPM"],
  },
  MelodyRecognitionEngine: {
    category: "Audio DSP",
    cardDescription:
      "Real-time Burst-compiled humming and instrument melody recognition for Unity 6 with YIN pitch tracking, Guided Mode, and a UI Toolkit Workbench.",
    cardTags: ["Burst", "YIN Pitch", "UI Toolkit"],
    role: "Systems and Tools Programmer",
    engine: "Unity 6 · C# · Burst · UI Toolkit · uGUI (UPM)",
    team: "Open-Source Package",
    focus: "Real-Time Audio DSP & Melody Recognition",
    summary:
      "A real-time Burst-compiled humming and acoustic instrument melody recognition engine for Unity 6 unifying microphone pitch tracking and accessible button inputs with unlockable song repertoires, Guided/Learn Mode, a uGUI Musical Staff HUD, and a UI Toolkit Melody Workbench.",
    highlights: [
      "Runs an allocation-free Burst-compiled YIN pitch tracker (PitchDetectionJob / BurstPitchTracker) with cascaded 2nd-order Butterworth bandpass filtering, adaptive noise-floor gating, parabolic sub-sample interpolation, and 2nd-harmonic octave correction.",
      "Provides a unified note segmentation and matching pipeline (NoteSegmenter, MelodyMatcher) supporting Hum, Instrument, and Whistle DSP profiles, key- and octave-invariant relative semitone intervals or strict absolute pitch, Guided/Learn Mode, and JSON-serialized player-recorded custom songs.",
      "Ships a ready-to-use MelodyRecognitionController with BGM ducking hooks, optional uGUI MusicalStaffHUD and ProceduralOcarinaSynth audio feedback, a UI Toolkit Melody Workbench (Live Mic Tuner, Mic/Piano Song Authoring, Dry-Run Simulator), and a CommonEventsEngine integration sample.",
    ],
    stack: ["Unity 6", "C#", "Burst", "Audio DSP", "UI Toolkit", "uGUI", "UPM"],
  },
  GachaEngine: {
    category: "Gacha Systems",
    cardDescription:
      "Configurable gacha banner, soft/hard pity, and Monte Carlo drop-rate simulator for Unity 6 with reveal hooks and JSON pull history.",
    cardTags: ["Pity Math", "Monte Carlo", "UI Toolkit"],
    role: "Systems & Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Gacha Banner, Pity & Simulation Framework",
    summary:
      "A configurable Unity 6 gacha banner, soft/hard pity, and drop-rate simulation framework separating pure C# probability math from Canvas/3D reveal hooks, 1-hour refreshed JSON/CSV pull history, and a UI Toolkit Banner Simulator.",
    highlights: [
      "Supports four banner archetypes (Standard, Limited Rate-Up with cross-banner pityGroupId carry-over, Fate Path guarantees, and Step-Up ladders) with customizable rarity tiers, soft/hard pity thresholds, and featured rate-up odds.",
      "Ships a UI Toolkit Banner Simulator with live pity tuning, x1/x10 test pulls, itemized Banner Details, a 1-hour refreshed Pull History log with JSON/CSV export, and seeded Monte Carlo audits (1,000–100,000 pulls).",
      "Decouples probability math from presentation and persistence via IGachaRng, IPityStore, IGachaCurrencyWallet, IDuplicateResolver, IGachaPoolModifier, and skippable Canvas/3D IGachaRevealSequence cutscene hooks.",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "UPM", "Monte Carlo", "Systems Design"],
  },
  CommonEventsEngine: {
    category: "Event Scripting",
    cardDescription:
      "RPG Maker-inspired Common Events, Switches/Variables, Inventory ledger, and tick-driven command scripting for Unity 6.",
    cardTags: ["State Machine", "UI Toolkit", "uGUI"],
    role: "Systems and Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit · uGUI (UPM)",
    team: "Open-Source Package",
    focus: "Common Events, World State & Command Scripting",
    summary:
      "An RPG Maker-inspired Common Events, global Switches and Variables, Self-Switches, Inventory and Gold ledger, and tick-driven command scripting framework for Unity 6 with built-in uGUI Dialogue Box, Screen Fader, and a UI Toolkit Event Workbench.",
    highlights: [
      "Implements a deterministic tick-driven CommonEventRunner state machine (OnStart, OnTick, OnCancel) with zero per-frame coroutine allocations and Manual, Autorun (with control-lock events), and Parallel trigger modes.",
      "Stores named global Switches, typed Variables (Int, Float, String), per-object Self-Switches (A-D), Gold, and itemized Inventory in WorldStateStore with full JSON snapshot export and import compatible with SaveEncryptionToolkit.",
      "Ships 29 built-in RPG commands (flow control, state, inventory, dialogue, choices, screen fade/flash, camera shake, audio, and scene/signal actions), TypeCache-discovered custom EventCommandBase extensions, swappable uGUI presentation rigs, and a UI Toolkit Event Workbench with an EditMode step debugger.",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "uGUI", "State Machine", "UPM"],
  },
  UnityAuthCore: {
    category: "Auth & REST",
    cardDescription:
      "Backend-agnostic Unity 6 auth and typed REST framework with single-flight 401 refresh, encrypted tokens, and multiplayer handshakes.",
    cardTags: ["REST / JWT", "Multiplayer", "Docker"],
    role: "Systems, Backend, and Tools Programmer",
    engine: "Unity 6 · C# · UI Toolkit · Docker (UPM)",
    team: "Open-Source Package",
    focus: "Authentication, Typed REST & Multiplayer Handshake",
    summary:
      "A backend-agnostic authentication, account lifecycle, and typed REST API framework for Unity 6 separating HTTP transport, pluggable auth adapters, AES-256-CBC/HMAC encrypted token storage, and NGO/Mirror/FishNet connection approval.",
    highlights: [
      "Implements an async ApiHttpClient with middleware interceptors, exponential backoff + jitter retries, live HTTP request tracing, and single-flight 401 token refresh that coalesces concurrent unauthorized calls and replays them with rotated tokens.",
      "Includes HS256 JWT decoding/verification, EncryptedFileTokenStore (AES-256-CBC + HMAC-SHA256 tamper rejection), pluggable IAuthBackendAdapter samples (REST, Mock, Supabase, Firebase), and a Dockerized Node.js 22 OpenAPI 3.0 reference server.",
      "Ships a transport-agnostic MultiplayerAuthBridge for NGO, Mirror, and FishNet connection approval plus a four-tab UI Toolkit Auth & API Console for testing auth flows, JWT claims, concurrent refresh, and handshake tickets.",
    ],
    stack: ["Unity 6", "C#", "UI Toolkit", "REST / JWT", "NGO / Mirror / FishNet", "Docker"],
  },
  GameBalancer: {
    category: "Game Balance",
    cardDescription:
      "UI Toolkit and Painter2D workbench for progression curves, Monte Carlo loot odds, combat TTK matrices, and resource economies.",
    cardTags: ["Monte Carlo", "Painter2D", "UI Toolkit"],
    role: "Tools Programmer & Technical Designer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Game Balancing & Simulation Workbench",
    summary:
      "A Unity 6 runtime and Editor workbench built with UI Toolkit and Painter2D vector charts for progression curve modeling, loot and pity Monte Carlo odds, combat TTK matchup matrices, and faucet/sink economy simulation.",
    highlights: [
      "Models multi-series progression curves (Linear, Polynomial, Exponential, Logarithmic, Sigmoid, Diminishing Returns, AnimationCurve, and custom math formulas) with A/B ratio plots and CSV/JSON exports compatible with ScriptableDataToolkit.",
      "Simulates deterministic-seedable loot tables, soft/hard pity rules, draw-without-replacement batches, and Pseudo-Random Distribution procs, comparing exact theoretical odds against Monte Carlo runs (P50–P99 and worst-case pulls).",
      "Runs round-robin combat TTK and win-rate matchup matrices, multi-day faucet/sink economy flow audits with inflation/starvation alerts, and TypeCache-discovered custom IGameBalancerModule UI Toolkit tabs.",
    ],
    stack: ["Unity 6", "UI Toolkit", "C#", "UPM", "Monte Carlo", "Painter2D"],
  },
  CharacterMotor: {
    category: "Locomotion",
    cardDescription:
      "Modular Unity 6 character controller supporting CharacterController, Rigidbody, and Rigidbody2D via swappable movement modules.",
    cardTags: ["2D & 3D Physics", "Input System", "UI Toolkit"],
    role: "Gameplay & Systems Programmer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Modular Character Controller Framework",
    summary:
      "A barebones Unity 6 character controller framework providing minimal locomotion contracts and three swappable physics backends (3D CharacterController, 3D Rigidbody, and 2D Rigidbody2D) with pluggable movement modules and UI Toolkit debugging.",
    highlights: [
      "Runs a minimal MotorPipeline with ordered IMotorModule hooks (BeforeVelocitySolve, ModifyVelocity, AfterMove) around acceleration, deceleration, grounded jump, gravity, and impulses so genre mechanics like dashing, coyote time, or crouching stay modular.",
      "Ships three ICharacterMotor backends (CharacterControllerMotor3D, RigidbodyMotor3D using FixedUpdate and linearVelocity, and RigidbodyMotor2D in Platformer or TopDown mode) with camera-agnostic IMovementReferenceFrame projection and decoupled ICharacterInputSource bindings.",
      "Includes a UI Toolkit custom inspector, a Play Mode MotorDebuggerWindow with live module toggles, GameObject rig creation menus, and optional New Input System integration via versionDefines.",
    ],
    stack: ["Unity 6", "C#", "UPM", "UI Toolkit", "3D & 2D Physics", "Input System"],
  },
  PlayablesAnimatorController: {
    category: "Animation",
    cardDescription:
      "Code-driven 2D and 3D animation controller on the Playables API with priority locks, masked layers, and no AnimatorController graphs.",
    cardTags: ["Playables API", "2D & 3D", "UI Toolkit"],
    role: "Gameplay & Systems Programmer",
    engine: "Unity 6 · C# · Playables API (UPM)",
    team: "Open-Source Package",
    focus: "Code-Driven 2D & 3D Animation System",
    summary:
      "A code-driven 2D and 3D animation controller for Unity 6 built on the Playables API that drives Sprite AnimationClips and 3D skeletal rigs directly from C# without AnimatorController state graphs.",
    highlights: [
      "Drives PlayableGraph, AnimationLayerMixerPlayable, and per-layer AnimationMixerPlayable directly in C#, supporting instant 2D sprite switching, smooth 3D cross-fades, and masked/additive AvatarMask layers.",
      "Supports priority locks to prevent lower-priority locomotion from interrupting attacks/hitstun, normalized [0..1] AnimClipEvent callbacks, and an optional code-driven AnimStateMachine with IAnimTransitionRule predicates.",
      "Includes a UI Toolkit CustomAnimInspector and AnimDebuggerWindow displaying live per-layer progress bars, blend weights, clip history, and manual test playback.",
    ],
    stack: ["Unity 6", "C#", "Playables API", "UI Toolkit", "UPM", "2D & 3D Animation"],
  },
  AssetImportRules: {
    category: "Asset Pipeline",
    cardDescription:
      "Rule-driven Unity 6 Editor pipeline and UI Toolkit compliance workbench for auditing Sprite, Texture, 3D Model, and Audio imports.",
    cardTags: ["AssetPostprocessor", "UI Toolkit", "CI Audit"],
    role: "Tools Programmer & Author",
    engine: "Unity 6 Editor · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Asset Import Policy & Audit Pipeline",
    summary:
      "A rule-driven Unity 6 Editor pipeline and UI Toolkit compliance workbench for Sprites, UI textures, general textures, 3D Models, and Audio clips, enforcing rules via AssetPostprocessor and non-destructive dry-run diffs.",
    highlights: [
      "Enforces opted-in Texture/Sprite/UI, 3D Model, and Audio importer settings via non-destructive RuleOverride<T> fields and per-platform overrides (Android, iPhone, Standalone) without clobbering artist choices.",
      "Matches assets using AssetPathMatcher (folder prefixes, glob patterns, extensions, global ignores, and ImportRulesIgnore asset labels) with TypeCache-discovered custom IAssetImportRule extensions.",
      "Ships a UI Toolkit Import Policy Workbench with starter presets, dry-run Current -> Expected compliance diffs, batch re-import fixes, Markdown/JSON CI reports, and an optional ImportAuditBuildGuard.",
    ],
    stack: ["Unity 6", "Unity Editor", "UI Toolkit", "C#", "UPM", "AssetPostprocessor"],
  },
  UnityEventAuditor: {
    category: "Editor Audit",
    cardDescription:
      "Unity 6 Editor scanner for locating, validating, reporting, and cleaning up broken or unused UnityEvent listeners across scenes, prefabs, and ScriptableObjects.",
    cardTags: ["SerializedProperty", "CSV / JSON", "Unity Editor"],
    role: "Tools Programmer & Author",
    engine: "Unity 6 Editor · C# (UPM)",
    team: "Open-Source Package",
    focus: "Scene, Prefab & ScriptableObject Event Auditor",
    summary:
      "A Unity 6 Editor auditing tool that traverses serialized UnityEvent fields across scenes, prefabs, and ScriptableObjects, validates bound methods via reflection, exports CSV/JSON reports, and cleans up broken listeners with Undo support.",
    highlights: [
      "Traverses top-level and nested serialized UnityEvent fields (inside structs, classes, arrays, and lists) across loaded scenes, Prefab Stages, project prefabs, and ScriptableObject assets.",
      "Detects missing targets, unset methods, and renamed or signature-incompatible callbacks via reflection, with All/Valid/Broken/Empty filtering and a live summary banner.",
      "Supports per-event and bulk Fix All Broken cleanup with Undo grouping plus CSV/JSON audit report exports via UnityEventAuditExporter.",
    ],
    stack: ["Unity 6", "Unity Editor", "C#", "UPM", "SerializedProperty"],
  },
  SaveEncryptionToolkit: {
    category: "Save Security",
    cardDescription:
      "Unity save security toolkit with authenticated AES + HMAC-SHA256 envelopes, atomic backup storage, obfuscated keys, and pluggable handlers.",
    cardTags: ["AES + HMAC", "Atomic Backup", "Serialization"],
    role: "Systems & Tools Programmer",
    engine: "Unity 6 · C# (UPM)",
    team: "Open-Source Package",
    focus: "Authenticated Save Encryption & Storage",
    summary:
      "A modular Unity 6 save encryption and storage toolkit providing authenticated AES-CBC + HMAC-SHA256 envelopes, atomic temp-file writes with automatic .bak fallback recovery, compile-time obfuscated keys, and pluggable serialization handlers.",
    highlights: [
      "Provides Encrypt-then-MAC authenticated envelopes (fresh random 128-bit IV per write + constant-time HMAC-SHA256 verification) alongside legacy static-IV compatibility and obfuscated ProductionKeyStore.cs generation.",
      "Ships EncryptedSaveStore combining any ISaveHandler with atomic .tmp writes and automatic .bak fallback recovery when primary save files are corrupted or tampered with.",
      "Includes JsonSaveHandler, legacy BinarySaveHandler, key-health status indicators, and one-click round-trip key verification in the EncryptionSettings Inspector.",
    ],
    stack: ["Unity 6", "C#", "UPM", "AES + HMAC", "Serialization", "Custom Inspector"],
  },
};

const RESUME_TOOL_HIGHLIGHTS = {
  DevQAToolkit: [
    "Built a zero-dependency Unity 6 quality assurance bug reporter and developer debug console combining ring-buffered logs, input breadcrumbs, performance metrics, screenshots, and console history into portable ZIP bundles and webhook transports.",
    "Implemented quoted command tokenization, typed and attribute-discovered commands, automatic release-build command stripping, optional Input System bridging, and a three-tab UI Toolkit DevQA Workbench.",
  ],
  NetQAToolkit: [
    "Built a netcode-agnostic Unity 6 multiplayer quality assurance workbench combining 9 static scene and prefab audit rules (NGO, Mirror, and FishNet), Hierarchy badges, and a pre-build error guard.",
    "Integrated a pure C# localhost UDP and TCP impairment proxy, live Painter2D bandwidth and latency inspector, Chaos Timeline runner, and combined Markdown, JSON, and ZIP quality assurance report exports.",
  ],
  ScriptableDataToolkit: [
    "Built a zero-dependency Unity 6 UI Toolkit data workbench unifying RFC 4180 CSV, TSV, and OpenXML (.xlsx) spreadsheet importing with GUID-safe updates, C# class generation, and ScriptableObject-to-CSV round-trip export.",
    "Added batch creation, cloning, Copy-to-All field broadcasting, tokenized naming patterns, and bulk in-place editing and renaming inside one Editor workflow.",
  ],
  UtilityAIEngine: [
    "Built a Unity 6 Utility AI runtime engine with parametric response curves, Dave Mark compensated scoring, cooldown gating, commitment locks, inertia hysteresis, and a typed runtime blackboard.",
    "Created a UI Toolkit Utility AI Workbench with Painter2D curve previews, an EditMode What-If Simulator, and a Play Mode Live Runtime Debugger with decision timeline scrubbing and JSON/CSV trace export.",
  ],
  MelodyRecognitionEngine: [
    "Built a real-time Unity 6 humming and acoustic instrument melody recognition package powered by an allocation-free Burst-compiled YIN pitch tracker with Butterworth bandpass filtering, adaptive noise-floor gating, and octave correction.",
    "Engineered a unified note segmentation and melody matching pipeline supporting microphone and accessible button inputs, Guided and Learn Mode, player-recorded custom songs, a uGUI Musical Staff heads-up display, and a UI Toolkit Melody Workbench.",
  ],
  CommonEventsEngine: [
    "Built an RPG Maker-inspired Unity 6 event scripting framework with a deterministic tick-driven state machine (Manual, Autorun, and Parallel triggers), 29 built-in commands, and TypeCache-discovered custom commands.",
    "Implemented a JSON-serializable WorldStateStore for global switches, typed variables, self-switches, gold, and inventory alongside swappable uGUI dialogue and transition components and a UI Toolkit Event Workbench with a live step debugger.",
  ],
  UnityAuthCore: [
    "Architected a backend-agnostic Unity 6 authentication and typed REST API framework featuring single-flight HTTP 401 token refresh, exponential backoff retries, and AES-256-CBC with HMAC-SHA256 encrypted token storage.",
    "Built pluggable authentication adapters (REST, Supabase, Firebase, and Mock), a multiplayer handshake bridge for Netcode for GameObjects (NGO), Mirror, and FishNet, a Dockerized OpenAPI 3.0 reference server, and a UI Toolkit testing console.",
  ],
  GachaEngine: [
    "Built a configurable Unity 6 gacha banner and soft and hard pity framework supporting Standard, Limited Rate-Up, Fate Path, and Step-Up archetypes with pure C# probability contracts and Canvas or 3D reveal hooks.",
    "Created a UI Toolkit Banner Simulator with live pity tuning, JSON and CSV pull history exports, and deterministic Monte Carlo drop-rate audits from 1,000 to 100,000 pulls.",
  ],
  AssetImportRules: [
    "Engineered a rule-driven Unity 6 Editor AssetPostprocessor pipeline enforcing non-destructive import policies across Texture, Sprite, User Interface, 3D Model, and Audio assets with per-platform overrides.",
    "Built a UI Toolkit Import Policy Workbench with dry-run compliance diffs, batch re-import fixes, Markdown and JSON continuous integration (CI) reports, and an optional pre-build compliance guard.",
  ],
  PlayablesAnimatorController: [
    "Engineered a code-driven 2D and 3D Unity 6 animation controller on the Playables API that eliminates AnimatorController state graphs while supporting masked AvatarMask layers, priority locks, and normalized clip events.",
    "Built a code-driven animation state machine and UI Toolkit debugging window displaying live per-layer progress bars, blend weights, clip history, and manual test playback.",
  ],
  CharacterMotor: [
    "Built a modular Unity 6 character controller package supporting swappable 3D CharacterController, 3D Rigidbody, and 2D Rigidbody2D physics backends with ordered movement module hooks.",
    "Added a UI Toolkit custom inspector, a Play Mode debugger window with live module toggles, rig creation menus, and optional Unity Input System integration.",
  ],
  GameBalancer: [
    "Engineered a Unity 6 UI Toolkit and Painter2D balancing workbench for multi-series progression curve modeling, Monte Carlo loot and pity simulations, combat time-to-kill matchup matrices, and economy flow audits.",
    "Added CSV and JSON data exports alongside TypeCache-discovered custom editor modules so designers can iterate on game balance without leaving Unity.",
  ],
  UnityEventAuditor: [
    "Built a Unity 6 Editor auditing tool that scans scenes and prefabs for serialized UnityEvent listeners and displays them in a searchable, icon-backed hierarchy tree.",
    "Added filtering for valid and broken bindings, multi-select inspection, and cleanup controls to remove missing references before quality assurance or production builds.",
  ],
  SaveEncryptionToolkit: [
    "Built a modular Unity save encryption and serialization package providing AES protection with compile-time obfuscated key storage and pluggable JSON and Binary format handlers.",
    "Included a custom ScriptableObject Inspector workflow for one-click key generation and clean integration into project save managers.",
  ],
};

const RESUME_FEATURED_GAME_PROJECT = {
  name: "Trash Frenzy (Unity 2D, Universal Render Pipeline, C#, Android)",
  role: "Project Manager, Game Designer, Gameplay Programmer, and Quality Assurance",
  bullets: [
    "Led a 4-person capstone team to design and build an educational Android 2D action side-scroller rated 4.70 out of 5.0 across 75 user and information technology expert evaluators under the ISO/IEC 25010 quality standard.",
    "Implemented a Universal Render Pipeline (URP) toxin-driven lighting and post-processing system, coroutine-based boss artificial intelligence tuned with ScriptableObjects, and a persistent cross-scene waste sorting inventory pipeline.",
  ],
};

function formatResumeProjectName(repo, curated) {
  if (curated?.engine) {
    const cleanEngine = curated.engine
      .replace(/\s*\(UPM\)/g, "")
      .replace(/\s*·\s*/g, ", ")
      .trim();
    return `${repo.name} (${cleanEngine})`;
  }
  if (repo.language && repo.language !== "N/A") {
    return `${repo.name} (${repo.language})`;
  }
  return repo.name;
}

function formatResumeProjectRole(role) {
  if (!role) return "Creator and Developer";
  return role
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s*&\s*/g, " and ")
    .trim();
}

/**
 * Build the Selected Projects list for the ATS resume:
 * the latest 3 GitHub projects (live-fetched when provided, otherwise top 3 `PINNED_REPOS`)
 * followed by the featured shipped game project (`Trash Frenzy`).
 * @param {Array<{ name: string, description?: string, language?: string }> | null} [githubRepos=null]
 * @param {{ maxGithubProjects?: number }} [options]
 */
export function buildResumeSelectedProjects(githubRepos = null, { maxGithubProjects = 3 } = {}) {
  const sourceRepos =
    Array.isArray(githubRepos) && githubRepos.length > 0
      ? githubRepos.slice(0, maxGithubProjects)
      : PINNED_REPOS.slice(0, maxGithubProjects).map((name) => ({
          name,
          description: "",
          language: "C#",
        }));

  const githubEntries = sourceRepos.map((repo) => {
    const curated = TOOL_PROJECT_DETAILS[repo.name] || null;
    const curatedHighlights = RESUME_TOOL_HIGHLIGHTS[repo.name];
    const fallbackBullet = curated?.summary || repo.description || "";
    const bullets = Array.isArray(curatedHighlights)
      ? [...curatedHighlights]
      : fallbackBullet
        ? [fallbackBullet]
        : [];
    return {
      name: formatResumeProjectName(repo, curated),
      role: formatResumeProjectRole(curated?.role),
      bullets,
    };
  });

  return [
    ...githubEntries,
    {
      ...RESUME_FEATURED_GAME_PROJECT,
      bullets: [...RESUME_FEATURED_GAME_PROJECT.bullets],
    },
  ];
}

/**
 * Default Selected Projects rendered in the ATS Resume when no live GitHub list is supplied.
 */
export const RESUME_SELECTED_PROJECTS = buildResumeSelectedProjects();

/**
 * Extract the itch.io slug from a project URL.
 * @param {string} url
 * @returns {string}
 */
export function getItchSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolve curated breakdown metadata for an itch.io game project.
 * @param {{ title?: string, url?: string, description?: string, image?: string, tags?: string[], platforms?: string[] }} project
 */
export function resolveGameDetails(project) {
  const slug = getItchSlug(project.url || "");
  const curated = GAME_PROJECT_DETAILS[slug] || {};
  const fallbackStack = [...(project.tags || []), ...(project.platforms || [])].filter(Boolean);

  return {
    id: slug || project.title || "game",
    kind: "game",
    title: project.title || "",
    url: project.url || "",
    image: project.image || "",
    role: curated.role || "Gameplay Programmer & Game Designer",
    engine: curated.engine || "Unity · C#",
    team: curated.team || "",
    focus: curated.focus || project.tags?.[0] || "Game Project",
    summary: curated.summary || project.description || "",
    highlights: curated.highlights || [],
    stack: curated.stack || fallbackStack,
    caseStudyUrl: curated.caseStudyUrl || "",
  };
}

/**
 * Resolve curated breakdown metadata for a GitHub Unity tool repository.
 * @param {{ name?: string, html_url?: string, description?: string, language?: string }} repo
 */
export function resolveToolDetails(repo) {
  const curated = TOOL_PROJECT_DETAILS[repo.name] || {};
  const fallbackStack = Array.from(
    new Set([repo.language, "Unity", ...(Array.isArray(repo.topics) ? repo.topics : [])]),
  ).filter(Boolean);
  const stack = curated.stack || fallbackStack;
  const cardTags =
    Array.isArray(curated.cardTags) && curated.cardTags.length > 0
      ? curated.cardTags
      : stack.filter((tag) => !/^(Unity|Unity 6|C#|UPM)$/i.test(tag)).slice(0, 3);

  return {
    id: repo.name || "tool",
    kind: "tool",
    title: repo.name || "",
    url: repo.html_url || "",
    image: "",
    category:
      curated.category || (repo.language && repo.language !== "N/A" ? repo.language : "Unity Tool"),
    releasedAt: resolveRepoReleaseDate(repo),
    role: curated.role || "Tools Programmer",
    engine: curated.engine || (repo.language ? `Unity · ${repo.language}` : "Unity"),
    team: curated.team || "Open-Source Package",
    focus: curated.focus || "Unity Tooling",
    cardDescription: curated.cardDescription || repo.description || curated.summary || "",
    summary: curated.summary || repo.description || "",
    highlights: curated.highlights || [],
    stack,
    cardTags,
    caseStudyUrl: "",
  };
}
