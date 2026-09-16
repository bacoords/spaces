import test from "node:test";
import assert from "node:assert/strict";
import { constantTimeEqual, createSession, destroySession, hashText, isAuthenticated, isSameOrigin, passwordMatches } from "./_shared.mjs";

class SessionDb {
  sessions = new Map();
  async exec() {}
  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          if (sql.startsWith("INSERT INTO liftbook_sessions")) this.sessions.set(values[0], values[1]);
          if (sql.startsWith("DELETE FROM liftbook_sessions WHERE token_hash")) this.sessions.delete(values[0]);
          if (sql.startsWith("DELETE FROM liftbook_sessions WHERE expires_at")) {
            for (const [token, expiry] of this.sessions) if (expiry < values[0]) this.sessions.delete(token);
          }
        },
        first: async () => {
          const expiresAt = this.sessions.get(values[0]);
          return expiresAt ? { expires_at: expiresAt } : null;
        }
      })
    };
  }
}

test("hashes deterministically and compares fixed-length values", async () => {
  assert.equal(await hashText("liftbook"), "7849f9bbe9b91f1ce59906971ea08d9b94f85c46a26509ab177c068f9ca3762a");
  assert.equal(constantTimeEqual("abcd", "abcd"), true);
  assert.equal(constantTimeEqual("abcd", "abce"), false);
  assert.equal(constantTimeEqual("abcd", "abc"), false);
});

test("rejects weak or incorrect passwords", async () => {
  assert.equal(await passwordMatches("lift"), false);
  assert.equal(await passwordMatches("this-is-not-the-generated-password"), false);
});

test("creates, verifies, and destroys an opaque session", async () => {
  const env = { DB: new SessionDb() };
  const session = await createSession(env);
  const cookie = session.cookie.split(";")[0];
  const request = new Request("https://example.com/weight-notebook/api/session", { headers: { cookie } });
  assert.equal(await isAuthenticated(request, env), true);
  await destroySession(request, env);
  assert.equal(await isAuthenticated(request, env), false);
});

test("accepts the public custom domain after internal dispatch", () => {
  const request = new Request("https://polished-fediverse.spacefast.site/weight-notebook/api/session", {
    headers: { origin: "https://spaces.briancoords.com" }
  });
  assert.equal(isSameOrigin(request), true);
});
