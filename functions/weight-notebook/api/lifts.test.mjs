import test from "node:test";
import assert from "node:assert/strict";
import { validateEntry } from "./lifts.mjs";

test("accepts a small barbell entry", () => {
  const entry = validateEntry({
    exercise: "  Bench   press ",
    equipment: "Barbell",
    sets: [{ weight: 140, reps: 8 }, { weight: "140", reps: "7" }]
  });
  assert.deepEqual(entry, {
    exercise: "Bench press",
    equipment: "Barbell",
    sets: [{ weight: 140, reps: 8 }, { weight: 140, reps: 7 }]
  });
});

test("rejects invalid equipment and set values", () => {
  assert.equal(validateEntry({ exercise: "Curl", equipment: "Cable", sets: [{ weight: 20, reps: 10 }] }).error, "Choose barbell or dumbbell.");
  assert.equal(validateEntry({ exercise: "Curl", equipment: "Dumbbell", sets: [{ weight: -20, reps: 10 }] }).error, "Each set needs a valid weight and rep count.");
});
