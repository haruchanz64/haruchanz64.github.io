/**
 * Sync-safe curated metadata for game projects and Unity toolkits.
 * Keeps breakdown details, roles, and case-study links intact even when
 * `scripts/sync-itch.mjs` or `scripts/sync-github.mjs` regenerates JSON feeds.
 */

export const GAME_PROJECT_DETAILS = {
  trashfrenzy: {
    role: "Project Manager · Game Designer · Gameplay Programmer · QA",
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
  CharacterMotor: {
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
  GameBalancer: {
    role: "Tools Programmer & Technical Designer",
    engine: "Unity 6 · C# · UI Toolkit (UPM)",
    team: "Open-Source Package",
    focus: "Game Balancing & Simulation Workbench",
    summary:
      "A Unity 6 runtime and Editor workbench built with UI Toolkit and Painter2D vector charts for progression curve modeling, loot and pity Monte Carlo odds, combat TTK matchup matrices, and faucet/sink economy simulation.",
    highlights: [
      "Models multi-series progression curves (Linear, Polynomial, Exponential, Logarithmic, Sigmoid, Diminishing Returns, AnimationCurve, and custom math formulas) with A/B ratio plots and CSV/JSON exports compatible with SpreadsheetToScriptableObjects.",
      "Simulates deterministic-seedable loot tables, soft/hard pity rules, draw-without-replacement batches, and Pseudo-Random Distribution procs, comparing exact theoretical odds against Monte Carlo runs (P50–P99 and worst-case pulls).",
      "Runs round-robin combat TTK and win-rate matchup matrices, multi-day faucet/sink economy flow audits with inflation/starvation alerts, and TypeCache-discovered custom IGameBalancerModule UI Toolkit tabs.",
    ],
    stack: ["Unity 6", "UI Toolkit", "C#", "UPM", "Monte Carlo", "Painter2D"],
  },
  NetAuditToolkit: {
    role: "Tools Programmer & Author",
    engine: "Unity 6 Editor · C# (UPM)",
    team: "Open-Source Package",
    focus: "Multiplayer Scene & Prefab Auditor",
    summary:
      "A netcode-agnostic Unity 6 Editor static analyzer and hierarchy badge overlay for NGO, Mirror, FishNet, and custom multiplayer components that catches scene and prefab misconfigurations before runtime.",
    highlights: [
      "Ships 9 built-in audit rules (NA001–NA009) detecting orphaned NetworkBehaviours, nested NetworkObjects, unregistered NetworkPrefabs, bandwidth-heavy NetworkTransforms, RPC security/signature issues, MPPM mutable static state, and broken UnityEvents.",
      "Classifies NGO, Mirror, FishNet, and [NetAuditTracked] components via reflection and SerializedObject without requiring hard assembly references, surfacing results in a split-pane Editor auditor (with Readiness Score and 1-click Quick Fixes) and Hierarchy badges.",
      "Supports TypeCache-discovered custom INetAuditRule extensions, [NetAuditIgnore] suppressions, Markdown/JSON CI report exports, and an optional pre-build guard that fails builds on Error-severity issues.",
    ],
    stack: ["Unity 6", "Unity Editor", "C#", "UPM", "Static Analysis", "NGO / Mirror / FishNet"],
  },
  NetSimToolkit: {
    role: "Systems & Tools Programmer",
    engine: "Unity 6 · C# (UPM)",
    team: "Open-Source Package",
    focus: "Network Simulator & Bandwidth Profiler",
    summary:
      "A netcode-agnostic Unity 6 network condition simulator, localhost UDP/TCP impairment proxy, live bandwidth profiler, chaos timeline runner, and QA repro exporter compatible with NGO, Mirror, FishNet, and raw sockets.",
    highlights: [
      "Implements a pure C# localhost UDP/TCP impairment proxy simulating latency, Uniform/Normal/Spiky jitter, random and Gilbert-Elliott burst packet loss, reordering, duplication, token-bucket bandwidth caps, asymmetric latency, and blackouts without OS admin rights or kernel drivers.",
      "Provides an Editor Network Simulator window and F8 Runtime QA HUD with built-in network presets, live outbound/inbound KB/s graphs, budget threshold alerts, MTU warnings, per-channel telemetry, and a visual Chaos Timeline runner.",
      "Exports session summaries and timelines to JSON, CSV, Markdown, or .zip repro bundles, with NetSimContextSnapshot hooks ready for BugReportToolkit's IBugContextProvider.",
    ],
    stack: ["Unity 6", "C#", "UPM", "UDP/TCP Proxy", "Bandwidth Profiler", "QA Tooling"],
  },
  BugReportToolkit: {
    role: "Tools Programmer & Author",
    engine: "Unity · C# (UPM)",
    team: "Open-Source Package",
    focus: "QA & Repro Capture Pipeline",
    summary:
      "An in-game Unity runtime bug reporter and repro capture package for QA, playtesters, and developers. Triggered via hotkey (F9) or API to capture screenshots, logs, input breadcrumbs, performance metrics, and scene state into portable .zip bundles or webhooks.",
    highlights: [
      "Built always-on ring buffers for thread-safe console logs, timestamped input breadcrumbs, FPS/GC/memory profiling, and scene hierarchy snapshots with an extensible IBugContextProvider hook.",
      "Designed a pre-overlay screenshot capture flow and pluggable IBugReportTransport pipeline supporting Local ZIP, Discord/custom webhooks, GitHub Issues, and Trello cards.",
      "Created an in-Editor Report Viewer (Tools > Bug Reporter > Report Viewer) to inspect screenshots, filter logs, review input timelines, and copy Markdown bug reports in one click.",
    ],
    stack: ["Unity", "C#", "UPM", "Unity.Profiling", "Input System", "REST Webhooks"],
  },
  SpreadsheetToScriptableObjects: {
    role: "Tools Programmer & Author",
    engine: "Unity Editor · C# (UPM)",
    team: "Open-Source Package",
    focus: "Designer Data & Balancing Pipeline",
    summary:
      "A Unity Editor package that converts .csv, .tsv, and .xlsx spreadsheets directly into ScriptableObject assets so designers can author and tune game data in spreadsheets without manual asset entry.",
    highlights: [
      "Implemented pure C# RFC 4180 CSV/TSV and OpenXML (.xlsx) multi-sheet parsers using System.IO.Compression and System.Xml.Linq with zero external DLLs.",
      "Built two designer workflows: attribute-assisted mapping to existing ScriptableObjects ([SpreadsheetColumn], [SpreadsheetId]) and automatic C# ScriptableObject class generation.",
      "Preserves Unity asset GUIDs via non-destructive re-imports, supports Unity types, collections, and Object references, and saves reusable SpreadsheetImportProfile assets with auto-reimport on save.",
    ],
    stack: ["Unity Editor", "C#", "UPM", "ScriptableObjects", "OpenXML", "CSV/XLSX"],
  },
  UnityEventToolkit: {
    role: "Tools Programmer & Author",
    engine: "Unity 6 Editor · C#",
    team: "Open-Source Package",
    focus: "Scene & Event Auditing Tool",
    summary:
      "A Unity 6 Editor tool for scanning, filtering, and cleaning up UnityEvent bindings across scenes and prefabs to catch broken listeners before they reach QA or production.",
    highlights: [
      "Scans scenes for all serialized UnityEvent fields and presents GameObjects in a collapsible, icon-backed hierarchy tree with parent auto-expansion on search.",
      "Filters listeners by All, Valid, or Broken states and supports Shift multi-select plus Hierarchy auto-ping for fast scene debugging.",
      "Includes an Event Inspector Panel to audit listener targets and remove missing or broken bindings cleanly.",
    ],
    stack: ["Unity 6", "Unity Editor", "C#", "UPM", "SerializedProperty"],
  },
  SaveEncryptionToolkit: {
    role: "Systems & Tools Programmer",
    engine: "Unity · C# (UPM)",
    team: "Open-Source Package",
    focus: "Save Serialization & Encryption",
    summary:
      "A modular Unity save encryption and serialization toolkit providing AES protection and pluggable format handlers designed to slot cleanly into any project's save manager.",
    highlights: [
      "Implements AES encryption with dynamically generated, obfuscated keys and IVs embedded directly into compiled code (ProductionKeyStore.cs) so key assets are never exposed in builds.",
      "Provides out-of-the-box JSON and Binary handlers behind an extensible serialization interface for custom formats.",
      "Includes a custom ScriptableObject Inspector workflow for one-click key generation and build-ready setup.",
    ],
    stack: ["Unity", "C#", "UPM", "AES Encryption", "Serialization", "Custom Inspector"],
  },
  ScriptableBatchTool: {
    role: "Tools Programmer & Author",
    engine: "Unity Editor · C# (UPM)",
    team: "Open-Source Package",
    focus: "ScriptableObject Authoring Workflow",
    summary:
      "A Unity Editor Window designed to batch-create, configure, and export multiple ScriptableObject instances in one place instead of duplicating assets manually.",
    highlights: [
      "Dynamically targets any concrete ScriptableObject-derived script and exposes editable fields across a scrollable batch workspace.",
      "Prevents filename collisions with automatic unique, sanitized asset naming and configurable output folders under Assets/.",
      "Packaged with an Editor-only assembly definition so tooling never bloats player builds.",
    ],
    stack: ["Unity Editor", "C#", "UPM", "ScriptableObjects", "EditorWindow"],
  },
  DebugCommandSystem: {
    role: "Systems & Tools Programmer",
    engine: "Unity · C# (UPM)",
    team: "Open-Source Package",
    focus: "Runtime Debug Console",
    summary:
      "An extendable in-game Unity debug console integrated with the New Input System, featuring typed variadic commands, Tab auto-completion, and live command suggestions.",
    highlights: [
      "Built an extensible IDebugCommandProvider architecture supporting fixed and dynamic commands with arbitrary parameter counts (params string[]).",
      "Integrated Unity's New Input System for hotkey toggling (F1), Enter execution, Tab auto-completion, and scrollable in-game command help.",
      "Designed drop-in DebugController prefab setup so programmers and designers can wire cheat/testing commands quickly during playtesting.",
    ],
    stack: ["Unity", "C#", "UPM", "New Input System", "Runtime Tooling"],
  },
};

/**
 * Curated projects rendered in the ATS Resume (PDF, HTML, and plain text).
 * Kept concise so studio recruiters immediately see gameplay systems, technical design,
 * and Unity tooling proof alongside experience.
 */
export const RESUME_SELECTED_PROJECTS = [
  {
    name: "Trash Frenzy (Unity 2D · C#)",
    role: "Project Manager, Game Designer, Gameplay Programmer & QA",
    url: "https://haruchanz64.itch.io/trashfrenzy",
    bullets: [
      "Built an educational Android action side-scroller rated 4.70/5 by 75 evaluators (ISO/IEC 25010), featuring URP toxin-driven lighting, ScriptableObject-tuned boss AI, and a persistent cross-scene trash sorting pipeline.",
    ],
  },
  {
    name: "SpreadsheetToScriptableObjects (Unity Editor · C#)",
    role: "Tools Programmer",
    url: "https://github.com/haruchanz64/SpreadsheetToScriptableObjects",
    bullets: [
      "Engineered a Unity UPM tool with pure C# CSV/TSV and OpenXML (.xlsx) parsers, GUID-safe non-destructive re-imports, and reusable import profiles for data-driven game balancing.",
    ],
  },
  {
    name: "BugReportToolkit (Unity Runtime & Editor · C#)",
    role: "Tools Programmer",
    url: "https://github.com/haruchanz64/BugReportToolkit",
    bullets: [
      "Built a Unity in-game bug reporter capturing ring-buffered logs, input breadcrumbs, FPS/memory snapshots, and screenshots into ZIP bundles or Discord/GitHub/Trello webhooks with an Editor viewer.",
    ],
  },
  {
    name: "DebugCommandSystem (Unity Runtime · C#)",
    role: "Systems & Tools Programmer",
    url: "https://github.com/haruchanz64/DebugCommandSystem",
    bullets: [
      "Created an extendable runtime debug console integrated with Unity's New Input System, supporting typed commands, Tab auto-completion, and live suggestions for faster gameplay testing.",
    ],
  },
];

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
  const fallbackStack = [repo.language, "Unity"].filter(Boolean);

  return {
    id: repo.name || "tool",
    kind: "tool",
    title: repo.name || "",
    url: repo.html_url || "",
    image: "",
    role: curated.role || "Tools Programmer",
    engine: curated.engine || (repo.language ? `Unity · ${repo.language}` : "Unity"),
    team: curated.team || "Open-Source Package",
    focus: curated.focus || "Unity Tooling",
    summary: curated.summary || repo.description || "",
    highlights: curated.highlights || [],
    stack: curated.stack || fallbackStack,
    caseStudyUrl: "",
  };
}
