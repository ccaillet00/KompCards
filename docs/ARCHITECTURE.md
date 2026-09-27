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
   → work_result, quality, quality_statement, overlap_curriculum, note_improvment
4. Success → status = llm_check_finished (4)
   Failure → status = llm_check_failed (3)
5. LLM-Output wird als competency_llm_output gespeichert
6a. Akzeptieren → is_saved = true; proof → saved (5)
6b. Retry mit user_feedback → neuer LLM-Call
    → neue competency_llm_output, predecessor = vorherige Revision
7. Verwerfen → proof → discarded (6)
```

### Auswahl einer LLM-Auswertung

- Alle Auswertungen derselben Erstellungskette teilen dieselbe `competency_input_id`.
- `predecessor` beschreibt innerhalb dieser Eingabe die Revisionsreihenfolge vom ersten zum neuesten Output. Bei fehlenden oder ungültigen Verweisen bleiben die über `competency_input_id` verfügbaren Outputs sichtbar und werden stabil nach `created_at`, danach `id`, eingeordnet.
- Der bestätigte Output ist der innerhalb der Eingabe mit `is_saved = true`. Beim Bestätigen werden die bisherigen Markierungen derselben Eingabe in einer Transaktion entfernt und genau der gewählte Output markiert.
- Bis zu einer abweichenden Produktentscheidung darf eine bestätigte Auswahl geändert werden. Die Karte bleibt dabei im Status `saved` (5).
- Ohne Bestätigung zeigt das Frontend standardmässig den neuesten Output; mit Bestätigung den markierten Output.

## 5. LLM-Anbindung

- **Extern** (separate Maschine), nur die Anbindung ist in Scope.
- **Vercel AI SDK**, **provider-agnostisch**; Endpoint + API-Key + Modell via **Env**.
- **Annahme:** Das LLM liefert ein strukturiertes Ergebnis (`work_result`, `quality` 1–4, `quality_statement`, `overlap_curriculum`, `note_improvment`), validiert per **zod**; das verwendete Modell wird in `llm_model` gespeichert.
- **Kapselung:** Der LLM-Client steht hinter einem **Interface** und wird in Unit-Tests **gemockt** (deterministisch, kein echter LLM-Call).
- **LLM-seitig gesetzt:** `quality`, `quality_statement` und `overlap_curriculum` werden vom LLM erzeugt (bestätigt).

## 6. Auth-Flow (Better Auth)

KompCards verwendet Better Auth 1.7.5 mit dem Drizzle-Adapter für MySQL und dem Admin-Plugin.

```
Login (email + password)
  → Credential-Account in auth_account laden
  → bcryptjs.compare(password, auth_account.password)
  → DB-Session in auth_session anlegen
  → HttpOnly-Session-Cookie setzen
Request mit Cookie
  → Better Auth liest die DB-Session
  → Prüfung: Session vorhanden, nicht abgelaufen, Benutzer nicht gesperrt
  → Zugriff; sonst 401
Logout / Revocation
  → DB-Session löschen
```
- Sessions laufen nach 12 Stunden fest ab; Sliding Refresh und Cookie-Cache sind deaktiviert.
- Bestehende bcryptjs-Hashes (Kostenfaktor 10) werden unverändert als Credential-Passwort übernommen.
- `userTable` und `userSession` bleiben als Legacy-Tabellen erhalten, werden aber nach dem Cutover nicht mehr für Authentifizierung oder Sitzungen verwendet.
- Passwort-Reset ist über eine injizierbare Mail-Schnittstelle vorbereitet. Ohne Mailprovider wird kein Reset-Flow angeboten.
- Optionales GitHub OAuth erstellt neue `auth_user`-Identitäten mit einem GitHub-Account ohne Passwort. Spätere GitHub-Anmeldungen verwenden dieselbe UUID. Bestehende Konten werden weder automatisch noch explizit verknüpft; E-Mail-Kollisionen werden abgelehnt (ADR-018).
- GitHub-Registrierung ist explizit (`requestSignUp`); der Login legt kein neues Konto an. Eine von GitHub bestätigte E-Mail ist erforderlich. OAuth-State liegt in `auth_verification`, OAuth-Tokens werden verschlüsselt gespeichert.
- `GET /api/auth-config` liefert nur die GitHub-Verfügbarkeit; Credentials verbleiben im Backend. Setup: [AUTH_GITHUB_SETUP.md](./AUTH_GITHUB_SETUP.md).
- Eigener E-Mail-Verifizierungsversand und Passkeys sind weiterhin nicht aktiviert.
- Das Admin-Plugin verwaltet Rollen, Sperren, Passwörter und Sessions. Benutzerlöschung und Impersonation sind serverseitig deaktiviert.

## 7. Routing & Frontend → Backend-Kommunikation (Traefik)

**Vorgabe:** Ein **Traefik Reverse Proxy** ist die zentrale Kante und regelt das Routing.

- **Public-Frontend:** `Host(kompcards.ccdevlab.ch)` → Nuxt im `public`-Modus (Landingpage).
- **SaaS-Frontend:** `Host(service.kompcards.ccdevlab.ch)` → Nuxt im `service`-Modus (Login, Dashboard, Kompetenzkarten).
- **Frontend → Backend:** API-Calls des SaaS-Frontends (`/api/…`) laufen same-origin über `Host(service.kompcards.ccdevlab.ch) && PathPrefix(/api)` an Express.
- **Backend → DB:** intern auf dem Docker-Netz, **nicht** öffentlich exponiert.
- **Routing-Basis:** host-basiert; beide Frontends werden aus derselben Nuxt-Codebasis mit unterschiedlichen `NUXT_PUBLIC_APP_MODE`-Werten gebaut. SaaS-Frontend und API bleiben same-origin ⇒ **kein CORS** nötig.
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
| `auth_user` | Aktive Better-Auth-Benutzeridentität | `id` (VARCHAR(36)) |
| `auth_account` | Authentifizierungsmethoden: Credential oder GitHub | `id` (VARCHAR(36)) |
| `auth_session` | Aktive DB-Sitzungen | `id` (VARCHAR(36)) |
| `auth_verification` | Zeitlich begrenzte Reset-/Verifikationstoken | `id` (VARCHAR(36)) |

**Beziehungen:**
- `curriculum` 1→N `areas` 1→N `competencies` (CASCADE).
- Nach dem Auth-Cutover: `auth_user` 1→N `competency_proof`, `auth_account` und `auth_session` (jeweils CASCADE).
- Legacy: `userTable` 1→N `userSession` (CASCADE). Beide Tabellen bleiben bestehen.
- Bestehende Identitäten behalten dieselbe UUID in `userTable.id`, `auth_user.id`, `auth_account.user_id` und `competency_proof.user_id`.
- `competency_proof` 1→N `competency_input` (CASCADE) 1→N `competency_llm_output` (CASCADE).
- `competency_proof` N→1 `competencies` (NO ACTION).
- Selbst-Referenzen (NO ACTION): `competency_proof.copied_from_proof_id` (Copy), `competency_llm_output.predecessor` (Revision).

**Enums:** `status` 1–6 (s. [PROJECT.md](./PROJECT.md)); `quality` 1–4 (1=very bad … 4=very good). Booleans: `overlap_curriculum`, `is_saved`.

> **Wichtig:** Spaltennamen **1:1** übernehmen — inkl. des Tippfehlers `note_improvment`. Domänen-Kommentare zusätzlich via `.$comment()`/JSDoc im TS-Schema; das SQL bleibt Single Source of Truth.

## 9. Curriculum-Import (CSV)

Die Referenzdaten (`curriculum`, `areas`, `competencies`) werden per **CSV-Upload** importiert.

- **Endpunkt:** `POST /api/curriculum/import` (multipart, 3 Dateien: `curriculum`, `areas`, `competencies`).
- **Auth:** Erfordert gültige Better-Auth-Session und die Rolle `admin`.
- **Strategie:** **Löschen & Neu** (komplett) — bestehende Referenzdaten werden gelöscht und neu eingefügt.
- **FK-Schutz:** Falls `competency_proof`-Zeilen existieren → **409 Conflict** (Import abgelehnt).
- **ID-Mapping:** CSV-IDs werden auf neue AUTO_INCREMENT-IDs gemappt (in-memory Map).
- **Transaktion:** Löschen + Einfügen in einer DB-Transaktion (atomar).
- **Parsing:** `csv-parse/sync` (synchron); **Upload:** `multer` (memory storage, max. 5 MB/Datei).
- **Service:** `CurriculumService` (Business Logic + Drizzle-Queries, ADR-005).

```
POST /api/curriculum/import  (multipart: curriculum.csv, areas.csv, competencies.csv)
  → requireAuth + requireUser + requireAdmin
  → multer (3 Dateien, memory)
  → CurriculumService.importCurriculum()
      1. CSVs parsen & validieren (Spalten, Werte)
      2. FK-Check: competency_proof existiert? → 409
      3. Transaktion: DELETE (competencies → areas → curriculum) + INSERT (mit ID-Mapping)
  → 200 { imported: { curriculum: n, areas: n, competencies: n } }
```

## 10. Entscheidungen

Siehe [DECISIONS.md](./DECISIONS.md).
