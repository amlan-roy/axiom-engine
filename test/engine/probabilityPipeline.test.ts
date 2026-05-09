import { describe, expect, it, vi } from "vitest";
import {
  resolveEventProbability,
  rollEvent,
} from "../../src/engine/probabilityPipeline";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 0,
  history: [],
  cooldowns: {},
  meta: {},
  health: 50,
};

const baseConfig: GameConfig = {
  initialState: () => ({}),
  attributes: { health: { min: 0, max: 100, default: 75 } },
  passiveModifiers: [],
  actions: [],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [],
};

describe("resolveEventProbability", () => {
  it("returns 0 when a global restriction fires", () => {
    const config: GameConfig = {
      ...baseConfig,
      restrictions: [() => true],
    };
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 1 };
    expect(resolveEventProbability(baseState, ev, config)).toBe(0);
  });

  it("returns 0 when an event-level restriction fires", () => {
    const ev = {
      id: "ev",
      text: "ev",
      effects: [],
      baseProbability: 1,
      restrictions: [() => true],
    };
    expect(resolveEventProbability(baseState, ev, baseConfig)).toBe(0);
  });

  it("returns 0 when an event condition fails", () => {
    const ev = {
      id: "ev",
      text: "ev",
      effects: [],
      baseProbability: 1,
      conditions: [() => false],
    };
    expect(resolveEventProbability(baseState, ev, baseConfig)).toBe(0);
  });

  it("returns 0 when the event is on cooldown", () => {
    const state: GameState = { ...baseState, tick: 3, cooldowns: { ev: 5 } };
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 1 };
    expect(resolveEventProbability(state, ev, baseConfig)).toBe(0);
  });

  it("returns the base probability when no modifiers are configured", () => {
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 0.4 };
    expect(resolveEventProbability(baseState, ev, baseConfig)).toBeCloseTo(0.4);
  });

  it("applies probability modifiers in order and returns the chained result", () => {
    const config: GameConfig = {
      ...baseConfig,
      probabilityModifiers: [
        (_s, p) => p * 2, // 0.3 → 0.6
        (_s, p) => p + 0.1, // 0.6 → 0.7
      ],
    };
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 0.3 };
    expect(resolveEventProbability(baseState, ev, config)).toBeCloseTo(0.7);
  });

  it("clamps the final probability to a maximum of 1", () => {
    const config: GameConfig = {
      ...baseConfig,
      probabilityModifiers: [(_s, p) => p * 10],
    };
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 0.5 };
    expect(resolveEventProbability(baseState, ev, config)).toBe(1);
  });

  it("clamps the final probability to a minimum of 0", () => {
    const config: GameConfig = {
      ...baseConfig,
      probabilityModifiers: [() => -5],
    };
    const ev = { id: "ev", text: "ev", effects: [], baseProbability: 0.5 };
    expect(resolveEventProbability(baseState, ev, config)).toBe(0);
  });
});

describe("rollEvent", () => {
  it("returns true when the random roll is strictly below the probability", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    expect(rollEvent(0.5)).toBe(true);
    vi.restoreAllMocks();
  });

  it("returns false when the random roll equals the probability", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(rollEvent(0.5)).toBe(false);
    vi.restoreAllMocks();
  });

  it("returns false when the random roll exceeds the probability", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    expect(rollEvent(0.5)).toBe(false);
    vi.restoreAllMocks();
  });

  it("always returns false for probability 0 regardless of roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollEvent(0)).toBe(false);
    vi.restoreAllMocks();
  });
});
