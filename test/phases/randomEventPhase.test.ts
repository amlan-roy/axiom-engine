import { describe, expect, it, vi } from "vitest";
import { randomEventPhase } from "../../src/phases/randomEventPhase";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 1,
  history: [],
  cooldowns: {},
  meta: {},
  health: 60,
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

describe("randomEventPhase", () => {
  it("returns state unchanged and no entries when no events are defined", () => {
    const { state, entries } = randomEventPhase(baseState, baseConfig, 1);
    expect(state).toEqual(baseState);
    expect(entries).toHaveLength(0);
  });

  it("fires an event when its roll succeeds and applies effects", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // 0.1 < 0.5, fires
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "flu",
          text: "You caught the flu.",
          baseProbability: 0.5,
          effects: [() => ({ health: -10 })],
        },
      ],
    };
    const { state, entries } = randomEventPhase(baseState, config, 1);
    expect(state.health).toBe(50);
    expect(entries).toHaveLength(1);
    expect(entries[0].eventId).toBe("flu");
    expect(entries[0].text).toBe("You caught the flu.");
    vi.restoreAllMocks();
  });

  it("does not fire an event when its roll fails", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // 0.9 >= 0.5, does not fire
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "flu",
          text: "You caught the flu.",
          baseProbability: 0.5,
          effects: [() => ({ health: -10 })],
        },
      ],
    };
    const { state, entries } = randomEventPhase(baseState, config, 1);
    expect(state.health).toBe(60);
    expect(entries).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("sets a cooldown after an event fires when a cooldown duration is defined", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "bonus",
          text: "Bonus!",
          baseProbability: 1,
          cooldown: 3,
          effects: [() => ({})],
        },
      ],
    };
    const { state } = randomEventPhase(baseState, config, 1);
    expect(state.cooldowns["bonus"]).toBe(4); // tick 1 + cooldown 3
    vi.restoreAllMocks();
  });

  it("resolves text when it is a function receiving the current state", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "dynamic",
          text: s => `Health is ${String(s.health)}.`,
          baseProbability: 1,
          effects: [() => ({})],
        },
      ],
    };
    const { entries } = randomEventPhase(baseState, config, 1);
    expect(entries[0].text).toBe("Health is 60.");
    vi.restoreAllMocks();
  });

  it("applies multiple effects on the same event in sequence", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "double_hit",
          text: "Double hit.",
          baseProbability: 1,
          effects: [() => ({ health: -5 }), () => ({ health: -3 })],
        },
      ],
    };
    const { state } = randomEventPhase(baseState, config, 1);
    expect(state.health).toBe(52);
    vi.restoreAllMocks();
  });

  it("skips events with triggerType 'milestone'", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "milestone_ev",
          triggerType: "milestone",
          text: "Milestone.",
          baseProbability: 1,
          effects: [() => ({ health: -20 })],
        },
      ],
    };
    const { state } = randomEventPhase(baseState, config, 1);
    expect(state.health).toBe(60); // milestone event ignored by this phase
    vi.restoreAllMocks();
  });
});
