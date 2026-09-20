# KompCards

Web-Applikation für Studierende an der Höheren Fachschule (HF): **Kompetenzkarten** strukturiert erfassen, per LLM ausformulieren lassen und als Leistungsnachweis sichern.

Eine Kompetenzkarte dokumentiert, wie ein Studierender eine konkrete **Kompetenz** (abgeleitet aus dem Rahmenlehrplan) in einem Arbeitsnachweis umgesetzt hat. Studierende geben ihr Arbeitsergebnis über ein strukturiertes Formular ein; ein **LLM** erzeugt daraus die Ausformulierung/Bewertung, die revidiert, gespeichert oder verworfen werden kann.

> **Scope:** Der LLM läuft auf einer **separaten Maschine** und liegt außerhalb dieses Projekts. In Scope ist ausschließlich die **Anbindung** (API-Call, Prompt, strukturierte Auswertung des Outputs).

---

## 1. Was ist eine Kompetenzkarte?

Kompetenzen sind hierarchisch gegliedert, abgeleitet vom **Rahmenlehrplan**:

| Ebene | Tabelle | Beispiel |
|---|---|---|
| Curriculum / Rahmenlehrplan | `curriculum` | `RLP_INF` (Informatik) |
| Area / Abschnitt | `areas` | `A1`, `A2` |
| Kompetenz | `competencies` | `A1.1`, `A1.2` |

Eine **Kompetenzkarte** (`competency_proof`) ist die zentrale Entität: die Zuordnung eines **Nutzers** zu einer konkreten **Kompetenz** samt dem dazugehörigen Arbeitsnachweis. Sie trägt einen **Status** und verknüpft drei Teile:

1. **Strukturierte Eingabe** (`competency_input`) — das vom Studierenden ausgefüllte Formular.
2. **LLM-Output** (`competency_llm_output`) — die maschinelle Ausformulierung/Bewertung (kann mehrere **Revisionen** umfassen).
3. **Status** — der aktuelle Bearbeitungsstand der Karte.

---

## 2. So funktioniert's (Lebenszyklus)

```
                 ┌──────────────────────────────┐
                 │   1 draft (Entwurf)          │
                 │  Studierende erfasst Input   │
                 └──────────────┬───────────────┘
                                │  LLM-Prüfung auslösen
                 ┌──────────────▼───────────────┐
                 │   2 llm_check (läuft)        │
                 └───────┬─────────────────┬────┘
                         │                │
              ┌──────────▼───────┐  ┌─────▼────────────────┐
              │ 4 llm_check_     │  │ 3 llm_check_failed   │
              │   finished       │  │   (→ zurück/Retry)   │
              │ Output wird      │  └──────────────────────┘
              │ angezeigt        │
              └──────────┬───────┘
                         │  akzeptieren  /  mit Feedback revidieren (Retry)
                         │  ┌──────────────────────────────────────────┐
                         │  │ Revision: neuer Output verweist über    │
                         │  │ `predecessor` auf den Vorgänger          │
                         │  └──────────────────────────────────────────┘
                 ┌───────┴──────────┐
                 │                  │
      ┌──────────▼────────┐  ┌──────▼───────────┐
      │  5 saved          │  │  6 discarded     │
      │  (gespeichert)    │  │  (verworfen)     │
      └───────────────────┘  └──────────────────┘
```

**Status-Werte (nur 1–6 gelten):**

| Wert | Status | Bedeutung |
|---|---|---|
| 1 | `draft` | Entwurf, Eingabe wird ausgefüllt |
| 2 | `llm_check` | LLM-Prüfung läuft |
| 3 | `llm_check_failed` | LLM-Prüfung fehlgeschlagen |
| 4 | `llm_check_finished` | LLM-Prüfung abgeschlossen |
| 5 | `saved` | gespeichert |
| 6 | `discarded` | verworfen |

*(Das SQL-`CHECK` erlaubt formal bis 10 — die Werte 7–10 sind eine ungenutzte Lücke.)*

### Der strukturierte Input

| Feld | Bedeutung |
|---|---|
| `user_role` | Rolle im Unternehmen/Praktikum |
| `what` | das „Was" der Kompetenzübung |
| `how` | das „Wie" |
| `why` | das „Warum" |
| `environment` | Umgebung/Kontext, in dem es erfolgte |
| `subject` | Bedeutung im SQL-Kommentar als „The lecturer's requests" angegeben; spaltengenaue Bedeutung offen gelassen |

### Der LLM-Output

| Feld | Bedeutung |
|---|---|
| `work_result` | der von LLM erzeugte Output (Ausformulierung) |
| `quality` (1–4) | 1=very bad, 2=bad, 3=good, 4=very good — **LLM-seitig** gesetzt |
| `overlap_curriculum` (bool) | überlappt der Output mit dem Curriculum — **LLM-seitig** gesetzt |
| `note_improvment` | Verbesserungshinweise des LLM *(Spaltenname enthält Tippfehler, wird beibehalten)* |
| `llm_model` | verwendetes Modell |
| `is_saved` (bool) | ob der Output vom Nutzer akzeptiert wurde |
| `user_feedback` | Feedback zur erneuten Erzeugung (Retry) |
| `predecessor` | Verweis auf den Vorgänger-Output während einer Revision (`NULL` beim ersten Versuch) |

> **LLM-seitig gesetzt:** `quality` und `overlap_curriculum` erzeugt das LLM als Teil des strukturierten Ergebnisses.

### Revisionskette & Duplikate

- Ein **Retry** mit `user_feedback` erzeugt eine **neue Revision**; die neue Zeile verweist über `predecessor` auf die vorherige. So bleibt die komplette Änderungsgeschichte erhalten.
- Eine Karte kann als **Duplikat einer eigenen Karte** kopiert werden (`copied_from_proof_id`; `NULL` bei neu ausgestellten Karten). **Kein** Cross-User-Kopieren.

---

## 3. So sieht die App aus (geplanter Aufbau)

> Das Frontend ist noch **nicht implementiert**. Folgende Oberflächen sind aus der Domäne abgeleitet und als **Konzept** zu verstehen — die endgültige Gestaltung steht mit dem Frontend-Build fest.

**Technik:** Nuxt 4.5.1 · Tailwind CSS · daisyUI (UI-Components) · Iconify-Icons.

Erwartete Hauptansichten:

1. **Anmeldung / Registrierung**
   Login mit E-Mail + Passwort (JWT + serverseitige Session); Neuanmeldung.

2. **Meine Kompetenzkarten (Übersicht)**
   Liste aller Karten des Nutzers mit Kompetenz-Bezug (z. B. `A1.1`) und aktuellem Status (als Badge, z. B. `draft`/`saved`). Aktionen: Neue Karte anlegen, öffnen, kopieren.

3. **Kartendetail / -editor**
   - Oben: Kompetenz + Status-Badge.
   - **Input-Formular** mit den Feldern *Rolle / Was / Wie / Warum / Umgebung / Subject*.
   - Button **„LLM-Prüfung starten"** → Status wechselt zu `llm_check`.
   - **LLM-Output-Panel**: `work_result` (Text), `quality` (Skala 1–4), `overlap_curriculum`, `note_improvment`.
   - Aktionen: **Akzeptieren** (`is_saved`) oder **Revidieren** (Feedback eingeben → neuer Output).
   - **Revision-Historie**: die Output-Kette via `predecessor`.
   - **Speichern** (`saved`) bzw. **Verwerfen** (`discarded`).

Schematische Skizze des Karteneditors:

```
┌────────────────────────────────────────────────────────────┐
│  Kompetenz A1.1 · Status: [● llm_check_finished]            │
├───────────────────────────────┬────────────────────────────┤
│  Arbeitsnachweis (Input)      │  LLM-Output                │
│  Rolle:  [________________]  │  work_result:              │
│  Was:    [________________]  │  „Klare Ausformulierung…"  │
│  Wie:    [________________]  │  quality:     ● ● ● ○  (3) │
│  Warum:  [________________]  │  overlap:     ja/nein       │
│  Umwelt: [________________]  │  Hinweis:    „Mehr Details" │
│  Subject:[________________]  │                            │
│                               │  [✓ Akzeptieren] [↻ Retry]│
├───────────────────────────────┴────────────────────────────┤
│  [LLM prüfen]   [Speichern]   [Verwerfen]   Revisionen (2)  │
└────────────────────────────────────────────────────────────┘
```

---

## 4. So nutzt man die App (User-Flow)

1. **Registrieren / Anmelden** — Konto mit E-Mail + Passwort anlegen, dann einloggen.
2. **Karte anlegen** — eine Kompetenz auswählen und eine neue Karte erstellen (Startstatus `draft`).
3. **Arbeitsnachweis erfassen** — das strukturierte Formular ausfüllen (*Rolle, Was, Wie, Warum, Umgebung, Subject*).
4. **LLM-Prüfung starten** — das System schickt den Input an den externen LLM; die Karte ist kurz in `llm_check`, danach `llm_check_finished` (bzw. bei Fehler `llm_check_failed`).
5. **Output prüfen** — das LLM-Ergebnis (`work_result`, Qualität, Overlap, Hinweise) ansehen.
   - Passt es → **Akzeptieren** (`is_saved`).
   - Noch nicht → **Revidieren**: Feedback eingeben, LLM erzeugt eine neue Revision (verweist auf die vorherige).
6. **Abschließen** — die Karte **speichern** (`saved`) oder **verwerfen** (`discarded`).
7. **Duplizieren (optional)** — eine eigene Karte als Vorlage/Neuausstellung kopieren.

---

## 5. Architektur

3-Tier — **Frontend / Backend / MySQL** — mit **Traefik** als einziger externer Kante (path-basiertes Routing, same-origin ⇒ kein CORS):

```
User ──> Traefik ──┬── /     ──> Frontend (Nuxt)
                   └── /api  ──> Backend (Express on Bun) ──> MySQL (intern)
```

- **Frontend:** Nuxt 4.5.1, Tailwind, daisyUI, Iconify
- **Backend:** Bun, Express, ausschließlich TypeScript, zod, Drizzle ORM, Vercel AI SDK, bcryptjs, pino
- **DB:** MySQL (utf8mb4); Schema fix, Single Source of Truth via `docs/ARCHITECTURE.md` bzw. Drizzle-Schema
- **Schichten:** dünner Handler (zod-Validierung + Response) → Service (Business Logic + Drizzle-Queries) → DB. **Kein** DB-Zugriff im Handler.
- **Auth:** Single JWT + serverseitige Session (Hash in `userSession.token_hash`, Expiry/Revocation serverseitig).

## 6. Repo-Layout

```
/
├── frontend/          Nuxt 4.5.1 (eigene package.json)
├── backend/           Express on Bun (eigene package.json)
│   └── src/           routes / services / db / llm / auth …
├── traefik/           Traefik-Config
├── docs/              ARCHITECTURE, PROJECT, TECH_STACK, DEVELOPMENT, DECISIONS
├── docker-compose.yml
├── .github/workflows/ CI (GitHub Actions)
└── .gitlab-ci.yml     CI (GitLab)
```

> `frontend/` ist noch nicht gescaffoldet — die CI deckt es automatisch ab, sobald das Verzeichnis existiert.

## 7. Loslegen

Voraussetzungen: **Docker** + **docker compose**, **Bun**.

```bash
# Umgebungsvariablen anlegen
cp .env.example .env

# Gesamtsystem starten (Traefik + Backend + DB)
docker compose up --build
```

Umgebungsvariablen (`.env`, Details in `docs/TECH_STACK.md`):

| Variable | Bedeutung |
|---|---|
| `JWT_SECRET` | JWT-Signierung (langer zufälliger String) |
| `LLM_BASE_URL` | externer LLM-Endpoint |
| `LLM_API_KEY` | LLM-API-Key |
| `LLM_MODEL` | LLM-Modell |
| `NODE_ENV` | Laufzeitumgebung |

### Entwicklung je Tier

```bash
# Frontend
cd frontend && bun run dev        # dev · lint · test · typecheck · build

# Backend
cd backend  && bun run dev        # dito
```

Definition of Done je Änderung: `lint` · `test` · `typecheck` — grün für Frontend **und** Backend.

## 8. Entwicklung & Qualitätsstandards

- **Striktes TDD** (Vitest): erst fehlender Test → minimal grün → Refaktor. Kein Produktionscode ohne Test. LLM-Abhängigkeiten in Tests **gemockt** (nie echter LLM-Call).
- **CI** (GitHub **und** GitLab, identische Steps): Lint → Typecheck → Test → Docker-Build, je Tier.

## 9. Doku

| Thema | Datei |
|---|---|
| Zweck & Domäne | [docs/PROJECT.md](docs/PROJECT.md) |
| Architektur & Datenmodell | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Tech-Stack & Env | [docs/TECH_STACK.md](docs/TECH_STACK.md) |
| TDD, Tests, CI | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Entscheidungen (ADR) | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Agent-Briefing | [AGENTS.md](AGENTS.md) |

## Zur Entstehung

Dieses Projekt wurde **mit Hilfe eines Coding-Agenten** erstellt. Die **grundlegenden Software-Entscheidungen** — Zweck, Datenmodell, Architektur, Tech-Stack und Qualitätsstandards — wurden jedoch vom Menschen getroffen und sind als Vorgaben bzw. ADRs in [`docs/DECISIONS.md`](docs/DECISIONS.md) dokumentiert.
