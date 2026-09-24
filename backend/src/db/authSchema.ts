import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

/** Better Auth 1.7.5 core user model plus fields from the admin plugin. */
export const authUser = mysqlTable('auth_user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  role: varchar('role', { length: 255 }).default('user'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: datetime('ban_expires'),
});

/** Authentication methods linked to the stable KompCards user identity. */
export const authAccount = mysqlTable(
  'auth_account',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: datetime('access_token_expires_at'),
    refreshTokenExpiresAt: datetime('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('auth_account_user_id_idx').on(table.userId),
    uniqueIndex('auth_account_provider_account_uidx').on(table.providerId, table.accountId),
  ],
);

/** Database-backed Better Auth session; cookie caching remains disabled. */
export const authSession = mysqlTable(
  'auth_session',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    expiresAt: datetime('expires_at').notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    ipAddress: varchar('ip_address', { length: 255 }),
    userAgent: text('user_agent'),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    impersonatedBy: varchar('impersonated_by', { length: 36 }),
  },
  (table) => [index('auth_session_user_id_idx').on(table.userId)],
);

/** Tokens for future password-reset and verification flows. */
export const authVerification = mysqlTable(
  'auth_verification',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: text('value').notNull(),
    expiresAt: datetime('expires_at').notNull(),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)],
);

export type AuthUser = typeof authUser.$inferSelect;
export type AuthAccount = typeof authAccount.$inferSelect;
export type AuthSession = typeof authSession.$inferSelect;
export type AuthVerification = typeof authVerification.$inferSelect;
