export interface HistoryEntry {
  tick: number;
  text: string;
  eventId: string;
  timestamp: number;
}

export type Cooldowns = Record<string, number>;

export interface EngineState {
  tick: number;
  history: HistoryEntry[];
  cooldowns: Cooldowns;
  meta: Record<string, unknown>;
}

// Engine owns tick/history/cooldowns/meta. Everything else is game-specific.
export type GameState = EngineState & Record<string, unknown>;

// Numeric values for attribute keys are additive changes; other keys are direct assignments.
export type StateDelta = Record<string, unknown>;
