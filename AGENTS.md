# AGENTS.md

Kurzes Handlungs-Briefing für Coding-Agents (Claude Code, Codex, …) in **KompCards**.
Kein Ersatz für die Doku — für Details: `docs/` und `SQL/`.

## Projekt (2 Zeilen)
Web-App für HF-Studierende: Kompetenzkarten strukturiert erfassen; ein LLM erzeugt den Output.
3-Tier: Nuxt-Frontend / Express-on-Bun-Backend / MySQL. Der LLM ist extern (separate Maschine) — nur seine **Anbindung** gehört ins Repo.

## Erst lesen (in dieser Reihenfolge)
1. `docs/ARCHITECTURE.md` — Schichten, Datenfluss, Datenmodell
2. `docs/DEVELOPMENT.md` — TDD, Tests, Lint, Docker, CI, Struktur
3. `docs/PROJECT.md` — Zweck & Domäne
4. `docs/TECH_STACK.md` — Stack & Env-Variablen
5. `docs/DECISIONS.md` — getroffene Entscheidungen (ADR)
6. `SQL/create_tables.sql` — **Single Source of Truth** fürs Datenmodell

## Repo-Layout
- **1 Repo, 2 Verzeichnisse** — kein Monorepo, kein Workspace-Tooling:
  - `frontend/` — Nuxt 4.5.1 (eigene `package.json`)
  - `backend/` — Express on Bun (eigene `package.json`)
- `SQL/` — fixes Datenmodell · `traefik/` + `docker-compose.yml` — Reverse Proxy & Container
- `.github/workflows/` **und** `.gitlab-ci.yml` — CI (beide pflegen!)

## Stack
- **Frontend:** Nuxt 4.5.1, Tailwind, daisyUI, `@iconify-json`, ESLint, Vitest
- **Backend:** Bun, Express, **nur TypeScript**, zod, Drizzle ORM, MySQL, **bcryptjs**, pino, Vercel AI SDK, ESLint, Vitest

## Harte Regeln
1. **Striktes TDD (Vitest):** erst *fehlender* Test → minimal grün → Refaktor. Kein Produktionscode ohne Test.
2. **Schichten:** dünner Handler (zod-Validierung + Response) → Service (Business Logic **und** Drizzle-Queries) → MySQL. **Kein** DB-Zugriff im Handler. **Keine** Repository-Ebene.
3. **Datenmodell ist fix:** `SQL/create_tables.sql` **1:1** übernehmen — inkl. Typos (`note_improvment`) und Namen (`userTable`, `userSession`). `status` **nur 1–6**, `quality` **1–4**. Nicht „korrigieren".
4. **LLM:** extern, Client **hinter Interface**, in Tests **gemockt** (nie echter LLM-Call). Config nur via Env (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). `quality`/`overlap_curriculum` = LLM-seitig.
5. **Auth:** Single JWT + serverseitige Session (Hash in `userSession.token_hash`, Expiry/Revocation serverseitig). Hashing: **bcryptjs**, nicht natives `bcrypt`.
6. **Routing:** Traefik, path-basiert (`/` → Frontend, `/api` → Backend). DB intern, nicht exponieren.
7. **Nur TypeScript** im Backend.
8. **Nicht auf GitHub pushen** — der Nutzer pusht.

## Kommandos (je Tier; Scripts in `package.json`)
- `frontend/`: `bun run dev` · `bun run lint` · `bun run test` · `bun run typecheck` · `bun run build`
- `backend/`: dito
- Gesamtsystem: `docker compose up` (Traefik + Frontend + Backend + DB)

## Konventionen
- DB-Objekt-/Spaltennamen **exakt** wie im SQL.
- Domänen-Wissen (Status-/Quality-Bedeutungen) im Drizzle-/TS-Schema via `.$comment()`/JSDoc.
- Konfiguration (DB, JWT, LLM) **nur** via Env (siehe `docs/TECH_STACK.md`).

## Definition of Done (pro Änderung)
`lint` ✔ · `test` ✔ · `typecheck` ✔ — für Frontend **und** Backend.

## Wenn unklar
→ Erst `docs/` lesen. Fachliche Unklarheit: **nicht raten, nachfragen**. Neue Entscheidungen als ADR in `docs/DECISIONS.md` ergänzen.
