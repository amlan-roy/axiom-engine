/**
 * A single entry in the game's append-only history log.
 * Text is stored fully resolved (not as a reference to the event definition)
 * so history remains readable even if the GameConfig changes in future.
 */
export interface HistoryEntry {
  /** The tick number at which this event was recorded. */
  tick: number;
  /** Human-readable description of what happened. */
  text: string;
  /** ID of the event or action that produced this entry. */
  eventId: string;
  /** Wall-clock timestamp (ms since epoch) when the entry was created. */
  timestamp: number;
}

/**
 * Maps event IDs to the tick number at which their cooldown expires.
 * An event is unavailable while `currentTick < cooldowns[eventId]`.
 */
export type Cooldowns = Record<string, number>;

/**
 * The four fields owned exclusively by the engine.
 * Games must not write to these directly — use the Engine API.
 */
export interface EngineState {
  /** Number of ticks that have elapsed since the game began. */
  tick: number;
  /** Append-only log of every event and action that has fired. */
  history: HistoryEntry[];
  /** Cooldown expiry ticks keyed by event ID. */
  cooldowns: Cooldowns;
  /** Arbitrary metadata slot for engine-level bookkeeping. Not used by the engine itself. */
  meta: Record<string, unknown>;
}

/**
 * The complete game state at any point in time.
 *
 * The engine owns four fields: `tick`, `history`, `cooldowns`, and `meta`.
 * Every other key belongs to the game layer (attributes, entities, flags, etc.).
 *
 * The full state is a plain serialisable object — save/load and replay are
 * straightforward JSON operations.
 *
 * @example
 * // A life-sim state snapshot
 * const state: GameState = {
 *   tick: 42,
 *   history: [...],
 *   cooldowns: {},
 *   meta: {},
 *   health: 80,
 *   happiness: 65,
 *   money: 1200,
 *   job: "engineer",
 * };
 */
export type GameState = EngineState & Record<string, unknown>;

/**
 * A partial description of changes to apply to a `GameState`.
 *
 * Semantics depend on the key type:
 * - **Attribute keys** (declared in `GameConfig.attributes`): numeric values are
 *   **additive** — `{ health: 5 }` means "add 5 to current health", not "set to 5".
 *   The result is clamped to the attribute's `[min, max]` range.
 * - **All other keys**: values are directly assigned (replace).
 * - **Engine-owned keys** (`tick`, `history`, `cooldowns`, `meta`): always ignored.
 *
 * @example
 * // Increase health by 5, decrease happiness by 2
 * const delta: StateDelta = { health: 5, happiness: -2 };
 */
export type StateDelta = Record<string, unknown>;
