# AGENTS.md

Kurzes Handlungs-Briefing für Coding-Agents (Claude Code, Codex, …) in **KompCards**.
Kein Ersatz für die Doku — für Details: `docs/` sowie den implementierten Schema-Stand unter `backend/src/db/`.

## Projekt (2 Zeilen)
Web-App für HF-Studierende: Kompetenzkarten strukturiert erfassen; ein LLM erzeugt den Output.
3-Tier: Nuxt-Frontend / Express-on-Bun-Backend / MySQL. Der LLM ist extern (separate Maschine) — nur seine **Anbindung** gehört ins Repo.

## Erst lesen (in dieser Reihenfolge)
1. `docs/ARCHITECTURE.md` — Schichten, Datenfluss, Datenmodell
2. `docs/DEVELOPMENT.md` — TDD, Tests, Lint, Docker, CI, Struktur
3. `docs/PROJECT.md` — Zweck & Domäne
4. `docs/TECH_STACK.md` — Stack & Env-Variablen
5. `docs/DECISIONS.md` — getroffene Entscheidungen (ADR)
6. Bei Frontend-/UI-Arbeit: `docs/design/DESIGN.md` — Designsystem, Bildwelt, Seiten und Designregeln
7. Bei Frontend-/UI-Arbeit: passendes Mockup unter `docs/design/references/` und bestehende Seite/Komponenten
8. Bei DB-Arbeit: `backend/src/db/schema.ts` plus Datenmodell in `docs/ARCHITECTURE.md`

> **Schema-Hinweis:** Der frühere `SQL/`-Ordner wurde aus dem Repository entfernt, ältere Dokumente nennen ihn noch als ursprüngliche Single Source of Truth. Bis eine kanonische SQL-Quelle wiederhergestellt ist, das Datenmodell nicht eigenmächtig ändern. Der implementierte Stand liegt in `backend/src/db/schema.ts`; fachliche Schemaänderungen zuerst mit dem Nutzer klären und danach Dokumentation sowie Drizzle-Schema konsistent aktualisieren.

## Repo-Layout
- **1 Repo, 2 Verzeichnisse** — kein Monorepo, kein Workspace-Tooling:
  - `frontend/` — Nuxt 4.5.1 (eigene `package.json`)
  - `backend/` — Express on Bun (eigene `package.json`)
- `docs/design/` — verbindliche Designgrundlage + Mockup-Referenzen
- `frontend/public/` — produktive Logo- und Bildassets
- `docker-compose.yml` — Backend-, Frontend- & DB-Container. Traefik läuft **ausserhalb** des Repos (externes Netzwerk `proxy`, Routing via Labels); kein `traefik/`-Ordner im Repo
- `backend/drizzle/` — Drizzle-Migrationen (Schema wird beim Backend-Start gepusht, nicht aus SQL-Dateien)
- `.github/workflows/` **und** `.gitlab-ci.yml` — CI (beide pflegen!)

## Stack
- **Frontend:** Nuxt 4.5.1, Tailwind, daisyUI, `@iconify-json`, ESLint, Vitest
- **Backend:** Bun, Express, **nur TypeScript**, zod, Drizzle ORM, MySQL, **bcryptjs**, pino, Vercel AI SDK, ESLint, Vitest

## Harte Regeln
1. **Striktes TDD (Vitest):** erst *fehlender* Test → minimal grün → Refaktor. Kein Produktionscode ohne Test.
2. **Schichten:** dünner Handler (zod-Validierung + Response) → Service (Business Logic **und** Drizzle-Queries) → MySQL. **Kein** DB-Zugriff im Handler. **Keine** Repository-Ebene.
3. **Datenmodell ist fix:** den dokumentierten und implementierten Schema-Stand **1:1** erhalten — inkl. Typos (`note_improvment`) und Namen (`userTable`, `userSession`). `status` **nur 1–6**, `quality` **1–4**. Nicht „korrigieren"; siehe Schema-Hinweis oben.
4. **LLM:** extern, Client **hinter Interface**, in Tests **gemockt** (nie echter LLM-Call). Config nur via Env (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). `quality`/`overlap_curriculum` = LLM-seitig.
5. **Auth:** Single JWT + serverseitige Session (Hash in `userSession.token_hash`, Expiry/Revocation serverseitig). Hashing: **bcryptjs**, nicht natives `bcrypt`.
6. **Routing:** Traefik (läuft extern, Routing via Labels im Compose), host-basiert (`kompcards.ccdevlab.ch` → Public-Frontend, `service.kompcards.ccdevlab.ch` → SaaS-Frontend und `/api` → Backend). DB intern; Compose-Mapping `3306:3306` nur für lokale Entwicklung, in Produktion entfernen.
7. **Nur TypeScript** im Backend.
8. **Nicht pushen und nicht committen** — der Nutzer committet und pusht.

## Verbindliche Designregeln

1. `docs/design/DESIGN.md` ist die Design-Übergabe. Bei UI-Arbeit vollständig lesen und den passenden visuellen Referenzstand unter `docs/design/references/` prüfen.
2. Mockups sind **nur Referenzen**. Niemals Dateien aus `docs/design/references/` als Runtime-UI oder Seitenhintergrund einbinden.
3. Produktive Assets ausschliesslich aus `frontend/public/` verwenden. Die bestehende Zuordnung der Fuchswelt zu Landing, Auth, Dashboard, Kompetenzwahl und Dokumentation beibehalten.
4. Bedienbare Oberfläche immer semantisch mit Vue/HTML, Tailwind und daisyUI umsetzen. Bild und Illustration sind dekorativ und dürfen Inhalt oder Bedienung nie verdecken.
5. Bestehende Design-Tokens und UI-Bausteine wiederverwenden: Theme in `frontend/tailwind.config.cjs`, globale Muster in `frontend/assets/css/main.css`, Komponenten in `frontend/components/ui/`.
6. Illustration rechts ausrichten, Proportionen erhalten und mit den vorhandenen Masken/Blend-Klassen weich in `base-100` überführen. Keine harte Bildkante, kein unnötiges `object-cover` auf App-Seiten, kein Text direkt auf unruhigem Bildgrund.
7. Dekorative Bilder: `aria-hidden="true"` am Container und leeres `alt`. Fokus, Labels, Kontrast, Überschriftenhierarchie und `prefers-reduced-motion` erhalten.
8. Desktop-first für die App; Landing Page auf schmalen Viewports bedienbar halten. Neue Mobile-Navigation oder Dark Mode nur als bewusste, dokumentierte Entscheidung.
9. Keine Funktion nur für ein Mockup vortäuschen. API, Typen und Composables zuerst prüfen; nicht implementierte Funktionen deaktivieren, kennzeichnen oder ausblenden.
10. Auch UI-Arbeit folgt TDD. Bestehende `data-test`-Selektoren sind Testverträge. Nach visuellen Änderungen zusätzlich Landing, Auth und die betroffene App-Seite visuell auf Bildbeschnitt, Verlauf, Lesbarkeit, Fokus und Überlagerungen prüfen.

## Kommandos (je Tier; Scripts in `package.json`)
- `frontend/`: `bun run dev` · `bun run lint` · `bun run test` · `bun run typecheck` · `bun run build`
- `backend/`: dito, zusätzlich `bun run db:generate` / `db:push` / `db:studio` (Drizzle)
- Gesamtsystem: `docker compose up` (Frontend + Backend + DB; Traefik extern)

## Konventionen
- DB-Objekt-/Spaltennamen **exakt** wie im dokumentierten und implementierten Schema; siehe Schema-Hinweis oben.
- Domänen-Wissen (Status-/Quality-Bedeutungen) im Drizzle-/TS-Schema via `.$comment()`/JSDoc.
- Konfiguration (DB, JWT, LLM) **nur** via Env (siehe `docs/TECH_STACK.md`).

## Definition of Done (pro Änderung)
`lint` ✔ · `test` ✔ · `typecheck` ✔ — für Frontend **und** Backend.

## Wenn unklar
→ Erst `docs/` lesen. Fachliche Unklarheit: **nicht raten, nachfragen**. Neue Entscheidungen als ADR in `docs/DECISIONS.md` ergänzen.
