import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  foreignKey,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Drizzle-Schema — **1:1** aus `SQL/create_tables.sql` (Single Source of Truth).
 *
 * Wichtig: Tabellen- und Spaltennamen exakt übernehmen — inkl. der Typos
 * `note_improvment`, `userTable`, `userSession`. Nicht „korrigieren".
 * Domänen-Wissen (Status-/Quality-Bedeutungen) wird via `.$comment()` gespiegelt.
 */

/** curriculum (Rahmenlehrplan), z. B. `RLP_INF` für Informatik. */
export const curriculum = mysqlTable('curriculum', {
  /** Unique indentifier for each record */
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  /** code of the curriculum */
  code: varchar('code', { length: 10 }).notNull().unique(),
  /** titel of the curriculum */
  titel: text('titel').notNull(),
});

/** areas — Abschnitt (A1, A2, …). */
export const areas = mysqlTable('areas', {
  /** Unique indentifier for each record */
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  /** FK -> curriculum.id (CASCADE) */
  curriculumId: int('curriculum_id', { unsigned: true })
    .notNull()
    .references(() => curriculum.id, { onDelete: 'cascade' }),
  /** code of the area */
  code: varchar('code', { length: 10 }).notNull(),
  /** titel of the area */
  titel: text('titel').notNull(),
});

/** competencies — Kompetenz (A1.1, A1.2, …). */
export const competencies = mysqlTable('competencies', {
  /** Unique indentifier for each record */
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  /** FK -> areas.id (CASCADE) */
  areaId: int('area_id', { unsigned: true })
    .notNull()
    .references(() => areas.id, { onDelete: 'cascade' }),
  /** code of the competencies */
  code: varchar('code', { length: 10 }).notNull(),
  /** description from the competencies */
  description: text('description').notNull(),
});

/**
 * competency_proof — Kompetenzkarte eines Nutzers (zentrale Entität).
 *
 * `status` — **nur 1–6 gelten** (ADR-006):
 * 1=draft, 2=llm_check, 3=llm_check_failed, 4=llm_check_finished, 5=saved, 6=discarded.
 * Das SQL-`CHECK` erlaubt formal bis 10; 7–10 sind eine ungenutzte Lücke.
 */
export const competencyProof = mysqlTable(
  'competency_proof',
  {
    /** Unique indentifier for each record */
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    /** FK -> userTable.id (CASCADE) */
    userId: varchar('user_id', { length: 36 }).notNull().references(() => userTable.id, {
      onDelete: 'cascade',
    }),
    /** FK -> competencies.id (NO ACTION) */
    competencyId: int('competency_id', { unsigned: true }).notNull().references(
      () => competencies.id,
    ),
    /**
     * Duplikat einer eigenen Karte (Neuausstellung/Vorlage); NULL bei neuen Karten.
     * FK -> competency_proof.id (NO ACTION). Kein Cross-User-Kopieren (ADR-007).
     * (Selbst-Referenz wird unten via extra-Config deklariert, um zirkuläre Typen zu vermeiden.)
     */
    copiedFromProofId: int('copied_from_proof_id', { unsigned: true }),
    /**
     * status of the competency proof.
     * 1=draft, 2=llm_check, 3=llm_check_failed, 4=llm_check_finished, 5=saved, 6=discarded.
     */
    status: int('status')
      .notNull(),
      /*.$comment(
        '1=draft, 2=llm_check, 3=llm_check_failed, 4=llm_check_finished, 5=saved, 6=discarded (nur 1–6 gelten)',
      ),*/
    /** Timestamp when the record was initially created */
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    /** Timestamp when record was last modified */
    updatedAt: datetime('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Selbst-Referenz (NO ACTION): copied_from_proof_id -> competency_proof.id
    fk_competency_proof_copied_from: foreignKey({
      name: 'fk_competency_proof_copied_from',
      columns: [table.copiedFromProofId],
      foreignColumns: [table.id],
    }),
  }),
);

/**
 * competency_input — strukturierte Eingabe (das „Arbeitsergebnis nach Vorgaben").
 */
export const competencyInput = mysqlTable('competency_input', {
  /** Unique indentifier for each record */
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  /** FK -> competency_proof.id (CASCADE) */
  competencyProofId: int('competency_proof_id', { unsigned: true })
    .notNull()
    .references(() => competencyProof.id, { onDelete: 'cascade' }),
  /** What role does the student play within the company? */
  userRole: text('user_role').notNull(),
  /** The ‘what’ in the exercise of competence */
  what: text('what').notNull(),
  /** The ‘how’ in the exercise of competence */
  how: text('how').notNull(),
  /** The ‘why’ behind the exercise of competence */
  why: text('why').notNull(),
  /** Where was this plot carried out? */
  environment: text('environment').notNull(),
  /** The lecturer’s requests (Bedeutung fachlich offen gelassen) */
  subject: text('subject'),
  /** Timestamp when the record was initially created */
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * competency_llm_output — LLM-Output (mit Revisionskette).
 *
 * `quality` (1–4): 1=very bad, 2=bad, 3=good, 4=very good — LLM-seitig gesetzt.
 * `overlap_curriculum` — LLM-seitig gesetzt.
 * `predecessor` — Vorgänger-Output während einer Revision; NULL beim ersten Versuch.
 */
export const competencyLlmOutput = mysqlTable(
  'competency_llm_output',
  {
    /** Unique indentifier for each record */
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    /**
     * Vorgänger-Output während einer Revision; NULL beim ersten Versuch.
     * FK -> competency_llm_output.id (NO ACTION).
     * (Selbst-Referenz wird unten via extra-Config deklariert, um zirkuläre Typen zu vermeiden.)
     */
    predecessor: int('predecessor', { unsigned: true }),
    /** FK -> competency_input.id (CASCADE) */
    competencyInputId: int('competency_input_id', { unsigned: true })
      .notNull()
      .references(() => competencyInput.id, { onDelete: 'cascade' }),
    /** work result output from LLM */
    workResult: text('work_result').notNull(),
    /**
     * Assessment of the quality of the user’s LLM input.
     * 1=very bad, 2=bad, 3=good, 4=very good.
     */
    quality: int('quality')
      .notNull(),
     // .$comment('1=very bad, 2=bad, 3=good, 4=very good (LLM-seitig gesetzt)'),
    /** Which Model was used in this request */
    llmModel: varchar('llm_model', { length: 100 }).notNull(),
    /** Timestamp when the record was initially created */
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    /** Does the Output overlap with the curriculum (LLM-seitig gesetzt) */
    overlapCurriculum: boolean('overlap_curriculum').notNull(),
    /** Note improvments from the LLM (Tippfehler im Spaltennamen wird beibehalten) */
    noteImprovment: text('note_improvment'),
    /** Did the user accept the generated output from the LLM */
    isSaved: boolean('is_saved').notNull().default(false),
    /** If the user is not happy with the output, he can retry it again with a feedback */
    userFeedback: varchar('user_feedback', { length: 255 }),
  },
  (table) => ({
    // Selbst-Referenz (NO ACTION): predecessor -> competency_llm_output.id
    fk_competency_llm_output_predecessor: foreignKey({
      name: 'fk_competency_llm_output_predecessor',
      columns: [table.predecessor],
      foreignColumns: [table.id],
    }),
  }),
);

/** userTable — Nutzer (UUID). */
export const userTable = mysqlTable('userTable', {
  /** Unique indentifier for each record (UUID) */
  id: varchar('id', { length: 36 }).primaryKey(),
  /** name of the user */
  name: text('name').notNull(),
  /** email from the user */
  email: varchar('email', { length: 255 }).notNull().unique(),
  /**
   * password hashed from the user (bcryptjs, 60-Char-Format).
   * (SQL: COLLATE utf8mb4_bin — in Drizzle 0.36.4 nicht auf varchar darstellbar,
   * daher nur dokumentiert; das SQL bleibt Single Source of Truth.)
   */
  passwordHash: varchar('password_hash', { length: 60 }).notNull(),
  /** Timestamp when the record was initially created */
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * userSession — Session / JWT-Hash (UUID).
 * Ein JWT pro Login; Expiry + Revocation serverseitig (ADR-002).
 */
export const userSession = mysqlTable('userSession', {
  /** Unique indentifier for each record (UUID) */
  id: varchar('id', { length: 36 }).primaryKey(),
  /** FK -> userTable.id (CASCADE) */
  userId: varchar('user_id', { length: 36 }).notNull().references(() => userTable.id, {
    onDelete: 'cascade',
  }),
  /**
   * hashed jwt token.
   * (SQL: COLLATE utf8mb4_bin — in Drizzle 0.36.4 nicht auf varchar darstellbar,
   * daher nur dokumentiert; das SQL bleibt Single Source of Truth.)
   */
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  /** expiry date of the token */
  expiresAt: datetime('expires_at').notNull(),
  /** Timestamp when the record was initially created */
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  /** Timestamp when the session is revoked */
  revokedAt: datetime('revoked_at'),
});

/** Typen der Tabellen (für Services/Handler). */
export type Curriculum = typeof curriculum.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type CompetencyProof = typeof competencyProof.$inferSelect;
export type CompetencyInput = typeof competencyInput.$inferSelect;
export type CompetencyLlmOutput = typeof competencyLlmOutput.$inferSelect;
export type User = typeof userTable.$inferSelect;
export type UserSession = typeof userSession.$inferSelect;
