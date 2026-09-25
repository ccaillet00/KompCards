import { randomUUID } from 'node:crypto';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';

import type { AppConfig } from '../config.js';
import type { Database } from '../db/client.js';
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from '../db/authSchema.js';
import { hashPassword, verifyPassword } from './password.js';

const authSchema = {
  auth_user: authUser,
  auth_account: authAccount,
  auth_session: authSession,
  auth_verification: authVerification,
};

export interface PasswordResetMailer {
  sendPasswordReset(input: {
    recipient: { id: string; name: string; email: string };
    resetUrl: string;
  }): Promise<void>;
}

export function createBetterAuth(
  db: Database,
  config: AppConfig,
  passwordResetMailer?: PasswordResetMailer,
) {
  const origin = new URL(config.betterAuthUrl).origin;

  return betterAuth({
    appName: 'KompCards',
    secret: config.betterAuthSecret,
    baseURL: origin,
    basePath: '/api/auth',
    trustedOrigins: [origin],
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema: authSchema,
      transaction: true,
    }),
    advanced: {
      disableOriginCheck: false,
      database: {
        generateId: () => randomUUID(),
      },
    },
    user: {
      modelName: 'auth_user',
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId === 'github' && user.emailVerified !== true) {
          return { error: 'github_email_not_verified' };
        }
      },
    },
    account: {
      modelName: 'auth_account',
      accountLinking: { enabled: false },
      encryptOAuthTokens: true,
      storeStateStrategy: 'database',
    },
    socialProviders: config.github ? {
      github: { ...config.github, disableImplicitSignUp: true },
    } : {},
    onAPIError: { errorURL: `${origin}/login` },
    session: {
      modelName: 'auth_session',
      expiresIn: 43_200,
      disableSessionRefresh: true,
    },
    verification: { modelName: 'auth_verification' },
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
      ...(passwordResetMailer
        ? {
            sendResetPassword: async ({ user, url }: {
              user: { id: string; name: string; email: string };
              url: string;
              token: string;
            }) => passwordResetMailer.sendPasswordReset({
              recipient: { id: user.id, name: user.name, email: user.email },
              resetUrl: url,
            }),
            revokeSessionsOnPasswordReset: true,
          }
        : {}),
    },
    plugins: [admin()],
    disabledPaths: [
      '/link-social',
      '/unlink-account',
      '/admin/remove-user',
      '/admin/impersonate-user',
      '/admin/stop-impersonating-user',
    ],
  });
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;
