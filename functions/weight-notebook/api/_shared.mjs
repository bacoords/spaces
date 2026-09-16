let schemaReady = false;

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(message, status = 400) {
  return json({ error: message }, { status });
}

export async function ensureSchema(env) {
  if (!env?.DB) throw new Error("DATABASE_UNAVAILABLE");
  if (schemaReady) return;

  await env.DB.exec(`CREATE TABLE IF NOT EXISTS liftbook_sets (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    exercise VARCHAR(100) NOT NULL,
    equipment VARCHAR(20) NOT NULL,
    weight DOUBLE NOT NULL,
    reps INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    performed_at VARCHAR(32) NOT NULL
  )`);

  schemaReady = true;
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin || origin === "https://spaces.briancoords.com";
}

export function serverError(error) {
  console.error("Liftbook request failed", error);
  if (error?.message === "DATABASE_UNAVAILABLE") {
    return errorResponse("Liftbook storage is not available yet.", 503);
  }
  return errorResponse("Liftbook is temporarily unavailable. Your entry has not been saved.", 503);
}
