import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

type AuthProviderDescriptor = {
  id: string;
  name: string;
  kind: "oauth" | "credentials";
};

const authProviders: Provider[] = [];
const authProviderDescriptors: AuthProviderDescriptor[] = [];

function registerProvider(provider: Provider, descriptor: AuthProviderDescriptor) {
  authProviders.push(provider);
  authProviderDescriptors.push(descriptor);
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  registerProvider(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    {
      id: "github",
      name: "GitHub",
      kind: "oauth",
    },
  );
}

const devAuthEnabled =
  process.env.AUTH_DEV_ENABLED === "true" && process.env.NODE_ENV !== "production";

if (devAuthEnabled) {
  registerProvider(
    Credentials({
      id: "dev-credentials",
      name: "Local Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const expectedEmail = process.env.AUTH_DEV_EMAIL;
        const expectedPassword = process.env.AUTH_DEV_PASSWORD;

        if (!expectedEmail || !expectedPassword) {
          return null;
        }

        if (
          credentials?.email === expectedEmail &&
          credentials?.password === expectedPassword
        ) {
          return {
            id: `dev-user:${expectedEmail}`,
            email: expectedEmail,
            name: "Local Dev GM",
          };
        }

        return null;
      },
    }),
    {
      id: "dev-credentials",
      name: "Local Dev Login",
      kind: "credentials",
    },
  );
}

export { authProviders, authProviderDescriptors };

export const hasConfiguredAuthProviders = authProviders.length > 0;
export const hasDevCredentialsProvider = devAuthEnabled;
