export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

function getServerAppUserId() {
  return process.env.AFBM_APP_USER_ID ?? process.env.E2E_USER_ID ?? "local-gm";
}

export async function getSessionUserId() {
  return getServerAppUserId();
}

export async function requirePageUserId() {
  return getSessionUserId();
}

export async function requireApiUserId() {
  const userId = await getSessionUserId();

  if (!userId) {
    throw new AuthenticationError();
  }

  return userId;
}
