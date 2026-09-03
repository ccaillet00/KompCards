# KompCards — Tech-Stack

**Stand:** 2026-09-03
**Legende:** **Vorgabe** / **Annahme** (s. [PROJECT.md](./PROJECT.md)).

## Frontend

| Baustein | Wahl | Anmerkung |
|---|---|---|
| Framework | **Nuxt 4.5.1** | Vorgabe (Version **4.5.1** bestätigt). |
| CSS / Utility | **Tailwind CSS** | Vorgabe |
| UI-Komponenten | **daisyUI** | Vorgabe (Tailwind-Plugin) |
| Icons | **`@iconify-json`** (Iconify) | Vorgabe („iconfiy-json" → `@iconify-json/*`) |
| Linter | **ESLint** | Vorgabe |
| Tests | **Vitest** | Vorgabe |

## Backend

| Baustein | Wahl | Anmerkung |
|---|---|---|
| Runtime | **Bun** | Vorgabe |
| Web-Server | **Express** | Vorgabe |
| Sprache | **ausschließlich TypeScript** | Vorgabe |
| Schema-/Input-Validierung | **zod** | Vorgabe |
| LLM-Anbindung | **Vercel AI SDK** | Vorgabe; provider-agnostisch, Konfiguration via Env |
| ORM | **Drizzle ORM** | Vorgabe; baut das SQL-Schema nach |
| Datenbank | **MySQL** | Vorgabe (utf8mb4) |
| DB-Treiber | **mysql2** | [Annahme] Drizzle-MySQL-Standard |
| Passwort-Hashing | **bcryptjs** | Vorgabe **abgeändert**: natives `bcrypt` ist unter Bun unzuverlässig → Pure-JS `bcryptjs` (gleiches 60-Char-Format). Siehe ADR-004. |
| Logging | **pino** | Vorgabe |
| Linter | **ESLint** | Vorgabe |
| Tests | **Vitest** | Vorgabe |
| CSV-Parsing | **csv-parse** (sync) | ADR-010; synchrones Parsing für den Curriculum-Import |
| File-Upload | **multer** | ADR-010; multipart-Upload (memory storage, 5 MB Limit) |

## Querschnitt

| Baustein | Wahl | Anmerkung |
|---|---|---|
| Linting | **ESLint** | FE + BE, je eigene Konfiguration |
| Tests | **Vitest** | FE + BE |
| Containerisierung | **Docker / docker-compose** | Traefik, FE, BE, DB gemeinsam startbar |
| Reverse Proxy | **Traefik** | Zentrale Kante: User → Frontend, Frontend → Backend; DB intern |
| CI | **GitHub Actions + GitLab CI** | Beide; Lint + Tests + Docker-Image |
| Datenmodell-Quelle | `SQL/*.sql` → Drizzle | Fixes SQL-Schema als Single Source of Truth |

## Begründungen (kurz)
- **bcryptjs statt bcrypt:** `bcrypt` ist natives C++; native Addons sind unter **Bun** unzuverlässig. `bcryptjs` liefert dasselbe 60-Char-Hashformat und dieselbe API — passt zu `password_hash VARCHAR(60)`.
- **Drizzle ohne Repository-Schicht:** Drizzle ist kein Active-Record-ORM; kompakte Queries wohnen direkt im Service. Erfüllt die Vorgabe „DB nicht im Handler" ohne überflüssige Abstraktion.

## Umgebungsvariablen (Beispiel — Annahme)

```
# Backend
DATABASE_URL=mysql://user:pass@db:3306/kompcards_db
JWT_SECRET=...
LLM_BASE_URL=...        # externer LLM (aus Scope)
LLM_API_KEY=...
LLM_MODEL=...
PORT=4000

# Frontend
NUXT_API_BASE=/api      # same-origin; Traefik leitet /api an Backend weiter
```
