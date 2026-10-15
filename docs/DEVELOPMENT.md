# KompCards — Entwicklung

**Stand:** 2026-10-10
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

### LLM-Evaluation (explizit, ausserhalb der CI)

Im `backend/`: `bun run eval --dry-run` erstellt einen Request-Plan ohne API-Aufrufe; `bun run eval --run` evaluiert standardmässig denselben SDK-Client wie die Applikation. `EVAL_EXECUTION=direct` wählt ausdrücklich den separaten Modellvergleich (auch für native Anthropic-Aufrufe). Konfiguration, Split-Auswahl und fachliche Nachbewertung stehen in [`evals/RUNNER.md`](./evals/RUNNER.md). Standard ist der development-Split mit drei Wiederholungen. Reale LLM-Aufrufe bleiben von den gemockten Vitest-Tests getrennt.

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

- **Selbständige Git-Verwaltung:** Der Agent darf Branches erstellen, Commits anlegen und zum konfigurierten Remote pushen, ohne dafür erneut die Freigabe des Nutzers einzuholen (ADR-023).
- **Branch-Wahl:** Der Agent prüft vorab den aktuellen Branch und Arbeitsstand und entscheidet, ob ein neuer Branch sinnvoll ist. In der Regel erhält jedes eigenständige Feature oder jeder unabhängige Fix einen eigenen Branch. Gehört die Aufgabe zu einem bestehenden Arbeitsbranch, wird dieser weiterverwendet. Kleine, zusammengehörende Folgeänderungen brauchen keinen zusätzlichen Branch. Neue Branches erhalten kurze, beschreibende Namen, z. B. `feat/kompetenzfilter`, `fix/session-expiry` oder `docs/agent-git-workflow`.
- **Commit-Zeitpunkt:** Der Agent committet, sobald eine fachlich zusammenhängende, überprüfte Änderung abgeschlossen ist. Grössere Aufgaben werden in sinnvolle, eigenständig nachvollziehbare Commits aufgeteilt; unabhängige Änderungen werden getrennt. Vor dem Commit werden Diff und vorgemerkte Dateien geprüft und die Definition of Done erfüllt (`lint`, `test`, `typecheck` für Frontend und Backend).
- **Commit-Messages:** Conventional Commits verwenden: `<type>(<scope>): <kurze Beschreibung>`, wobei der Scope optional ist. Typen sind z. B. `feat`, `fix`, `docs`, `refactor`, `test`, `chore` oder `ci`. Die Beschreibung benennt die konkrete Änderung; ein optionaler Body erklärt Gründe oder relevante Auswirkungen. Beispiel: `docs(agents): allow autonomous branches, commits and pushes`.
- **Push:** Abgeschlossene und geprüfte Commits dürfen selbständig auf den passenden Remote-Branch gepusht werden; bei neuen Branches wird der Upstream gesetzt. Nur die zur Aufgabe gehörenden Änderungen aufnehmen, bestehende Änderungen des Nutzers erhalten und keine Secrets committen. Force-Pushes, das Umschreiben veröffentlichter Historie sowie das Löschen fremder Branches sind von dieser Erlaubnis nicht umfasst.
- **Rückmeldung:** Nach Abschluss nennt der Agent den verwendeten Branch, erstellte Commits, Push-Status und die ausgeführten Prüfungen. Wenn kein Commit oder Push sinnvoll oder möglich war, nennt er kurz den Grund.

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
- **Auth-Setup:** Lokale Datenbanken werden gemäß [`AUTH_LOCAL_SETUP.md`](./AUTH_LOCAL_SETUP.md) leer aufgebaut. Der normale Backend-Start verändert das DB-Schema nicht.
- **Domänen-Wissen:** Spalten-/Status-Bedeutungen im TS-Schema via `.$comment()`/JSDoc dokumentieren.
- **Frontend-Design:** Verbindliche Tokens, Assets, Komponenten- und Bildregeln stehen in [`design/DESIGN.md`](./design/DESIGN.md). Mockups unter `design/references/` sind nur visuelle Referenzen und keine Runtime-Assets.
- [Annahme] API = REST/JSON; `/api`-Proxy im Frontend.
- [Annahme] LLM-Endpoint/Key/Modell ausschließlich via Env.

## 9. Offene Punkte

Keine offenen Kernpunkte. Bestätigt: **Nuxt 4.5.1**, **Traefik-Reverse-Proxy** (Routing) und **LLM-seitiges** `quality`/`overlap_curriculum`.
