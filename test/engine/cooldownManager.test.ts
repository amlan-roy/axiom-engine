import { describe, expect, it } from "vitest";
import {
  isOnCooldown,
  setCooldown,
  decrementCooldowns,
} from "../../src/engine/cooldownManager";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 5,
  history: [],
  cooldowns: {},
  meta: {},
};

describe("isOnCooldown", () => {
  it("returns false when the event has no cooldown entry", () => {
    expect(isOnCooldown(baseState, "event_a")).toBe(false);
  });

  it("returns true when the current tick is before the expiry tick", () => {
    const state: GameState = { ...baseState, cooldowns: { event_a: 8 } };
    expect(isOnCooldown(state, "event_a")).toBe(true);
  });

  it("returns false when the current tick equals the expiry tick", () => {
    const state: GameState = { ...baseState, cooldowns: { event_a: 5 } };
    expect(isOnCooldown(state, "event_a")).toBe(false);
  });

  it("returns false when the current tick is past the expiry tick", () => {
    const state: GameState = {
      ...baseState,
      tick: 10,
      cooldowns: { event_a: 5 },
    };
    expect(isOnCooldown(state, "event_a")).toBe(false);
  });
});

describe("setCooldown", () => {
  it("stores expiry as current tick plus the duration", () => {
    const next = setCooldown(baseState, "event_a", 3);
    expect(next.cooldowns["event_a"]).toBe(8); // tick 5 + duration 3
  });

  it("does not mutate the input state", () => {
    setCooldown(baseState, "event_a", 3);
    expect(baseState.cooldowns["event_a"]).toBeUndefined();
  });

  it("preserves unrelated cooldown entries", () => {
    const state: GameState = { ...baseState, cooldowns: { event_b: 20 } };
    const next = setCooldown(state, "event_a", 3);
    expect(next.cooldowns["event_b"]).toBe(20);
  });
});

describe("decrementCooldowns", () => {
  it("removes entries whose expiry tick has been reached", () => {
    const state: GameState = {
      ...baseState,
      tick: 10,
      cooldowns: { event_a: 10, event_b: 15 },
    };
    const next = decrementCooldowns(state);
    expect(next.cooldowns["event_a"]).toBeUndefined();
    expect(next.cooldowns["event_b"]).toBe(15);
  });

  it("does not mutate the input state", () => {
    const state: GameState = { ...baseState, cooldowns: { event_a: 3 } };
    decrementCooldowns(state);
    expect(state.cooldowns["event_a"]).toBe(3);
  });
});
