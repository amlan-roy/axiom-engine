# axiom-engine

A game-agnostic, config-driven state engine for strategy games, life simulators, and event-driven simulations.

The engine contains no game-specific knowledge. All rules, events, and content are defined through a declarative `GameConfig` object. Swap the config and you get an entirely different game — on the same infrastructure.

```
GameConfig (your game)  +  Engine (generic)  =  A playable game
```

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [GameConfig Reference](#gameconfig-reference)
5. [Engine API](#engine-api)
6. [Architecture](#architecture)
7. [Tick Phase System](#tick-phase-system)
8. [Restrictions vs Conditions](#restrictions-vs-conditions)
9. [Probability Pipeline](#probability-pipeline)
10. [Undo System](#undo-system)
11. [Custom Phases](#custom-phases)
12. [Development](#development)
13. [Releasing](#releasing)

---

## Installation

```bash
npm install axiom-engine
```

Exports an ES module (`.js`) and an IIFE bundle (`.iife.js`) for direct browser use. Full TypeScript typings included.

---

## Quick Start

```ts
import { createEngine } from "axiom-engine";
import type { GameConfig } from "axiom-engine";

const config: GameConfig = {
  initialState: () => ({ health: 80, money: 500, age: 18 }),

  attributes: {
    health: { min: 0, max: 100, default: 75 },
    money: { min: 0, max: 99999, default: 0 },
    age: { min: 0, max: 120, default: 0 },
  },

  passiveModifiers: [
    { id: "aging", delta: { age: 1 } },
    { id: "expenses", delta: { money: -50 } },
  ],

  actions: [
    {
      id: "work",
      label: "Go to work",
      text: "You worked a full day.",
      effects: [() => ({ money: 150 })],
    },
    {
      id: "see_doctor",
      label: "See the doctor",
      text: "The doctor patches you up.",
      effects: [() => ({ health: 20, money: -100 })],
      conditions: [s => (s.money as number) >= 100],
    },
  ],

  events: [
    {
      id: "flu",
      triggerType: "random",
      text: "You caught the flu.",
      baseProbability: 0.15,
      cooldown: 5,
      effects: [() => ({ health: -10 })],
    },
    {
      id: "birthday",
      triggerType: "milestone",
      text: s => `Happy birthday! You are now ${String(s.age)}.`,
      conditions: [s => (s.age as number) % 10 === 0 && (s.age as number) > 0],
      cooldown: 10,
      effects: [() => ({ health: 5 })],
    },
  ],

  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [
    "passiveModifierPhase",
    "randomEventPhase",
    "milestoneEventPhase",
  ],
};

const engine = createEngine(config);

// Advance one year
engine.tick();

// Player takes an action
engine.applyAction("work");

// Read state
const { health, money, age, history } = engine.getState();

// Show available actions in the UI
const actions = engine.getAvailableActions();
actions.forEach(a => console.log(`[${a.id}] ${a.label}`));

// Undo the last step
engine.undo();
```

---

## Core Concepts

### State

The game state is a single flat, serialisable object. The engine owns four fields:

| Field       | Type                      | Purpose                                     |
| ----------- | ------------------------- | ------------------------------------------- |
| `tick`      | `number`                  | How many ticks have elapsed                 |
| `history`   | `HistoryEntry[]`          | Append-only log of everything that happened |
| `cooldowns` | `Record<string, number>`  | Event cooldown expiry ticks                 |
| `meta`      | `Record<string, unknown>` | Engine-level bookkeeping slot               |

Everything else — `health`, `money`, `job`, `relationships`, etc. — is game-specific and comes from `initialState`.

Because the state is plain JSON, save/load is as simple as `JSON.stringify(engine.getState())`.

### StateDelta — additive for attributes

Effects and passive modifiers return a `StateDelta`. For keys listed in `GameConfig.attributes`, values are **additive**: `{ health: -10 }` means "subtract 10 from current health", not "set health to 10". The result is clamped to the attribute's `[min, max]` range. All other keys are directly assigned.

### Separation guarantee

The engine never imports from game implementations. Games are consumers of the engine, not extensions of it. This allows the same engine to power many different games without modification.

---

## GameConfig Reference

### `initialState: () => Record<string, unknown>`

Returns the starting values for game-specific fields. Omit engine fields (`tick`, `history`, `cooldowns`, `meta`) — the engine adds those automatically. Attribute values are clamped to their bounds; omitted attributes use their `default`.

```ts
initialState: () => ({ health: 80, money: 500, job: "unemployed" });
```

### `attributes: Record<string, AttributeDef>`

Declares numeric dimensions that the engine tracks and clamps.

```ts
attributes: {
  health:    { min: 0, max: 100, default: 75 },
  happiness: { min: 0, max: 100, default: 50 },
  money:     { min: 0, max: 99999, default: 0 },
}
```

Any key in a `StateDelta` that matches an attribute name is applied additively and clamped. Keys not in `attributes` are directly assigned.

### `passiveModifiers: PassiveModifierDef[]`

Automatic per-tick state changes. Applied in declaration order during `passiveModifierPhase`. Each modifier sees the state as updated by all prior modifiers in the same tick. They are **silent** — no history entries are created.

```ts
passiveModifiers: [
  // Unconditional: age by 1 each tick
  { id: "aging", delta: { age: 1 } },

  // Conditional: accelerate aging when stressed
  {
    id: "stress_aging",
    condition: s => (s.stress as number) > 80,
    delta: { age: 1 },
  },

  // Function delta: healing rate depends on current health
  {
    id: "regen",
    delta: s => ({ health: (s.health as number) < 30 ? 3 : 1 }),
  },
];
```

### `actions: ActionDef[]`

Player-triggered interactions. Surfaced by `getAvailableActions()` and applied via `applyAction(id)`.

```ts
actions: [
  {
    id: "exercise",
    label: "Go for a run",
    text: "You went for a run.",
    effects: [() => ({ health: 5, happiness: 2 })],
  },
  {
    id: "buy_house",
    label: "Buy a house",
    text: "You bought a house.",
    effects: [() => ({ money: -50000, housing: "owned" })],
    conditions: [s => (s.money as number) >= 50000],
    restrictions: [s => (s.age as number) < 18], // must be adult
  },
];
```

### `events: EventDef[]`

Events that fire during ticks. Set `triggerType` to distinguish random from milestone events.

**Random events** (`triggerType: "random"` or omitted) are evaluated every tick via the probability pipeline. Use `baseProbability` to set the base chance per tick.

**Milestone events** (`triggerType: "milestone"`) fire deterministically whenever all conditions pass and no cooldown is active. They ignore `baseProbability` entirely.

```ts
events: [
  // Random: 20% chance per tick, can't re-fire for 5 ticks
  {
    id: "accident",
    triggerType: "random",
    text: "You were in a minor accident.",
    baseProbability: 0.2,
    cooldown: 5,
    effects: [() => ({ health: -15 })],
  },

  // Milestone: fires exactly once when health first drops below 20
  {
    id: "critical_health",
    triggerType: "milestone",
    text: "Your health is critically low.",
    conditions: [s => (s.health as number) < 20],
    cooldown: 1000, // effectively one-shot
    effects: [],
  },
];
```

### `restrictions: RestrictionFn[]`

Global restrictions applied to every event and action before any other check. A restriction returns `true` when the action **is forbidden**. Use these for permanent, invariant rules that should never appear in the UI.

```ts
restrictions: [
  // All age-gated interactions are silently blocked for minors
  s => (s.age as number) < 18 && s.requiresAdult === true,
];
```

### `probabilityModifiers: ProbabilityModifierFn[]`

Modifier functions applied in sequence to every random event's probability after all gate checks pass. The final value is clamped to `[0, 1]`.

```ts
probabilityModifiers: [
  // High stress doubles all event probabilities
  (state, p) => ((state.stress as number) > 80 ? p * 2 : p),

  // Good karma increases positive-tagged events
  (state, p, event) =>
    event.id.startsWith("positive_") && (state.karma as number) > 50
      ? p * 1.5
      : p,
];
```

### `tickOrder: string[]`

Ordered list of phase names executed each tick. Built-in names:

| Name                     | What it does                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| `"passiveModifierPhase"` | Applies all `passiveModifiers`                                    |
| `"randomEventPhase"`     | Evaluates and rolls all `triggerType: "random"` events            |
| `"milestoneEventPhase"`  | Fires all `triggerType: "milestone"` events whose conditions pass |

```ts
tickOrder: ["passiveModifierPhase", "randomEventPhase", "milestoneEventPhase"];
```

### `customPhases?: Record<string, TickPhaseHandler>`

Register custom phase handlers here and reference them by name in `tickOrder`.

### `undoDepth?: number`

Maximum undo steps retained in memory. Defaults to `10`. Set to `0` to disable undo. See [Undo System](#undo-system).

---

## Engine API

### `engine.getState(): GameState`

Returns a shallow copy of the current state. Safe to store — it won't update when the engine mutates.

```ts
const { health, tick, history } = engine.getState();
```

### `engine.getAvailableActions(ctx?): ActionDef[]`

Returns actions that pass all restrictions and all conditions right now. Use this to drive your UI — render only what the player can actually do.

```ts
const actions = engine.getAvailableActions();
// e.g. render a button for each: a.id, a.label
```

### `engine.applyAction(id, ctx?): GameState`

Validates and fires a player action. Throws with a descriptive message if the action is unknown, restricted, or its conditions aren't met.

```ts
try {
  engine.applyAction("buy_house");
} catch (e) {
  showError(e.message);
}
```

Optionally pass a `Context` object that is forwarded to all effect and condition functions:

```ts
engine.applyAction("give_gift", { targetId: "partner", amount: 50 });
```

### `engine.tick(): GameState`

Advances the game one time unit. Runs all phases in `tickOrder` order.

```ts
const newState = engine.tick();
console.log(`Tick ${newState.tick} complete`);
```

### `engine.undo(): GameState`

Reverts to the state before the last `tick()` or `applyAction()`.

```ts
engine.applyAction("risky_move");
if (didGoWrong(engine.getState())) {
  engine.undo();
}
```

Throws `"Nothing to undo"` when the snapshot stack is empty.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Your Game Config                  │
│  initialState · attributes · events · actions · ...  │
└───────────────────────┬─────────────────────────────┘
                        │ consumed by
┌───────────────────────▼─────────────────────────────┐
│                    Axiom Engine                      │
│                                                      │
│  createEngine()  ──►  Engine (public API)            │
│    ├── getState()                                    │
│    ├── getAvailableActions()                         │
│    ├── applyAction()                                 │
│    ├── tick()  ──►  tickRunner  ──►  phases          │
│    └── undo()                                        │
│                                                      │
│  Engine Primitives (pure functions)                  │
│    stateManager · historyManager · cooldownManager   │
│    restrictionEvaluator · conditionEvaluator         │
│    probabilityPipeline                               │
└─────────────────────────────────────────────────────┘
```

### Module structure

```
src/
├── index.ts                    # Public re-exports
├── types/
│   ├── state.ts                # GameState, StateDelta, HistoryEntry
│   ├── config.ts               # GameConfig and all definition types
│   └── engine.ts               # Engine interface
├── engine/
│   ├── createEngine.ts         # Factory — wires everything together
│   ├── stateManager.ts         # applyDelta, buildInitialState
│   ├── historyManager.ts       # appendEntry
│   ├── cooldownManager.ts      # isOnCooldown, setCooldown, decrementCooldowns
│   ├── restrictionEvaluator.ts # passesRestrictions
│   ├── conditionEvaluator.ts   # passesConditions
│   ├── probabilityPipeline.ts  # resolveEventProbability, rollEvent
│   └── tickRunner.ts           # runTick — phase orchestration
└── phases/
    ├── passiveModifierPhase.ts
    ├── randomEventPhase.ts
    └── milestoneEventPhase.ts
```

**Dependency direction is strictly one-way:**

```
types  ←  engine primitives  ←  phases  ←  createEngine / tickRunner
```

No module imports from a higher layer. The engine never imports from game implementations.

---

## Tick Phase System

Each call to `engine.tick()` does the following:

1. Takes an undo snapshot.
2. Increments `state.tick`.
3. Prunes expired cooldowns.
4. Runs each phase listed in `config.tickOrder` in order.
5. Returns the final state.

Phases execute **sequentially** — each phase receives the state as mutated by all prior phases in the same tick.

### Built-in phases

#### `passiveModifierPhase`

Applies `config.passiveModifiers` in declaration order. Each modifier optionally gates itself with a `condition`. Modifiers are silent (no history entries).

#### `randomEventPhase`

For each event in `config.events` with `triggerType !== "milestone"`:

1. Run through the [probability pipeline](#probability-pipeline).
2. Roll `Math.random()` against the resolved probability.
3. If it fires: apply effects, append a history entry, set cooldown.

#### `milestoneEventPhase`

For each event in `config.events` with `triggerType === "milestone"`:

1. Check restrictions.
2. Check conditions.
3. Check cooldown.
4. If all pass: apply effects, append history entry, set cooldown.

No probability roll — milestone events are deterministic.

### Custom phases

```ts
const config: GameConfig = {
  // ...
  customPhases: {
    electionCycle: (state, config, tick) => {
      if (tick % 20 !== 0) return { state, entries: [] };
      // run election logic...
      return { state: updatedState, entries: newEntries };
    },
  },
  tickOrder: ["passiveModifierPhase", "electionCycle", "randomEventPhase"],
};
```

---

## Restrictions vs Conditions

Both can block an action, but they serve different purposes:

|                  | Restrictions                   | Conditions                     |
| ---------------- | ------------------------------ | ------------------------------ |
| **Purpose**      | Permanent invariants           | Current availability           |
| **Mutable?**     | No — encodes fixed rules       | Yes — changes as state changes |
| **UI behaviour** | Silently excluded              | Hidden temporarily             |
| **Example**      | Age gate, illegal relationship | Not enough money               |
| **Checked when** | First — before anything else   | After restrictions             |

Restrictions act as a safety layer. If a restriction fires:

- The action is silently omitted from `getAvailableActions`.
- `applyAction` throws `"Action blocked by restriction: <id>"`.
- No condition, cooldown, or probability check is performed.

```ts
// Restriction: permanent rule — minors can never buy alcohol
restrictions: [s => (s.age as number) < 18];

// Condition: transient — need money right now
conditions: [s => (s.money as number) >= 10];
```

---

## Probability Pipeline

Every random event goes through this pipeline each tick:

```
1.  Check global restrictions   → return 0 if any fires
2.  Check event restrictions    → return 0 if any fires
3.  Check conditions            → return 0 if any fails
4.  Check cooldown              → return 0 if still cooling down
5.  Start from baseProbability
6.  Apply probabilityModifiers  → chain of (state, p, event) => p
7.  Clamp to [0, 1]
8.  Roll Math.random() < probability
```

Only if the roll succeeds does the event fire.

Example: flu with `baseProbability: 0.15` and a stress modifier that doubles probability when `stress > 80`:

```
base = 0.15
→ stressModifier fires (stress = 90): 0.15 × 2 = 0.30
→ clamp(0.30) = 0.30
→ Math.random() = 0.22 → 0.22 < 0.30 → fires
```

---

## Undo System

Every call to `tick()` or `applyAction()` captures a shallow snapshot of the state before mutation. Calling `undo()` pops the most recent snapshot and restores it.

```ts
const engine = createEngine({ ...config, undoDepth: 5 });

engine.tick(); // snapshot #1 captured
engine.applyAction("work"); // snapshot #2 captured
engine.applyAction("buy_car"); // snapshot #3 captured

engine.undo(); // → reverts buy_car
engine.undo(); // → reverts work
engine.undo(); // → reverts tick
```

**Key properties:**

- Snapshots live in the engine closure — they are **not** stored in `GameState`, so they are not included in save files or `getState()` output.
- When `undoDepth` is exceeded, the oldest snapshot is evicted.
- `undoDepth: 0` disables the system entirely — `undo()` always throws.
- Undone operations are gone — there is no "redo".

---

## Development

```bash
npm test              # run tests with vitest
npm run test:coverage # run tests with coverage report
npm run lint:scripts  # lint TypeScript with ESLint
npm run build         # build ESM + IIFE + type definitions
```

### Scripts

| Command         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `dev`           | Start dev server                                              |
| `build`         | Generate ESM (`.js`), IIFE (`.iife.js`), and type definitions |
| `test`          | Run all tests                                                 |
| `test:coverage` | Run tests with coverage report                                |
| `lint:scripts`  | Lint `.ts` files with ESLint                                  |
| `format`        | Format all files with Prettier and Stylelint                  |

---

## Releasing

Releases are published to npm automatically via GitHub Actions when a version tag is pushed. The workflow runs tests, builds the package, and publishes with [OIDC provenance](https://docs.npmjs.com/generating-provenance-statements).

**Steps to release:**

1. Bump the version in `package.json`:

   ```bash
   npm version patch   # 1.0.0 → 1.0.1
   npm version minor   # 1.0.0 → 1.1.0
   npm version major   # 1.0.0 → 2.0.0
   ```

2. Push the commit and the generated tag:

   ```bash
   git push && git push --tags
   ```

The CI release workflow triggers on `v*` tags and handles the rest.
