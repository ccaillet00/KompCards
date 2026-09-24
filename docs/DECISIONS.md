# KompCards — Entscheidungen (ADR-Log)

**Stand:** 2026-09-03
Kurze Architektur-Entscheidungsrekorde (ADR) aus dem Requirements-Review. Status: alle **Acceptiert**.

## ADR-001: Repository-Layout
- **Kontext:** „Kein Monorepo", aber FE+BE+DB per docker-compose; jeweils eigene `package.json`.
- **Entscheidung:** **1 Repository, 2 Verzeichnisse** `frontend/` + `backend/`, je eigene `package.json`, root `docker-compose.yml`. **Kein** Shared-Workspace (kein pnpm-workspace/turbo).
- **Konsequenz:** Eigenständige Builds/Installs pro Tier; CI muss beide Verzeichnisse abdecken.

## ADR-002: Auth — Single JWT + serverseitige Session (ersetzt)
- **Kontext:** Fixe Tabelle `userSession` (`token_hash`, `expires_at`, `revoked_at`); Anforderungen ohne Token-Strategie.
- **Entscheidung:** **Ein JWT pro Login**; Hash in `userSession.token_hash`; Expiry + Revocation **serverseitig** geprüft.
- **Konsequenz:** Stateful-Prüfung pro Request (Lookup auf `token_hash`); Revocation möglich. Kein Refresh-Token (würde das Schema verletzen).

Diese Entscheidung wurde durch ADR-014 ersetzt. `userTable` und `userSession` bleiben als Legacy-Struktur bestehen.

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
  - **Auth:** Better-Auth-Session plus explizite Admin-Rolle (`requireAuth` + `requireUser` + `requireAdmin`).
  - **Bibliotheken:** `csv-parse/sync` (synchrones CSV-Parsing), `multer` (multipart-Upload, memory storage, 5 MB Limit pro Datei).
  - **Response:** `200 { imported: { curriculum: n, areas: n, competencies: n } }`.
- **Konsequenz:**
  - Atomarer Import (Transaktion) — bei Fehler bleibt der vorherige Zustand erhalten.
  - Wiederholter Import ist idempotent (Löschen & Neu).
  - Bestehende Kompetenznachweise schützen vor versehentlichem Datenverlust (409).
  - CSV-Dateien liegen in `backend/csv/` (Versionierung im Repo).

## ADR-011: Qualitative Qualitätss Aussage (`quality_statement`)
- **Kontext:** Die numerische Bewertung `quality` (1–4) gibt nur eine grobe Einordnung. Es fehlt eine qualitative Aussage, die die Qualität des Arbeitsergebnisses in Worten beschreibt und begründet — wichtig für das Bewusstsein der Studierenden, welche Qualität eine Tätigkeit/Handlung erhält.
- **Entscheidung:** Neues Pflichtfeld `quality_statement` (TEXT, NOT NULL) in `competency_llm_output`. Das LLM formuliert zu jedem Arbeitsergebnis eine kurze qualitative Aussage (1–2 Sätze). Feld wird LLM-seitig gesetzt und persistent gespeichert.
- **Konsequenz:**
  - LLM-Zod-Schema, Prompt, Client-Mapping und Service-Insert werden um das Feld erweitert.
  - Migration `0001_previous_sunspot.sql` (ALTER TABLE ADD COLUMN).
  - `quality_statement` ist ein Pflichtfeld — das LLM muss immer eine Aussage liefern.

## ADR-012: Auswahl einer LLM-Auswertungsrevision

- **Kontext:** Eine `competency_input` kann durch Retries mehrere `competency_llm_output`-Revisionen besitzen. Die Prüfungsseite muss zwischen ihnen navigieren und genau eine Auswahl dauerhaft merken können. Das bestehende Schema enthält bereits `competency_input_id`, `predecessor` und `is_saved`.
- **Entscheidung:** Keine Schemaänderung. `competency_input_id` grenzt die zusammengehörenden Outputs ab; `predecessor` bestimmt die Reihenfolge vom Ursprung zur Revision. Ungültige oder zyklische Verweise werden im Frontend stabil über `created_at` und `id` aufgefangen. `is_saved = true` kennzeichnet den bestätigten Output. Die Bestätigung setzt innerhalb derselben Eingabe zunächst alle Markierungen auf `false` und danach die gewählte auf `true` (Transaktion). Eine Auswahl darf vorerst auch im Kartenstatus `saved` geändert werden.
- **Konsequenz:** Voransicht und Persistenz sind getrennt. Ein Reload öffnet die gespeicherte Auswahl, andernfalls die neueste Revision. Ältere Revisionen dürfen ausgewählt, aber nicht als Ausgangspunkt eines neuen Retries verwendet werden; die bestehende lineare Neuerstellungslogik bleibt unverändert.

## ADR-013: Host-basierte Trennung von Public- und SaaS-Frontend

- **Kontext:** Landingpage und eingeloggte SaaS-Oberfläche sollen unter getrennten Subdomains erreichbar sein, ohne Frontend-Code zu duplizieren.
- **Entscheidung:** Beide Deployments verwenden dieselbe Nuxt-Codebasis mit unterschiedlichen `NUXT_PUBLIC_APP_MODE`-Werten. `kompcards.ccdevlab.ch` dient dem Public-Frontend, `service.kompcards.ccdevlab.ch` dem SaaS-Frontend. Die API bleibt unter `/api` same-origin auf dem Service-Host.
- **Konsequenz:** Traefik routet host-basiert zu zwei Frontend-Services; Service- und Public-Middleware verhindern falsche Host-/Modus-Zugriffe. Der Auth-Cookie bleibt host-only auf dem Service-Host.

## ADR-014: Better Auth mit stabiler KompCards-Identität

- **Kontext:** Die MVP-Authentifizierung aus `userTable`, JWT und `userSession` wird für den produktiven Betrieb durch eine erweiterbare Auth-Lösung ersetzt. Bestehende Kompetenzkarten müssen unverändert ihren Eigentümern zugeordnet bleiben.
- **Entscheidung:** Better Auth **1.7.5** mit Drizzle/MySQL, E-Mail/Passwort, DB-Sessions und Admin-Plugin. Neue Tabellen laufen parallel: `auth_user`, `auth_account`, `auth_session`, `auth_verification`. Bestehende UUIDs werden 1:1 nach `auth_user.id` und `auth_account.user_id` übernommen; der Credential-Account verwendet in dieser Version `provider_id = credential` und `account_id = auth_user.id`. Das fachliche Identitätsfeld bleibt `auth_user.id`; `account_id` ist kein KompCards-Vertrag. `competency_proof.user_id` wird nicht verändert, nur sein FK-Ziel wechselt auf `auth_user.id` mit `ON DELETE CASCADE`.
- **Sessions:** 12 Stunden, DB-basiert, kein Cookie-Cache und keine Übernahme alter JWT-Sessions. Nach dem Cutover werden JWTs nicht mehr akzeptiert.
- **Passwörter:** Bestehende bcryptjs-Hashes mit Kostenfaktor 10 bleiben gültig. Ein späterer Hashwechsel ist eine eigene Migration.
- **Admin:** Erste Administratoren werden ausschließlich über explizite UUIDs beim Benutzerimport festgelegt. Curriculum-Import benötigt `admin`. Admins erhalten keinen impliziten Zugriff auf fremde Kompetenzkarten. Löschen und Impersonation sind deaktiviert.
- **Erweiterungen:** Passwort-Reset ist hinter einer Mail-Schnittstelle vorbereitet, bleibt ohne Provider unsichtbar. GitHub, E-Mail-Verifizierung und Passkeys folgen separat und müssen dieselbe `auth_user.id` weiterverwenden.
- **Betrieb:** Migrationen laufen explizit vor dem Backend-Start. Die lokale Entwicklung beginnt mit einer leeren Datenbank.

## Offene Entscheidungen

Keine — alle Kernpunkte geschlossen:
- **Nuxt:** Version **4.5.1** (bestätigt).
- **Reverse Proxy / FE→BE-Kommunikation:** **Traefik** (ADR-009).
- **`quality` / `overlap_curriculum`:** **LLM-seitig gesetzt** (bestätigt).
- **`quality_statement`:** **LLM-seitig gesetzt, Pflichtfeld** (ADR-011).
- **Curriculum-Import:** **CSV-Upload, Löschen & Neu** (ADR-010).
- **LLM-Auswahl:** `is_saved` markiert genau eine auswählbare Revision der aktuellen Eingabe; erneute Auswahl ist vorerst erlaubt (ADR-012).
