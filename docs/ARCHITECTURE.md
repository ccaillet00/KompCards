# KompCards — Architektur

**Stand:** 2026-09-03
**Legende:** **Vorgabe** / **Annahme** (s. [PROJECT.md](./PROJECT.md)).

## 1. Gesamtüberblick (3-Tier)

**Vorgabe:** 3-Tier-Architektur — **Frontend**, **Backend**, **Datenbank**. Kein Monorepo: Frontend und Backend liegen in **einem Repository** mit **eigenen `package.json`** (`frontend/`, `backend/`) plus root `docker-compose.yml`. Ein Shared-Workspace (pnpm-workspace/turbo) wird **nicht** verwendet.

Der **LLM** ist extern (separate Maschine, aus Scope) und wird nur angebunden.

Ein **Traefik Reverse Proxy** (Vorgabe) ist die zentrale Kante und regelt das Routing **User → Frontend** sowie **Frontend → Backend**; die Datenbank bleibt intern (nur Backend → DB, nicht öffentlich exponiert).

```
                          ┌────────────────────┐
        User ────────────▶│       Traefik      │   (Reverse Proxy / Edge, TLS)
                          └─────────┬──────────┘
            PathPrefix(/)  │        │  PathPrefix(/api)
                           ▼        ▼
                ┌────────────────┐ ┌─────────────────┐
                │    Frontend    │ │     Backend     │
                │  Nuxt 4.5.1 +  │ │  Express on Bun │
                │  Tailwind/…    │ └───┬─────────┬───┘
                └────────────────┘     │         │
                              (Drizzle)│         │ (AI SDK)
                                       ▼         ▼
                             ┌───────────┐ ┌──────────────┐
                             │   MySQL   │ │  LLM (extern)│
                             │  (intern) │ │  (aus Scope) │
                             └───────────┘ └──────────────┘
```

## 2. Repository- & Verzeichnisstruktur

**Vorgabe (1 Repo, 2 Verzeichnisse):**
```
/                       (Repo-Root)
├── frontend/           (eigene package.json)
├── backend/            (eigene package.json)
├── SQL/                (fixes Datenmodell — Single Source of Truth)
├── traefik/            (Traefik-Config)
├── docs/
├── docker-compose.yml
└── .github/workflows/  +  .gitlab-ci.yml   (beide CI)
```
Kein Shared-Workspace. `docker-compose.yml` startet Traefik, Frontend, Backend und DB gemeinsam.

## 3. Backend-Schichten

**Vorgabe:** API-Handler **dünn**, Business Logic in **Services**, **DB darf nicht direkt vom API-Handler** zugegriffen werden. **Keine** zusätzliche Repository-Ebene.

- **Handler/Route (dünn):** Request entgegennehmen, Input per **zod** validieren, Service aufrufen, HTTP-Response formen. **Kein DB-Zugriff.**
- **Service:** Business Logic **und** die **Drizzle-Queries**. Der Datenzugriff lebt hier.
- **Drizzle → MySQL.**

```
Handler ──(zod)──▶ Service ──(Drizzle)──▶ MySQL
                      └──(AI SDK)──▶ LLM (extern)
```

> Begründung „keine Repository-Ebene": Drizzle ist kein Active-Record-ORM; kompakte Queries wohnen direkt im Service. Erfüllt die Handler-Vorgabe ohne überflüssige Abstraktion. (Siehe ADR-005.)

## 4. Kern-Datenfluss: Kompetenzkarte erzeugen

```
1. Student gibt competency_input ein (what/how/why/…)
2. Service: competency_proof.status = llm_check (2)
3. Service ruft LLM ab (AI SDK, provider-agnostisch)
   → work_result, quality, overlap_curriculum, note_improvment
4. Success → status = llm_check_finished (4)
   Failure → status = llm_check_failed (3)
5. LLM-Output wird als competency_llm_output gespeichert
6a. Akzeptieren → is_saved = true; proof → saved (5)
6b. Retry mit user_feedback → neuer LLM-Call
    → neue competency_llm_output, predecessor = vorherige Revision
7. Verwerfen → proof → discarded (6)
```

## 5. LLM-Anbindung

- **Extern** (separate Maschine), nur die Anbindung ist in Scope.
- **Vercel AI SDK**, **provider-agnostisch**; Endpoint + API-Key + Modell via **Env**.
- **Annahme:** Das LLM liefert ein strukturiertes Ergebnis (`work_result`, `quality` 1–4, `overlap_curriculum`, `note_improvment`), validiert per **zod**; das verwendete Modell wird in `llm_model` gespeichert.
- **Kapselung:** Der LLM-Client steht hinter einem **Interface** und wird in Unit-Tests **gemockt** (deterministisch, kein echter LLM-Call).
- **LLM-seitig gesetzt:** `quality` und `overlap_curriculum` werden vom LLM erzeugt (bestätigt).

## 6. Auth-Flow (JWT + serverseitige Session)

**Vorgabe (Schema) + aus Q&A:**
```
Login (email + password)
  → bcryptjs.compare(password, password_hash)      [userTable]
  → JWT erzeugen
  → Hash(JWT) in userSession speichern             (token_hash)
  → expires_at setzen, revoked_at = NULL
Request mit JWT
  → JWT signatur-/zeitmäßig prüfen
  → Hash(JWT) in userSession suchen
  → Prüfung: nicht revoked, expires_at > now
  → Zugriff; sonst 401
Logout / Revocation
  → revoked_at setzen (serverseitig)
```
- Ein JWT pro Login; Expiry + Revocation werden **serverseitig** geprüft (passt exakt zum fixen `userSession`-Schema).
- Passwort-Hashing: **bcryptjs** (Pure-JS; `password_hash VARCHAR(60)` = klassisches bcrypt-Format).

## 7. Routing & Frontend → Backend-Kommunikation (Traefik)

**Vorgabe:** Ein **Traefik Reverse Proxy** ist die zentrale Kante und regelt das Routing.

- **User → Frontend:** Traefik leitet die Web-App-Requests an Nuxt weiter (`PathPrefix(/)`).
- **Frontend → Backend:** API-Calls des Frontends (`/api/…`) laufen zurück durch Traefik an Express (`PathPrefix(/api)`).
- **Backend → DB:** intern auf dem Docker-Netz, **nicht** öffentlich exponiert.
- **Routing-Basis:** path-basiert (`/`, `/api`) als Voreinstellung → Frontend & API sind same-origin ⇒ **kein CORS** nötig (alternativ host-basiert).
- **Kante/TLS:** Terminierung am Traefik (z. B. Let's Encrypt); DB & LLM bleiben hinter der Kante.
- **Annahme:** API-Style = REST/JSON.

## 8. Datenmodell (fix)

1:1 aus `SQL/create_tables.sql`. Tabellen, Spalten, FKs und Enums sind dort definiert und werden exakt übernommen.

| Tabelle | Zweck | Primärschlüssel |
|---|---|---|
| `curriculum` | Rahmenlehrplan (z. B. `RLP_INF`) | `id` (AUTO_INCREMENT) |
| `areas` | Abschnitt (A1, A2 …) | `id` (AUTO_INCREMENT) |
| `competencies` | Kompetenz (A1.1, …) | `id` (AUTO_INCREMENT) |
| `competency_proof` | Kompetenzkarte eines Nutzers | `id` (AUTO_INCREMENT) |
| `competency_input` | Strukturierte Eingabe zur Karte | `id` (AUTO_INCREMENT) |
| `competency_llm_output` | LLM-Output (mit Revisionskette) | `id` (AUTO_INCREMENT) |
| `userTable` | Nutzer (UUID) | `id` (VARCHAR(36)) |
| `userSession` | Session / JWT-Hash (UUID) | `id` (VARCHAR(36)) |

**Beziehungen:**
- `curriculum` 1→N `areas` 1→N `competencies` (CASCADE).
- `userTable` 1→N `competency_proof` (CASCADE); `userTable` 1→N `userSession` (CASCADE).
- `competency_proof` 1→N `competency_input` (CASCADE) 1→N `competency_llm_output` (CASCADE).
- `competency_proof` N→1 `competencies` (NO ACTION).
- Selbst-Referenzen (NO ACTION): `competency_proof.copied_from_proof_id` (Copy), `competency_llm_output.predecessor` (Revision).

**Enums:** `status` 1–6 (s. [PROJECT.md](./PROJECT.md)); `quality` 1–4 (1=very bad … 4=very good). Booleans: `overlap_curriculum`, `is_saved`.

> **Wichtig:** Spaltennamen **1:1** übernehmen — inkl. des Tippfehlers `note_improvment`. Domänen-Kommentare zusätzlich via `.$comment()`/JSDoc im TS-Schema; das SQL bleibt Single Source of Truth.

## 9. Curriculum-Import (CSV)

Die Referenzdaten (`curriculum`, `areas`, `competencies`) werden per **CSV-Upload** importiert.

- **Endpunkt:** `POST /api/curriculum/import` (multipart, 3 Dateien: `curriculum`, `areas`, `competencies`).
- **Auth:** Erfordert gültige Session (`requireAuth` + `requireUser`).
- **Strategie:** **Löschen & Neu** (komplett) — bestehende Referenzdaten werden gelöscht und neu eingefügt.
- **FK-Schutz:** Falls `competency_proof`-Zeilen existieren → **409 Conflict** (Import abgelehnt).
- **ID-Mapping:** CSV-IDs werden auf neue AUTO_INCREMENT-IDs gemappt (in-memory Map).
- **Transaktion:** Löschen + Einfügen in einer DB-Transaktion (atomar).
- **Parsing:** `csv-parse/sync` (synchron); **Upload:** `multer` (memory storage, max. 5 MB/Datei).
- **Service:** `CurriculumService` (Business Logic + Drizzle-Queries, ADR-005).

```
POST /api/curriculum/import  (multipart: curriculum.csv, areas.csv, competencies.csv)
  → requireAuth + requireUser
  → multer (3 Dateien, memory)
  → CurriculumService.importCurriculum()
      1. CSVs parsen & validieren (Spalten, Werte)
      2. FK-Check: competency_proof existiert? → 409
      3. Transaktion: DELETE (competencies → areas → curriculum) + INSERT (mit ID-Mapping)
  → 200 { imported: { curriculum: n, areas: n, competencies: n } }
```

## 10. Entscheidungen

Siehe [DECISIONS.md](./DECISIONS.md).
