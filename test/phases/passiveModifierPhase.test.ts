import { describe, expect, it } from "vitest";
import { passiveModifierPhase } from "../../src/phases/passiveModifierPhase";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 1,
  history: [],
  cooldowns: {},
  meta: {},
  health: 50,
  happiness: 60,
};

const baseConfig: GameConfig = {
  initialState: () => ({}),
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

describe("passiveModifierPhase", () => {
  it("returns state unchanged and no entries when there are no passive modifiers", () => {
    const { state, entries } = passiveModifierPhase(baseState, baseConfig, 1);
    expect(state.health).toBe(50);
    expect(entries).toHaveLength(0);
  });

  it("applies a static StateDelta modifier", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [{ id: "aging", delta: { health: -1, happiness: -1 } }],
    };
    const { state } = passiveModifierPhase(baseState, config, 1);
    expect(state.health).toBe(49);
    expect(state.happiness).toBe(59);
  });

  it("applies a function-based delta modifier using the current state", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [
        {
          id: "regen",
          delta: s => ({ health: (s.health as number) > 30 ? 2 : 5 }),
        },
      ],
    };
    const { state } = passiveModifierPhase(baseState, config, 1);
    expect(state.health).toBe(52); // health 50 > 30, so +2
  });

  it("skips a modifier when its condition returns false", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [
        {
          id: "sick_penalty",
          condition: s => (s.health as number) < 30,
          delta: { health: -5 },
        },
      ],
    };
    const { state } = passiveModifierPhase(baseState, config, 1);
    expect(state.health).toBe(50); // condition false, no change
  });

  it("applies a modifier when its condition returns true", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [
        {
          id: "low_health_penalty",
          condition: s => (s.health as number) < 60,
          delta: { health: -5 },
        },
      ],
    };
    const { state } = passiveModifierPhase(baseState, config, 1);
    expect(state.health).toBe(45);
  });

  it("applies modifiers sequentially — each modifier sees the updated state from the previous one", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [
        { id: "first", delta: { health: -10 } },
        {
          id: "second",
          condition: s => (s.health as number) < 45,
          delta: { health: -5 },
        },
      ],
    };
    const { state } = passiveModifierPhase(baseState, config, 1);
    // After first: health = 40. condition 40 < 45 = true, so second fires.
    expect(state.health).toBe(35);
  });

  it("never creates history entries (passive modifiers are silent)", () => {
    const config: GameConfig = {
      ...baseConfig,
      passiveModifiers: [{ id: "aging", delta: { health: -1 } }],
    };
    const { entries } = passiveModifierPhase(baseState, config, 1);
    expect(entries).toHaveLength(0);
  });
});
