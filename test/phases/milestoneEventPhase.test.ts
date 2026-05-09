import { describe, expect, it } from "vitest";
import { milestoneEventPhase } from "../../src/phases/milestoneEventPhase";
import type { GameConfig } from "../../src/types/config";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 1,
  history: [],
  cooldowns: {},
  meta: {},
  age: 18,
  health: 50,
};

const baseConfig: GameConfig = {
  initialState: () => ({}),
  attributes: {
    age: { min: 0, max: 120, default: 0 },
    health: { min: 0, max: 100, default: 75 },
  },
  passiveModifiers: [],
  actions: [],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: [],
};

describe("milestoneEventPhase", () => {
  it("returns state unchanged and no entries when no milestone events are defined", () => {
    const { state, entries } = milestoneEventPhase(baseState, baseConfig, 1);
    expect(state).toEqual(baseState);
    expect(entries).toHaveLength(0);
  });

  it("fires a milestone event when all conditions pass", () => {
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "adult",
          triggerType: "milestone",
          text: "You are now an adult.",
          conditions: [s => (s.age as number) >= 18],
          cooldown: 1000,
          effects: [() => ({})],
        },
      ],
    };
    const { entries } = milestoneEventPhase(baseState, config, 1);
    expect(entries).toHaveLength(1);
    expect(entries[0].eventId).toBe("adult");
  });

  it("does not fire when a condition fails", () => {
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "elder",
          triggerType: "milestone",
          text: "You became an elder.",
          conditions: [s => (s.age as number) >= 65],
          effects: [() => ({})],
        },
      ],
    };
    const { entries } = milestoneEventPhase(baseState, config, 1);
    expect(entries).toHaveLength(0);
  });

  it("does not fire when the event is on cooldown", () => {
    const state: GameState = { ...baseState, cooldowns: { adult: 100 } };
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "adult",
          triggerType: "milestone",
          text: "You are now an adult.",
          conditions: [s => (s.age as number) >= 18],
          effects: [() => ({})],
        },
      ],
    };
    const { entries } = milestoneEventPhase(state, config, 1);
    expect(entries).toHaveLength(0);
  });

  it("applies effects to state when a milestone fires", () => {
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "health_boost",
          triggerType: "milestone",
          text: "Health milestone.",
          conditions: [() => true],
          effects: [() => ({ health: 10 })],
        },
      ],
    };
    const { state } = milestoneEventPhase(baseState, config, 1);
    expect(state.health).toBe(60);
  });

  it("does not fire when a global restriction blocks it", () => {
    const config: GameConfig = {
      ...baseConfig,
      restrictions: [() => true],
      events: [
        {
          id: "adult",
          triggerType: "milestone",
          text: "You are now an adult.",
          conditions: [s => (s.age as number) >= 18],
          effects: [() => ({})],
        },
      ],
    };
    const { entries } = milestoneEventPhase(baseState, config, 1);
    expect(entries).toHaveLength(0);
  });

  it("ignores events with triggerType 'random' or no triggerType", () => {
    const config: GameConfig = {
      ...baseConfig,
      events: [
        {
          id: "random_ev",
          text: "Random event.",
          conditions: [() => true],
          effects: [() => ({ health: -20 })],
        },
      ],
    };
    const { state } = milestoneEventPhase(baseState, config, 1);
    expect(state.health).toBe(50); // random events ignored by milestone phase
  });
});
