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

## ADR-014: Prägnante, evidenzbasierte Kompetenzformulierungen

- **Kontext:** Der bisherige Systemprompt trennt Vorgehen, Zweck und erreichtes Ergebnis zu wenig. Die Eingaben sollen stichwortartig bleiben und für alle HF-Studiengänge geeignet sein.
- **Entscheidung:** `work_result` verwendet Ich-Form und Perfekt in 1–2 Sätzen mit höchstens 60 Wörtern. `quality_statement` beschreibt ein berichtetes Ergebnis in genau einem Satz mit höchstens 30 Wörtern; ohne Ergebnisnachweis benennt es die fehlende Information. Dies präzisiert die bisherige Längenregel aus ADR-011. Keine erfundenen Methoden, Messwerte, Abnahmen oder Erfolge; Widersprüche werden zur Klärung benannt.
- **Bewertung:** `quality` bleibt eine Bewertung der Aussagekraft der Eingabe (1–4), keine Leistungsnote. Stufe 1: keine Handlung oder wesentlicher Widerspruch; 2: Handlung, aber Methode oder Zweck unklar; 3: Handlung, Methode und Zweck nachvollziehbar; 4: zusätzlich überprüfbares Ergebnis. Stichwortstil wird nicht abgewertet, negative Ergebnisse können Stufe 4 erfüllen.
- **Konsequenz:** Schema und Feldnamen bleiben unverändert. Ohne Kompetenzbeschreibung wird `overlap_curriculum = false` mit einem Hinweis auf die fehlende Beurteilbarkeit ausgegeben; das bestehende Boolean unterscheidet unbekannten und fehlenden Bezug nicht. Prompt-Vertragstests sichern die Anweisungen; die tatsächliche Modelltreue muss separat evaluiert werden.

## ADR-015: Separater, providerunabhängiger Eval-Runner

- **Kontext:** Prompt- und Modelländerungen sollen mit demselben synthetischen Kompetenzkarten-Set auf vLLM und Online-Modellen vergleichbar werden.
- **Entscheidung:** Ein explizit gestarteter TypeScript-CLI-Runner unter `backend/src/eval/` nutzt den aktuellen Systemprompt und `buildPrompt()`, ein gemeinsames Transport-Schema und die bestehende lokale Zod-Validierung. Provideradapter für vLLM/OpenAI-kompatible Chat-Completions und Anthropic Messages verwenden ein in Tests gemocktes Transport-Interface. Standard ist ein Dry-run; reale Aufrufe erfolgen nur mit `--run`, sequenziell und ohne Retry oder Reparatur.
- **Bewertung:** Automatische Prüfungen, Laufzeit und Tokens werden von menschlichen Kriterien für Faktentreue und Sprache getrennt. Fehlgeschlagene Versuche bleiben im Ergebnis; unbekannte Werte und offene Reviews sind null. Erwartete Antworten werden nie an das zu prüfende Modell übermittelt.
- **Konsequenz:** Keine Änderung der produktiven LLM-Anbindung oder des DB-Schemas. Laufdaten, Prompt-/Dataset-Snapshots und Berichte liegen im Git-ignorierten `eval-results/`. Reale Modellaufrufe sind kein Bestandteil der regulären Vitest-/CI-Läufe. Das Set bleibt synthetisch und seine fachlichen Labels müssen geprüft werden.

## Offene Entscheidungen

Keine — alle Kernpunkte geschlossen:
- **Nuxt:** Version **4.5.1** (bestätigt).
- **Reverse Proxy / FE→BE-Kommunikation:** **Traefik** (ADR-009).
- **`quality` / `overlap_curriculum`:** **LLM-seitig gesetzt** (bestätigt).
- **`quality_statement`:** **LLM-seitig gesetzt, Pflichtfeld** (ADR-011).
- **Curriculum-Import:** **CSV-Upload, Löschen & Neu** (ADR-010).
- **LLM-Auswahl:** `is_saved` markiert genau eine auswählbare Revision der aktuellen Eingabe; erneute Auswahl ist vorerst erlaubt (ADR-012).
