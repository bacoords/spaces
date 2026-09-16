import {
  ensureSchema,
  errorResponse,
  isSameOrigin,
  json,
  serverError
} from "./_shared.mjs";

export function validateEntry(body) {
  const exercise = typeof body?.exercise === "string" ? body.exercise.trim().replace(/\s+/g, " ") : "";
  const equipment = body?.equipment;
  const sets = body?.sets;

  if (!exercise || exercise.length > 100) return { error: "Add an exercise name up to 100 characters." };
  if (!["Barbell", "Dumbbell"].includes(equipment)) return { error: "Choose barbell or dumbbell." };
  if (!Array.isArray(sets) || sets.length < 1 || sets.length > 20) return { error: "Add between 1 and 20 completed sets." };

  const normalizedSets = sets.map(set => ({ weight: Number(set?.weight), reps: Number(set?.reps) }));
  const invalid = normalizedSets.some(set => (
    !Number.isFinite(set.weight) || set.weight <= 0 || set.weight > 10000 ||
    !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 1000
  ));
  if (invalid) return { error: "Each set needs a valid weight and rep count." };
  return { exercise, equipment, sets: normalizedSets };
}

function toClientRecord(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    exercise: row.exercise,
    equipment: row.equipment,
    weight: Number(row.weight),
    reps: Number(row.reps),
    setNumber: Number(row.set_number),
    performedAt: row.performed_at
  };
}

export async function GET(request, context) {
  try {
    await ensureSchema(context.env);
    const { results = [] } = await context.env.DB.prepare(`SELECT
      id, session_id, exercise, equipment, weight, reps, set_number, performed_at
      FROM liftbook_sets
      ORDER BY performed_at DESC, set_number ASC
      LIMIT 1000`).all();
    return json({ sets: results.map(toClientRecord) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request, context) {
  if (!isSameOrigin(request)) return errorResponse("Request origin was not accepted.", 403);
  try {
    await ensureSchema(context.env);
    const entry = validateEntry(await request.json());
    if (entry.error) return errorResponse(entry.error, 400);

    const sessionId = crypto.randomUUID();
    const performedAt = new Date().toISOString();
    const statements = entry.sets.map((set, index) => context.env.DB.prepare(`INSERT INTO liftbook_sets
      (id, session_id, exercise, equipment, weight, reps, set_number, performed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        crypto.randomUUID(),
        sessionId,
        entry.exercise,
        entry.equipment,
        set.weight,
        set.reps,
        index + 1,
        performedAt
      ));
    await context.env.DB.batch(statements);
    return json({ sessionId, setCount: entry.sets.length, performedAt }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse("The lift entry was not valid JSON.", 400);
    return serverError(error);
  }
}
