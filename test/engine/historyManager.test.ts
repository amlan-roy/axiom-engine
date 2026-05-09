import { describe, expect, it } from "vitest";
import { appendEntry } from "../../src/engine/historyManager";
import type { GameState } from "../../src/types/state";

const baseState: GameState = {
  tick: 3,
  history: [],
  cooldowns: {},
  meta: {},
};

describe("appendEntry", () => {
  it("appends a history entry with the correct tick, eventId, and text", () => {
    const next = appendEntry(baseState, "got_sick", "You got sick.");
    expect(next.history).toHaveLength(1);
    expect(next.history[0].eventId).toBe("got_sick");
    expect(next.history[0].text).toBe("You got sick.");
    expect(next.history[0].tick).toBe(3);
  });

  it("records a numeric timestamp on each entry", () => {
    const next = appendEntry(baseState, "ev", "Event.");
    expect(typeof next.history[0].timestamp).toBe("number");
  });

  it("preserves all existing history entries (append-only, never removes)", () => {
    const withOne = appendEntry(baseState, "event_a", "First event.");
    const withTwo = appendEntry(withOne, "event_b", "Second event.");
    expect(withTwo.history).toHaveLength(2);
    expect(withTwo.history[0].eventId).toBe("event_a");
    expect(withTwo.history[1].eventId).toBe("event_b");
  });

  it("does not mutate the input state", () => {
    appendEntry(baseState, "test", "Test.");
    expect(baseState.history).toHaveLength(0);
  });
});
