# KompCards Backend

Express on Bun · TypeScript · Drizzle/MySQL · Vercel AI SDK (externer LLM).

## Schichten

```
Handler (dünn, zod) ──▶ Service (Business Logic + Drizzle-Queries) ──▶ MySQL
                              └──(AI SDK)──▶ LLM (extern)
```

- **Kein** DB-Zugriff im Handler. **Keine** Repository-Ebene (ADR-005).
- Datenmodell 1:1 aus `SQL/create_tables.sql` (Single Source of Truth).

## Setup

```bash
bun install
cp .env.example .env   # Werte anpassen
bun run dev            # http://localhost:4000
```

## Kommandos

| Befehl | Zweck |
|---|---|
| `bun run dev` | Dev-Server (Watch) |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (einmalig) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:generate` / `db:push` / `db:studio` | Drizzle-Tooling |

## Definition of Done

`lint` ✔ · `test` ✔ · `typecheck` ✔
