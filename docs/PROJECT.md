# KompCards — Projektbeschreibung

**Stand:** 2026-09-03
**Legende:** **Vorgabe** = aus deinen Anforderungen bzw. fixem Datenmodell. **Annahme** = von mir ergänzt, zur Bestätigung.

## 1. Zweck & Kontext

KompCards ist eine Web-Applikation für Studierende an der Höheren Fachschule (HF). Sie dient dazu, die im Rahmen der Ausbildung zu erstellenden **Kompetenzkarten** strukturiert festzuhalten.

Ablauf:
1. Studierende beschreiben ihr **Arbeitsergebnis** nach festen Vorgaben (strukturiertes Eingabeformular).
2. Ein **LLM** erzeugt daraufhin den Output (Ausformulierung/Bewertung des Arbeitsergebnisses).
3. Der Output wird erfasst, kann mit Feedback revidiert und abschließend gespeichert oder verworfen werden.

> **Scope-Ausschluss (Vorgabe):** Der LLM ist auf einer **separaten Maschine** gehostet und liegt **außerhalb dieses Projekts**. In Scope ist ausschließlich die **Anbindung** (API-Call, Prompt, strukturierte Auswertung).

## 2. Fachlicher Kontext (Domäne)

Kompetenzen sind hierarchisch gegliedert, abgeleitet vom **Rahmenlehrplan**:
- **Curriculum / Rahmenlehrplan** (`curriculum`) — z. B. `RLP_INF` für Informatik.
- **Area / Abschnitt** (`areas`) — z. B. `A1`, `A2`.
- **Kompetenz** (`competencies`) — z. B. `A1.1`, `A1.2`.

Eine **Kompetenzkarte** (Competency Proof) ist die Zuordnung eines Nutzers zu einer konkreten Kompetenz samt dem dazugehörigen Arbeitsnachweis.

### Kompetenzkarte (`competency_proof`)
Zentrale Entität. Verknüpft Nutzer + Kompetenz und trägt den **Status**.

- **Status** — **Vorgabe, nur 1–6 gelten** (das `CHECK` erlaubt formal bis 10, die Werte 7–10 sind eine ungenutzte Lücke):

  | Wert | Bedeutung |
  |---|---|
  | 1 | `draft` (Entwurf) |
  | 2 | `llm_check` (LLM-Prüfung läuft) |
  | 3 | `llm_check_failed` (LLM-Prüfung fehlgeschlagen) |
  | 4 | `llm_check_finished` (LLM-Prüfung abgeschlossen) |
  | 5 | `saved` (gespeichert) |
  | 6 | `discarded` (verworfen) |

- **Copy** — **Vorgabe:** `copied_from_proof_id` = **Duplikat einer eigenen Karte** (z. B. Neuausstellung/Vorlage aus einer eigenen Karte). `NULL` bei neu ausgestellten Karten. Kein Cross-User-Kopieren.

### Strukturierte Eingabe (`competency_input`)
Das von der Studierenden ausgefüllte Formular — das „Arbeitsergebnis nach Vorgaben":
- `user_role` — Rolle im Unternehmen/Praktikum
- `what` — das „Was" der Kompetenzübung
- `how` — das „Wie"
- `why` — das „Warum"
- `environment` — Umgebung/Kontext, in dem es erfolgte
- `subject` — **Vorgabe, Bedeutung unklar:** SQL-Kommentar „The lecturer's requests"; spaltengenaue Bedeutung offen gelassen

### LLM-Output (`competency_llm_output`)
Maschinelle Auswertung/Ausformulierung des Arbeitsergebnisses:
- `work_result` — der von LLM erzeugte Output
- `quality` (1–4): 1=very bad, 2=bad, 3=good, 4=very good — Bewertung der Qualität des Nutzeingangs
- `overlap_curriculum` (bool) — überlappt der Output mit dem Curriculum
- `note_improvment` — Verbesserungshinweise des LLM *(Spaltenname enthält Tippfehler, wird beibehalten)*
- `llm_model` — verwendetes Modell
- `is_saved` (bool) — ob der Output vom Nutzer akzeptiert wurde
- `user_feedback` — Feedback zur erneuten Erzeugung (Retry)

**Revisionskette (Vorgabe):** `predecessor` verweist auf den Vorgänger-Output während einer Revision; `NULL` beim ersten Versuch. Ein Retry mit `user_feedback` erzeugt eine neue Revision.

> **LLM-seitig gesetzt (bestätigt):** `quality` und `overlap_curriculum` werden vom LLM als Teil des strukturierten Ergebnisses erzeugt.

## 3. Anforderungen

### Funktionale (Vorgabe)
- Nutzer können sich registrieren und authentifizieren (JWT + serverseitige Session).
- Nutzer können eine Kompetenzkarte für eine Kompetenz anlegen (Status: `draft`).
- Nutzer können strukturierte Eingaben (what/how/why/…) zu einer Karte erfassen.
- Das System löst die LLM-Prüfung aus (Status-Transition `llm_check` → `llm_check_finished`/`llm_check_failed`).
- Der LLM-Output wird erfasst (`work_result`, `quality`, `overlap`, `note_improvment`).
- Nutzer können den Output akzeptieren (`is_saved`) oder mit Feedback neu erzeugen (Revision).
- Karten können gespeichert (`saved`) oder verworfen (`discarded`) werden.
- Karten können als **Duplikat einer eigenen Karte** kopiert werden.
- Referenzdaten (Rahmenlehrplan: curriculum, areas, competencies) können per **CSV-Upload** importiert werden (`POST /api/curriculum/import`, auth-geschützt).

### Nicht-funktionale (Vorgabe)
- 3-Tier-Architektur (Frontend / Backend / DB); **keine** Direkt-DB-Zugriffe im API-Handler.
- API-Handler **dünn**, Business Logic in **Services**.
- Schema-Validierung via **zod**; **ausschließlich TypeScript** im Backend.
- **Striktes TDD**; Tests + Lint + Docker in der CI.
- [Annahme] REST/JSON-API; Routing & Kommunikation zentral via **Traefik Reverse Proxy** (User → Frontend, Frontend → Backend; DB intern, nicht öffentlich).

## 4. Datenmodell

Fixes Datenmodell aus `SQL/create_database.sql` + `SQL/create_tables.sql`. Es wird **1:1 im ORM (Drizzle) nachgebaut**. Tabellen, Spalten, FKs, Enums und Status-/Quality-Werte sind in [ARCHITECTURE.md](./ARCHITECTURE.md) aufgeführt.

Die **SQL-Kommentare** (insb. Status-/Quality-Bedeutungen) bleiben **Single Source of Truth** und werden zusätzlich im TS-Schema via `.$comment()`/JSDoc gespiegelt.

## 5. Verweise
- Architektur: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Tech-Stack: [TECH_STACK.md](./TECH_STACK.md)
- Entwicklung: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Entscheidungen: [DECISIONS.md](./DECISIONS.md)
- Datenmodell (Quelle): `SQL/create_tables.sql`
