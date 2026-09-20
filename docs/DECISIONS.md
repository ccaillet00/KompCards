# KompCards — Entscheidungen (ADR-Log)

**Stand:** 2026-09-03
Kurze Architektur-Entscheidungsrekorde (ADR) aus dem Requirements-Review. Status: alle **Acceptiert**.

## ADR-001: Repository-Layout
- **Kontext:** „Kein Monorepo", aber FE+BE+DB per docker-compose; jeweils eigene `package.json`.
- **Entscheidung:** **1 Repository, 2 Verzeichnisse** `frontend/` + `backend/`, je eigene `package.json`, root `docker-compose.yml`. **Kein** Shared-Workspace (kein pnpm-workspace/turbo).
- **Konsequenz:** Eigenständige Builds/Installs pro Tier; CI muss beide Verzeichnisse abdecken.

## ADR-002: Auth — Single JWT + serverseitige Session
- **Kontext:** Fixe Tabelle `userSession` (`token_hash`, `expires_at`, `revoked_at`); Anforderungen ohne Token-Strategie.
- **Entscheidung:** **Ein JWT pro Login**; Hash in `userSession.token_hash`; Expiry + Revocation **serverseitig** geprüft.
- **Konsequenz:** Stateful-Prüfung pro Request (Lookup auf `token_hash`); Revocation möglich. Kein Refresh-Token (würde das Schema verletzen).

## ADR-003: Test-Framework
- **Kontext:** „Strikt TDD" + „Tests in CI", aber kein Framework benannt.
- **Entscheidung:** **Vitest** für **Frontend und Backend**.
- **Konsequenz:** Einheitliches Framework; CI-Testschritt via Vitest.

## ADR-004: Passwort-Hashing — bcryptjs
- **Kontext:** Vorgabe „bcrypt", aber natives `bcrypt` ist unter Bun unzuverlässig; `password_hash VARCHAR(60)`.
- **Entscheidung:** **bcryptjs** (Pure-JS), identisches 60-Char-Format & API.
- **Konsequenz:** Kein natives Build-Risiko in Bun/Docker/CI; Schema unverändert.

## ADR-005: Datenzugriff — Service nutzt Drizzle direkt
- **Kontext:** „DB nicht direkt vom API-Handler", Business Logic in Services.
- **Entscheidung:** **Handler → Service (mit Drizzle-Queries) → MySQL.** **Keine** Repository-Ebene.
- **Konsequenz:** Erfüllt die Handler-Vorgabe; weniger Abstraktion/Code (Drizzle ist kein Active-Record-ORM). Eine Repository-Schicht bleibt Option bei austauschbarem DB-Treiber oder geteilten Queries.

## ADR-006: Status-Wertebereich
- **Kontext:** `CHECK(status<=10)`, dokumentiert sind nur 1–6.
- **Entscheidung:** **Nur 1–6 gelten** (draft, llm_check, llm_check_failed, llm_check_finished, saved, discarded). Werte 7–10 als Lücke vermerkt.
- **Konsequenz:** SQL bleibt unangetastet; Dokumentation nennt 1–6 als vollständigen Satz.

## ADR-007: Bedeutung von „Copy"
- **Kontext:** `copied_from_proof_id` („if this card is a copy") fachlich unklar.
- **Entscheidung:** **Duplikat einer eigenen Karte** (z. B. Neuausstellung/Vorlage aus einer eigenen Karte). `NULL` bei neuen Karten.
- **Konsequenz:** Kein Cross-User-Kopieren; FK bleibt Selbst-Referenz.

## ADR-008: CI — GitHub und GitLab
- **Kontext:** CI für Lint + Docker-Image + Tests; später lokales GitLab.
- **Entscheidung:** **Beide** — `.github/workflows` **und** `.gitlab-ci.yml`.
- **Konsequenz:** Zwei Pipeline-Dateien mit identischen Steps (Lint, Tests, Docker-Build).

## ADR-009: Reverse Proxy — Traefik
- **Kontext:** Kommunikation User → Frontend sowie Frontend → Backend (und DB) zentral regeln; CORS vermeiden; Kante/TLS bündeln.
- **Entscheidung:** **Traefik** als Reverse Proxy / Edge Router. Path-basiertes Routing: `/` → Frontend (Nuxt), `/api` → Backend (Express). DB bleibt intern (nur Backend → DB), öffentlich nicht exponiert.
- **Konsequenz:** `docker-compose.yml` erhält einen Traefik-Service (einzige öffentliche Kante); Frontend & API sind same-origin ⇒ kein CORS. Ersetzt die frühere Nuxt-Proxy-Annahme. TLS-Terminierung am Traefik.

## ADR-010: Curriculum-Import — CSV-Upload, Löschen & Neu
- **Kontext:** Rahmenlehrplan-Daten (curriculum, areas, competencies) wurden aus einer Markdown-Datei in drei CSV-Dateien umgewandelt (`backend/csv/curriculum.csv`, `areas.csv`, `competencies.csv`). Ein API-Endpunkt soll diese in die DB importieren. Der Endpunkt ist nur innerhalb der Applikation (auth-geschützt) erreichbar, nicht öffentlich.
- **Entscheidung:**
  - **Ein Endpunkt** `POST /api/curriculum/import` (multipart, 3 Dateien gleichzeitig: `curriculum`, `areas`, `competencies`).
  - **CSV-Struktur:** `curriculum.csv` (`id,code,titel`), `areas.csv` (`id,curriculum_id,code,titel`), `competencies.csv` (`id,area_id,code,description`).
  - **Strategie: Löschen & Neu** (komplett) — bestehende Referenzdaten werden in einer DB-Transaktion gelöscht (children first: competencies → areas → curriculum) und neu eingefügt. Begründung: Die CSVs sind die **Single Source of Truth**; ein Upsert wäre komplexer (Match-Logik, Orphan-Handling) und bei strukturellen Änderungen inkonsistent.
  - **Validierung:** Spaltennamen, Pflichtwerte und numerische IDs werden vor dem Import geprüft (400 bei Fehlern). BOM wird entfernt.
  - **FK-Schutz:** 409 Conflict, falls `competency_proof`-Zeilen existieren (NO ACTION-FK würde sonst verletzt).
  - **ID-Mapping:** CSV-IDs → neue AUTO_INCREMENT-IDs (in-memory Map), da die DB-IDs neu generiert werden.
  - **Auth:** Bestehendes `requireAuth` + `requireUser` (kein separates Admin-Role, da kein Role-System vorhanden).
  - **Bibliotheken:** `csv-parse/sync` (synchrones CSV-Parsing), `multer` (multipart-Upload, memory storage, 5 MB Limit pro Datei).
  - **Response:** `200 { imported: { curriculum: n, areas: n, competencies: n } }`.
- **Konsequenz:**
  - Atomarer Import (Transaktion) — bei Fehler bleibt der vorherige Zustand erhalten.
  - Wiederholter Import ist idempotent (Löschen & Neu).
  - Bestehende Kompetenznachweise schützen vor versehentlichem Datenverlust (409).
  - CSV-Dateien liegen in `backend/csv/` (Versionierung im Repo).

## Offene Entscheidungen

Keine — alle Kernpunkte geschlossen:
- **Nuxt:** Version **4.5.1** (bestätigt).
- **Reverse Proxy / FE→BE-Kommunikation:** **Traefik** (ADR-009).
- **`quality` / `overlap_curriculum`:** **LLM-seitig gesetzt** (bestätigt).
- **Curriculum-Import:** **CSV-Upload, Löschen & Neu** (ADR-010).
