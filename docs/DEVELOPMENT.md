# KompCards — Entwicklung

**Stand:** 2026-09-01
**Legende:** **Vorgabe** / **Annahme** (s. [PROJECT.md](./PROJECT.md)).

## 1. Arbeitsweise: striktes TDD

**Vorgabe:** **Striktes TDD** für alle Features. Zyklus:
1. **Red:** Zuerst ein **fehlerhafter Test** (Vitest) schreiben, der das Zielverhalten spezifiziert.
2. **Green:** Mindest-Implementierung, bis der Test grün ist.
3. **Refactor:** Implementierung bereinigen, Tests bleiben grün.

Regeln:
- Kein Produktionscode ohne vorherigen Test.
- **LLM-abhängige Services** werden über das LLM-Interface **gemockt** getestet (kein echter LLM-Call in Unit-Tests).

## 2. Tests

- **Framework:** Vitest (Frontend + Backend).
- **Ausführung (lokal):**
  - Frontend: `cd frontend && bun run test` (bzw. `bunx vitest run`)
  - Backend: `cd backend && bun run test`
- **Typen:** `bun run typecheck` (`tsc --noEmit`) als eigene Schicht.
- **In CI:** Tests laufen als eigener Step.

## 3. Linting

- **ESLint** in Frontend und Backend (je eigene Konfiguration).
- **In CI:** Lint-Step; bricht die Pipeline bei Fehlern.

## 4. Docker & docker-compose

- Services: **Traefik** (Reverse Proxy), **Frontend**, **Backend**, **DB** (MySQL).
- `docker-compose.yml` (Repo-Root) startet alle gemeinsam; **Traefik ist die einzige öffentlich exponierte Kante**.
- [Annahme] Backend-Image auf Bun-Basis; Frontend-Image auf Nuxt-Build-Basis; DB = MySQL-Image mit Initialisierung aus `SQL/`; Traefik = offizielles Traefik-Image.

## 5. CI-Pipelines

**Vorgabe:** **beide** GitHub **und** GitLab (ein lokales GitLab wird später aufgesetzt). Jede Pipeline führt:
1. Lint (ESLint, FE + BE)
2. Tests (Vitest, FE + BE)
3. Docker-Image bauen

- **GitHub:** `.github/workflows/*.yml`
- **GitLab:** `.gitlab-ci.yml`
- [Annahme] Gemeinsame Steps via `bun install` → `bun run lint` → `bun run test` → `docker build`.

## 6. Versionskontrolle

- **Kein Push nach GitHub durch mich** — der Nutzer übernimmt das Pushen.
- Ich bereite Commits/Vorbereitung vor, pushe aber nicht.

## 7. Verzeichnisstruktur (Ziel)

```
/                      (Repo-Root)
├── frontend/          (Nuxt 4, eigene package.json)
├── backend/           (Express on Bun, eigene package.json)
│   └── src/
│       ├── routes/    (dünne Handler)
│       ├── services/  (Business Logic + Drizzle-Queries)
│       ├── db/        (Drizzle-Schema + Client)
│       └── ...
├── SQL/               (fixes Datenmodell)
├── traefik/           (Traefik-Config: dynamic labels + certresolver)
├── docs/
├── docker-compose.yml
├── .github/workflows/
└── .gitlab-ci.yml
```

## 8. Konventionen

- **Namen:** DB-Objekte exakt wie im SQL (inkl. `note_improvment`, `userTable`, `userSession`).
- **Domänen-Wissen:** Spalten-/Status-Bedeutungen im TS-Schema via `.$comment()`/JSDoc dokumentieren.
- [Annahme] API = REST/JSON; `/api`-Proxy im Frontend.
- [Annahme] LLM-Endpoint/Key/Modell ausschließlich via Env.

## 9. Offene Punkte

Keine offenen Kernpunkte. Bestätigt: **Nuxt 4.5.1**, **Traefik-Reverse-Proxy** (Routing) und **LLM-seitiges** `quality`/`overlap_curriculum`.
