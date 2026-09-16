const PASSWORD_SHA256 = "fa269412791f720bc0325616e4c80920c29f72f0e35e7b671824235d81d6eb8c";
const SESSION_COOKIE = "liftbook_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

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

  await env.DB.exec(`CREATE TABLE IF NOT EXISTS liftbook_sessions (
    token_hash VARCHAR(64) NOT NULL PRIMARY KEY,
    expires_at BIGINT NOT NULL
  )`);

  schemaReady = true;
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin || origin === "https://spaces.briancoords.com";
}

function cookieValue(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const pair of cookieHeader.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export async function hashText(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function passwordMatches(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) return false;
  return constantTimeEqual(await hashText(password), PASSWORD_SHA256);
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSession(env) {
  await ensureSchema(env);
  const token = randomToken();
  const tokenHash = await hashText(token);
  const expiresAt = Date.now() + (SESSION_MAX_AGE * 1000);

  await env.DB.prepare("DELETE FROM liftbook_sessions WHERE expires_at < ?")
    .bind(Date.now())
    .run();
  await env.DB.prepare("INSERT INTO liftbook_sessions (token_hash, expires_at) VALUES (?, ?)")
    .bind(tokenHash, expiresAt)
    .run();

  return {
    token,
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/weight-notebook/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`
  };
}

export async function isAuthenticated(request, env) {
  await ensureSchema(env);
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length > 256) return false;
  const tokenHash = await hashText(token);
  const session = await env.DB.prepare("SELECT expires_at FROM liftbook_sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first();
  if (!session) return false;
  if (Number(session.expires_at) <= Date.now()) {
    await env.DB.prepare("DELETE FROM liftbook_sessions WHERE token_hash = ?").bind(tokenHash).run();
    return false;
  }
  return true;
}

export async function destroySession(request, env) {
  await ensureSchema(env);
  const token = cookieValue(request, SESSION_COOKIE);
  if (token && token.length <= 256) {
    await env.DB.prepare("DELETE FROM liftbook_sessions WHERE token_hash = ?")
      .bind(await hashText(token))
      .run();
  }
  return `${SESSION_COOKIE}=; Path=/weight-notebook/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function requireAuthentication(request, env) {
  if (await isAuthenticated(request, env)) return null;
  return errorResponse("Enter the Liftbook password to continue.", 401);
}

export function serverError(error) {
  console.error("Liftbook request failed", error);
  if (error?.message === "DATABASE_UNAVAILABLE") {
    return errorResponse("Liftbook storage is not available yet.", 503);
  }
  return errorResponse("Liftbook is temporarily unavailable. Your entry has not been saved.", 503);
}
