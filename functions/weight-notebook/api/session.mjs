import {
  createSession,
  destroySession,
  errorResponse,
  isAuthenticated,
  isSameOrigin,
  json,
  passwordMatches,
  serverError
} from "./_shared.mjs";

export async function GET(request, context) {
  try {
    return json({ authenticated: await isAuthenticated(request, context.env) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request, context) {
  if (!isSameOrigin(request)) return errorResponse("Request origin was not accepted.", 403);
  try {
    const body = await request.json();
    if (!(await passwordMatches(body?.password))) {
      return errorResponse("That password doesn’t match.", 401);
    }
    const session = await createSession(context.env);
    return json({ authenticated: true }, { headers: { "set-cookie": session.cookie } });
  } catch (error) {
    if (error instanceof SyntaxError) return errorResponse("Enter a password to continue.", 400);
    return serverError(error);
  }
}

export async function DELETE(request, context) {
  if (!isSameOrigin(request)) return errorResponse("Request origin was not accepted.", 403);
  try {
    const cookie = await destroySession(request, context.env);
    return json({ authenticated: false }, { headers: { "set-cookie": cookie } });
  } catch (error) {
    return serverError(error);
  }
}
