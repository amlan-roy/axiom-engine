import { describe, expect, it } from "vitest";
import { createEngine } from "../../src/engine/createEngine";
import type { GameConfig } from "../../src/types/config";

const baseConfig: GameConfig = {
  initialState: () => ({ health: 80 }),
  attributes: { health: { min: 0, max: 100, default: 75 } },
  passiveModifiers: [{ id: "aging", delta: { health: -1 } }],
  actions: [
    {
      id: "gym",
      label: "Go to gym",
      text: "You worked out.",
      effects: [() => ({ health: 5 })],
    },
  ],
  events: [],
  restrictions: [],
  probabilityModifiers: [],
  tickOrder: ["passiveModifierPhase"],
};

describe("undo", () => {
  it("restores state to before the last applyAction call", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym"); // health 80 → 85
    engine.undo();
    expect(engine.getState().health).toBe(80);
  });

  it("undo returns the restored state", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym");
    const restored = engine.undo();
    expect(restored.health).toBe(80);
  });

  it("restores state to before the last tick call", () => {
    const engine = createEngine(baseConfig);
    engine.tick(); // tick 0→1, health 80→79
    engine.undo();
    const state = engine.getState();
    expect(state.health).toBe(80);
    expect(state.tick).toBe(0);
  });

  it("restores history after undo", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym"); // adds a history entry
    engine.undo();
    expect(engine.getState().history).toHaveLength(0);
  });

  it("can undo multiple steps up to undoDepth", () => {
    const config: GameConfig = { ...baseConfig, undoDepth: 3 };
    const engine = createEngine(config);
    engine.applyAction("gym"); // 85
    engine.applyAction("gym"); // 90
    engine.applyAction("gym"); // 95
    engine.undo(); // → 90
    engine.undo(); // → 85
    engine.undo(); // → 80
    expect(engine.getState().health).toBe(80);
  });

  it("throws when there is nothing left to undo", () => {
    const engine = createEngine(baseConfig);
    expect(() => engine.undo()).toThrow("Nothing to undo");
  });

  it("throws after all snapshots are exhausted", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym");
    engine.undo();
    expect(() => engine.undo()).toThrow("Nothing to undo");
  });

  it("evicts the oldest snapshot when undoDepth is exceeded", () => {
    const config: GameConfig = { ...baseConfig, undoDepth: 2 };
    const engine = createEngine(config);
    engine.applyAction("gym"); // snap[0]=h80, now h85
    engine.applyAction("gym"); // snap[0]=h80, snap[1]=h85, now h90
    engine.applyAction("gym"); // snap[0]=h85, snap[1]=h90, now h95 — h80 evicted
    engine.undo(); // → h90
    engine.undo(); // → h85
    expect(() => engine.undo()).toThrow("Nothing to undo"); // h80 was evicted
  });

  it("does not record snapshots when undoDepth is 0", () => {
    const config: GameConfig = { ...baseConfig, undoDepth: 0 };
    const engine = createEngine(config);
    engine.applyAction("gym");
    expect(() => engine.undo()).toThrow("Nothing to undo");
  });

  it("undo interleaved with applyAction behaves correctly", () => {
    const engine = createEngine(baseConfig);
    engine.applyAction("gym"); // snap: [h80], now h85
    engine.applyAction("gym"); // snap: [h80, h85], now h90
    engine.undo(); // pop h85, snap: [h80], now h85
    engine.applyAction("gym"); // snap: [h80, h85], now h90
    engine.undo(); // → h85
    engine.undo(); // → h80
    expect(engine.getState().health).toBe(80);
  });
});
