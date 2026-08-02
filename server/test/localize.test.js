import assert from "node:assert/strict";
import test from "node:test";
import { localizePoleSet } from "../src/fault-engine/localize.js";

const transformer = {
  dt_id: "DT-1",
  feeder_id: "F-1",
  lat: 12.9,
  lon: 77.5,
  has_known_topology: true,
};

test("known topology localizes the live/dark boundary to one span", () => {
  const poles = [
    {
      pole_id: "P-1",
      parent_pole_id: null,
      device_id: "D-1",
      is_energized: true,
      lat: 12.9,
      lon: 77.5,
      pincode: "560001",
    },
    {
      pole_id: "P-2",
      parent_pole_id: "P-1",
      device_id: "D-2",
      is_energized: false,
      lat: 12.91,
      lon: 77.51,
      pincode: "560001",
    },
    {
      pole_id: "P-3",
      parent_pole_id: "P-2",
      device_id: "D-3",
      is_energized: false,
      lat: 12.92,
      lon: 77.52,
      pincode: "560001",
    },
  ];

  const faults = localizePoleSet(poles, transformer);

  assert.equal(faults.length, 1);
  assert.equal(faults[0].fault_type, "span");
  assert.equal(faults[0].last_live_pole_id, "P-1");
  assert.equal(faults[0].first_dark_pole_id, "P-2");
  assert.deepEqual(faults[0].affected_pole_ids, ["P-2", "P-3"]);
  assert.equal(faults[0].confidence, 0.95);
});

test("all reporting poles dark becomes a transformer-level fault", () => {
  const poles = [
    {
      pole_id: "P-1",
      parent_pole_id: null,
      device_id: "D-1",
      is_energized: false,
      lat: 12.9,
      lon: 77.5,
      pincode: "560001",
    },
    {
      pole_id: "P-2",
      parent_pole_id: "P-1",
      device_id: null,
      is_energized: true,
      lat: 12.91,
      lon: 77.51,
      pincode: "560001",
    },
  ];

  const faults = localizePoleSet(poles, transformer);

  assert.equal(faults.length, 1);
  assert.equal(faults[0].fault_type, "transformer");
  assert.equal(faults[0].localization_level, "dt");
  assert.equal(faults[0].affected_pole_ids.length, 2);
});

test("missing topology returns an honest approximate DT-level localization", () => {
  const missingTopologyTransformer = { ...transformer, has_known_topology: false };
  const poles = [
    {
      pole_id: "P-1",
      device_id: "D-1",
      is_energized: true,
      lat: 12.9,
      lon: 77.5,
      pincode: "560001",
    },
    {
      pole_id: "P-2",
      device_id: "D-2",
      is_energized: false,
      lat: 12.91,
      lon: 77.51,
      pincode: "560002",
    },
  ];

  const faults = localizePoleSet(poles, missingTopologyTransformer);

  assert.equal(faults.length, 1);
  assert.equal(faults[0].fault_type, "span");
  assert.equal(faults[0].localization_level, "dt");
  assert.equal(faults[0].confidence, 0.42);
});

test("all live telemetry produces no fault", () => {
  const poles = [
    {
      pole_id: "P-1",
      device_id: "D-1",
      is_energized: true,
      lat: 12.9,
      lon: 77.5,
    },
  ];

  assert.deepEqual(localizePoleSet(poles, transformer), []);
});
