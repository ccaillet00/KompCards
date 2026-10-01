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

## ADR-015: Prägnante, evidenzbasierte Kompetenzformulierungen

- **Kontext:** Der bisherige Systemprompt trennt Vorgehen, Zweck und erreichtes Ergebnis zu wenig. Die Eingaben sollen stichwortartig bleiben und für alle HF-Studiengänge geeignet sein.
- **Entscheidung:** `work_result` verwendet Ich-Form und Perfekt in 1–2 Sätzen mit höchstens 60 Wörtern. `quality_statement` beschreibt ein berichtetes Ergebnis in genau einem Satz mit höchstens 30 Wörtern; ohne Ergebnisnachweis benennt es die fehlende Information. Dies präzisiert die bisherige Längenregel aus ADR-011. Keine erfundenen Methoden, Messwerte, Abnahmen oder Erfolge; Widersprüche werden zur Klärung benannt.
- **Bewertung:** `quality` bleibt eine Bewertung der Aussagekraft der Eingabe (1–4), keine Leistungsnote. Stufe 1: keine Handlung oder wesentlicher Widerspruch; 2: Handlung, aber Methode oder Zweck unklar; 3: Handlung, Methode und Zweck nachvollziehbar; 4: zusätzlich überprüfbares Ergebnis. Stichwortstil wird nicht abgewertet, negative Ergebnisse können Stufe 4 erfüllen.
- **Konsequenz:** Schema und Feldnamen bleiben unverändert. Ohne Kompetenzbeschreibung wird `overlap_curriculum = false` mit einem Hinweis auf die fehlende Beurteilbarkeit ausgegeben; das bestehende Boolean unterscheidet unbekannten und fehlenden Bezug nicht. Prompt-Vertragstests sichern die Anweisungen; die tatsächliche Modelltreue muss separat evaluiert werden.

## ADR-016: Separater, providerunabhängiger Eval-Runner

- **Kontext:** Prompt- und Modelländerungen sollen mit demselben synthetischen Kompetenzkarten-Set auf vLLM und Online-Modellen vergleichbar werden.
- **Entscheidung:** Ein explizit gestarteter TypeScript-CLI-Runner unter `backend/src/eval/` nutzt den aktuellen Systemprompt und `buildPrompt()`, ein gemeinsames Transport-Schema und die bestehende lokale Zod-Validierung. Provideradapter für vLLM/OpenAI-kompatible Chat-Completions und Anthropic Messages verwenden ein in Tests gemocktes Transport-Interface. Standard ist ein Dry-run; reale Aufrufe erfolgen nur mit `--run`, sequenziell und ohne Retry oder Reparatur.
- **Bewertung:** Automatische Prüfungen, Laufzeit und Tokens werden von menschlichen Kriterien für Faktentreue und Sprache getrennt. Fehlgeschlagene Versuche bleiben im Ergebnis; unbekannte Werte und offene Reviews sind null. Erwartete Antworten werden nie an das zu prüfende Modell übermittelt.
- **Konsequenz:** Keine Änderung der produktiven LLM-Anbindung oder des DB-Schemas. Laufdaten, Prompt-/Dataset-Snapshots und Berichte liegen im Git-ignorierten `eval-results/`. Reale Modellaufrufe sind kein Bestandteil der regulären Vitest-/CI-Läufe. Das Set bleibt synthetisch und seine fachlichen Labels müssen geprüft werden.

## ADR-017: Hinweis-Listen an der produktiven LLM-Grenze normalisieren

- **Kontext:** Das eingesetzte Modell liefert `note_improvment` teilweise als String-Liste statt als String/null; die SDK-Validierung verwirft dadurch die gesamte Auswertung.
- **Entscheidung:** Der Prompt verlangt explizit einen einzelnen JSON-String oder null. Der produktive Client verbindet dennoch gelieferte reine String-Listen vor der Validierung mit Zeilenumbrüchen; eine leere Liste wird null. Andere Typen und ungültige Werte der übrigen Felder werden weiterhin abgelehnt.
- **Konsequenz:** DB, API und Domänenschema bleiben unverändert. Das übermittelte JSON-Schema verlangt weiterhin String/null. Die separate Evaluation bleibt strikt und zählt Listen weiterhin als Formatfehler, damit Modellvergleiche die tatsächliche Schematreue zeigen.

## ADR-018: GitHub OAuth ausschliesslich für neue Konten

- **Kontext:** Nach der erfolgreichen Auth-Migration ist GitHub als weitere Anmeldeoption gewünscht. Die App ist noch nicht produktiv; bestehende Konten sollen ausdrücklich nicht verknüpft werden.
- **Entscheidung:** Optionaler GitHub-Provider in Better Auth 1.7.5. Registrierung legt eine neue `auth_user.id` und einen `auth_account` mit `provider_id = github` und der stabilen GitHub-ID als `account_id` an. Kein Credential-Passwort wird erzeugt. Wiederholte Logins behalten dieselbe UUID und damit den Kartenbesitz.
- **Kontentrennung:** Account-Linking ist serverseitig deaktiviert; `/link-social` und `/unlink-account` sind zusätzlich gesperrt. E-Mail-Kollisionen führen zu einem Fehler, niemals zur Zusammenführung. E-Mail-/Passwort-Registrierung und -Login bleiben bestehen. Eine nachträgliche Passwortvergabe für GitHub-Konten wird nicht angeboten.
- **Registrierung:** `disableImplicitSignUp` verlangt den expliziten Registrierungsmodus. Im Registrierungsformular ist die vorhandene Zustimmung auch für GitHub nötig; das ist wie beim Credential-Formular eine UI-Prüfung, kein persistierter Zustimmungsnachweis. Der Login-Button erzeugt keine neuen Nutzer. GitHub muss eine verifizierte E-Mail liefern, auch private Adressen werden unterstützt.
- **Betrieb:** Separate OAuth Apps für Entwicklung und Produktion. `GITHUB_CLIENT_ID` und `GITHUB_CLIENT_SECRET` sind gemeinsam optional; Teilkonfiguration verhindert den Start. `/api/auth-config` meldet nur Verfügbarkeit. Keine Schemaänderung; bestehende Auth-Tabellen reichen aus. State wird in der DB abgelegt; Tokenverschlüsselung verwendet das bestehende Better-Auth-Secret. Sessiondauer und Admin-Regeln bleiben bestehen.
- **Tests:** Reale Better-Auth-Handler und GitHub-Provider mit Memory-Adapter anstelle von Drizzle und gemocktem GitHub-HTTP. Keine externen OAuth-Aufrufe in CI. Ein echter Browser-/MySQL-/Traefik-Durchlauf bleibt Teil der Aktivierungsabnahme.

## ADR-019: Drei W — Was, Wie und Wozu

- **Kontext:** Formular und Eingabeprompt fragten nach «Warum» beziehungsweise der Begründung einer Methode. Fachlich soll das dritte W den Zweck und Nutzen der Tätigkeit erfassen; ADR-015 beschreibt bereits Handlung, Methode und Zweck.
- **Entscheidung:** Was = ausgeführte Handlung, Wie = Vorgehen/Methode, Wozu = angestrebter Zweck/Nutzen. Formular, Auswertung und LLM-Prompt verwenden diese Bedeutung durchgehend. Der technische Feldname `why` bleibt in API, TypeScript und `competency_input` bestehen; keine Schemaänderung oder Migration.
- **LLM:** Ein beabsichtigter Nutzen gilt weiterhin nicht als erreichtes Ergebnis. Ist nur die Methodenwahl begründet und kein Zweck erkennbar, fragt das LLM nach dem Zweck, statt ihn zu erfinden. Bewertung und Ausgabeschema aus ADR-015 bleiben erhalten.
- **Bestandsdaten:** Bestehende Eingaben und gespeicherte Auswertungen werden nicht umgeschrieben oder automatisch neu erzeugt. Bei zukünftigen Prüfungen und Retries gilt der neue Prompt; fehlende Zwecke werden als Informationslücke behandelt.
- **Validierung:** Vitest sichert Texte, Pflichtfeldverhalten, bestehenden `why`-Transport und Prompt-Verträge. Dataset v0.2 ergänzt drei synthetische Entwicklungsfälle; v0.1 bleibt als historische Vergleichsgrundlage erhalten. Modelltreue wird separat evaluiert.

## ADR-020: Ergebnisorientierter LLM-Prompt und getrennte Eingabebewertung

- **Kontext:** Der Eval-Lauf `2026-09-30T20-19-35-793Z-3b976f3f` verwendet einen anderen Prompt als der ursprüngliche Worktree. Er zeigt verlorene Ergebnisnachweise, fehlende Rollen, Grammatikfehler und die Vermischung von Curriculum-Passung und Eingabequalität. Der Nutzer hat die Überarbeitung anhand dieser Analyse beauftragt.
- **Entscheidung:** `work_result` verbindet Was/Wie/Wozu in 1–2 kurzen Sätzen, nennt die angegebene Rolle ausdrücklich und verwendet Ich-Form und Perfekt. `quality_statement` beschreibt in genau einem Satz ein überprüfbares Ergebnis aus den Sachangaben; Methoden und Handlung werden nicht wiederholt. Damit wird die in ADR-011 und ADR-015 definierte Qualitätsbeschreibung fachlich präzisiert. Zusammen ergeben beide Texte 2–3 Sätze.
- **Fehlende Nachweise:** Aus Wie/Wozu darf ein konkretes Zielkriterium abgeleitet, aber kein erreichter Erfolg behauptet werden. Ohne Beleg wird dieses Kriterium ausdrücklich als noch nicht nachgewiesen bezeichnet und der Nachweis in `note_improvment` konkret nachgefragt. Fehlt auch ein ableitbares Kriterium, wird die spezifische Informationslücke benannt. Der pauschale Ergebnis-Fallback entfällt.
- **Bewertung:** `quality` bewertet die ursprünglichen Sachangaben: 1 = keine konkrete Handlung oder wesentlicher Widerspruch; 2 = Methode/Zweck unklar; 3 = Handlung/Methode/Zweck klar; 4 = zusätzlich Ergebnisnachweis. Negative Ergebnisse zählen ebenfalls. Curriculum-Passung wird unabhängig davon bewertet. Das bestehende Feld `why` wird im LLM-Prompt als Wozu (Zweck/Nutzen) bezeichnet; reine Methodenbegründungen werden nicht in einen Zweck umgedeutet.
- **Konsequenz:** Schema, Wertebereiche und Client-Interface bleiben unverändert. Prompt-Vertrag per Vitest geprüft; Beispiele verdeutlichen qualitative Freigabe, negatives Ergebnis, fehlenden Nachweis und Widerspruch. Sprachliche Wirkung und Fehlerquote müssen separat mit Gemma evaluiert werden; Unit-Tests machen keine echten LLM-Aufrufe. Das historische Eval-Dataset erwartet teilweise den alten Fallback und benötigt vor einem semantischen Vergleich eine versionierte Anpassung.

## ADR-021: Informatik-Evaluation mit CSV-Kompetenzkontext

- **Kontext:** Der Nutzer stellt Curriculum-, Bereichs- und Kompetenz-CSV-Dateien für Informatik bereit. Der bisherige Benchmark verwendet erfundene Kompetenztexte und ältere Ergebnis-Fallback-Regeln.
- **Entscheidung:** Ein ergänzendes explizit auswählbares Set mit 40 synthetischen Praxiseingaben auf unveränderten CSV-Kompetenztexten. 30 development-Fälle decken alle 15 Bereiche ab; zehn holdout-Fälle verwenden andere Kompetenzen. Varianten bleiben im gleichen Split. 20 von 91 Kompetenzen werden für Fälle verwendet; der gesamte Katalog und Quellprüfsummen werden als JSON festgehalten.
- **Bewertung:** ADR-020, konkrete offene Kriterien bei fehlendem Nachweis, getrennte Eingabequalität und Curriculum-Passung. Semantische Erwartungen und Labels bleiben bis zum menschlichen Review ungeprüft. Die Nutzer-Exporte sind keine unabhängig bestätigte offizielle Lehrplanversion. Inputs sind keine echten Studierendenfälle.
- **Konsequenz:** Keine DB-, Prompt- oder Runneränderung; bisherige Sets und Standardauswahl bleiben erhalten. Nur explizite Modellläufe verwenden das neue Set; Schema-, Quellen- und Splitprüfungen laufen in Vitest ohne LLM-Aufruf. Holdout nicht zur Promptoptimierung verwenden. Ein Vergleich unterschiedlicher Datensätze ist kein direkter Nachweis einer Promptverbesserung.

## ADR-022: Verständliche Kartenführung und explizites Speichern

- **Kontext:** Fortschritt, KI-Auswertungen und abgeschlossene Karten waren in der Oberfläche schwer auseinanderzuhalten. Lange Formulare und administrative Aktionen brauchten eindeutigere Rückmeldung.
- **Entscheidung:** Status 4 heisst in der UI „Auswertung bereit“, Status 5 „Karte abgeschlossen“. Das Ziel von 45 Karten zählt Status 5. Die Kartenübersicht kombiniert lokale Text-, Bereichs- und Statusfilter. Formulare behalten das ausdrückliche Speichern mit sichtbarem Speicherzustand und Verlassenswarnung; keine lokale Persistenz fachlicher Eingaben. Auswertungen trennen Vorschau, Eingabequalität, Lehrplanbezug und ausdrückliche Übernahme. Kritische administrative Aktionen zeigen vor Ausführung Wirkung und betroffene Person.
- **Konsequenz:** Keine Änderung an Datenmodell, Statuswerten oder produktiver LLM-Anbindung. Vorhandene API-Verträge werden verwendet, inklusive Offset-Paginierung der Administration. Die App bleibt desktop-first; vorhandene Navigation und Aktionen dürfen umbrechen. Noch nicht freigegebene Rechtstexte und Kontaktangaben werden sichtbar als in Ausarbeitung gekennzeichnet.

## Offene Entscheidungen

Keine — alle Kernpunkte geschlossen:
- **Nuxt:** Version **4.5.1** (bestätigt).
- **Reverse Proxy / FE→BE-Kommunikation:** **Traefik** (ADR-009).
- **`quality` / `overlap_curriculum`:** **LLM-seitig gesetzt** (bestätigt).
- **`quality_statement`:** **LLM-seitig gesetzt, Pflichtfeld** (ADR-011).
- **Curriculum-Import:** **CSV-Upload, Löschen & Neu** (ADR-010).
- **LLM-Auswahl:** `is_saved` markiert genau eine auswählbare Revision der aktuellen Eingabe; erneute Auswahl ist vorerst erlaubt (ADR-012).
