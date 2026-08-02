import assert from "node:assert/strict";
import test from "node:test";
import { classifySequence } from "../src/services/telemetryService.js";

test("newer sequence is applied", () => {
  assert.deepEqual(classifySequence({ last_seq: 10 }, "heartbeat", 11), {
    isDuplicate: false,
    isStale: false,
    isReboot: false,
  });
});

test("same sequence is marked duplicate", () => {
  assert.deepEqual(classifySequence({ last_seq: 10 }, "heartbeat", 10), {
    isDuplicate: true,
    isStale: false,
    isReboot: false,
  });
});

test("older sequence is marked stale", () => {
  assert.deepEqual(classifySequence({ last_seq: 10 }, "heartbeat", 9), {
    isDuplicate: false,
    isStale: true,
    isReboot: false,
  });
});

test("large sequence drop is treated as device reboot", () => {
  assert.deepEqual(classifySequence({ last_seq: 250 }, "heartbeat", 1), {
    isDuplicate: false,
    isStale: false,
    isReboot: true,
  });
});
