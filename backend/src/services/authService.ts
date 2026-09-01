import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import type { AppConfig } from '../config.js';
import type { Database } from '../db/client.js';
import { userSession, userTable, type User } from '../db/schema.js';

import { hashToken, signToken } from '../auth/jwt.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

/** bcrypt-Kostenfaktor (klassisches 60-Char-Format, ADR-004). */
const BCRYPT_ROUNDS = 10;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  /** Signiertes JWT (im `Authorization: Bearer <token>`-Header senden). */
  token: string;
  /** Gültigkeitsdauer in Sekunden. */
  expiresInSeconds: number;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

/**
 * Auth-Service: Registrierung, Login (JWT + serverseitige Session), Logout.
 *
 * Business Logic **und** Drizzle-Queries (ADR-005). Kein DB-Zugriff im Handler.
 */
export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly config: AppConfig,
  ) {}

  /**
   * Registriert einen neuen Nutzer.
   * @throws `ConflictError`, wenn die E-Mail bereits existiert.
   */
  async register(input: RegisterInput): Promise<Pick<User, 'id' | 'name' | 'email'>> {
    const existing = await this.db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('E-Mail ist bereits registriert');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const id = randomUUID();

    await this.db.insert(userTable).values({
      id,
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return { id, name: input.name, email: input.email };
  }

  /**
   * Login: prüft Passwort (bcryptjs), erzeugt ein JWT und speichert dessen
   * Hash als serverseitige Session (ADR-002).
   * @throws `UnauthorizedError` bei falschen Zugangsdaten.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const rows = await this.db
      .select()
      .from(userTable)
      .where(eq(userTable.email, input.email))
      .limit(1);
    const user = rows[0];

    if (!user) {
      throw new UnauthorizedError('Ungültige Zugangsdaten');
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedError('Ungültige Zugangsdaten');
    }

    const token = signToken(this.config, { id: user.id, email: user.email });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.jwtTtlSeconds * 1000);

    await this.db.insert(userSession).values({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return {
      token,
      expiresInSeconds: this.config.jwtTtlSeconds,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  /**
   * Logout: widerruft die serverseitige Session (setzt `revoked_at`).
   * Idempotent — ein nicht vorhandenes Token ist kein Fehler.
   */
  async logout(token: string): Promise<void> {
    const rows = await this.db
      .select({ id: userSession.id })
      .from(userSession)
      .where(eq(userSession.tokenHash, hashToken(token)))
      .limit(1);

    const session = rows[0];
    if (!session) {
      return;
    }

    await this.db
      .update(userSession)
      .set({ revokedAt: new Date() })
      .where(eq(userSession.id, session.id));
  }
}
