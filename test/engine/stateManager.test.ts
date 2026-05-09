import { describe, expect, it } from "vitest";
import { applyDelta, buildInitialState } from "../../src/engine/stateManager";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const mockConfig: GameConfig = {
  initialState: () => ({ health: 80, happiness: 50 }),
  attributes: {
    health: { min: 0, max: 100, default: 75 },
    happiness: { min: 0, max: 100, default: 50 },
  },
  passiveModifiers: [],
  actions: [],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [],
};

describe("buildInitialState", () => {
  it("merges initialState output with engine-owned fields at zero values", () => {
    const state = buildInitialState(mockConfig);
    expect(state.health).toBe(80);
    expect(state.happiness).toBe(50);
    expect(state.tick).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.cooldowns).toEqual({});
    expect(state.meta).toEqual({});
  });

  it("clamps initialState attribute values to their defined bounds", () => {
    const config: GameConfig = {
      ...mockConfig,
      initialState: () => ({ health: 200, happiness: -10 }),
    };
    const state = buildInitialState(config);
    expect(state.health).toBe(100);
    expect(state.happiness).toBe(0);
  });

  it("uses the attribute default when initialState omits a key", () => {
    const config: GameConfig = {
      ...mockConfig,
      initialState: () => ({}),
    };
    const state = buildInitialState(config);
    expect(state.health).toBe(75);
    expect(state.happiness).toBe(50);
  });
});

describe("applyDelta", () => {
  const baseState: GameState = {
    tick: 0,
    history: [],
    cooldowns: {},
    meta: {},
    health: 50,
    happiness: 50,
  };

  it("adds numeric delta values to current attribute values", () => {
    const next = applyDelta(
      baseState,
      { health: 10, happiness: -5 },
      mockConfig
    );
    expect(next.health).toBe(60);
    expect(next.happiness).toBe(45);
  });

  it("clamps attribute values to their defined bounds after applying the delta", () => {
    const next = applyDelta(
      baseState,
      { health: 100, happiness: -200 },
      mockConfig
    );
    expect(next.health).toBe(100);
    expect(next.happiness).toBe(0);
  });

  it("does not mutate the input state object", () => {
    applyDelta(baseState, { health: 10 }, mockConfig);
    expect(baseState.health).toBe(50);
  });

  it("ignores engine-owned keys: tick, history, cooldowns, meta", () => {
    const next = applyDelta(
      baseState,
      { tick: 999, history: [], cooldowns: {}, meta: {} },
      mockConfig
    );
    expect(next.tick).toBe(0);
    expect(next.history).toBe(baseState.history);
    expect(next.cooldowns).toBe(baseState.cooldowns);
    expect(next.meta).toBe(baseState.meta);
  });

  it("directly assigns non-attribute game-specific keys", () => {
    const next = applyDelta(baseState, { job: "engineer" }, mockConfig);
    expect(next.job).toBe("engineer");
  });
});
