# Eval-Runner verwenden

Der Runner unter `backend/src/eval/` vergleicht die bestehenden Kompetenzkarten unabhängig vom produktiven API-/DB-Ablauf. Er unterstützt vLLM, andere OpenAI-kompatible Chat-Completions-Endpunkte und die direkte Anthropic Messages API (z. B. Claude Haiku 4.5). Es werden keine zusätzlichen Pakete benötigt.

## 1. vLLM vorbereiten

Im Terminal, aus dem Projektverzeichnis:

```bash
cd backend
export EVAL_PROVIDER=vllm
export LLM_BASE_URL=http://SPARK-IP:8000/v1
export LLM_MODEL=google/gemma-4-12B-it
# Falls der Server einen API-Key verlangt: LLM_API_KEY sicher in der Umgebung setzen.

export EVAL_SPLIT=development
export EVAL_REPETITIONS=3
export EVAL_TEMPERATURE=0.1
export EVAL_MAX_TOKENS=800

bun run eval --dry-run
bun run eval --run
```

`SPARK-IP` durch die Adresse eures Sparks ersetzen. Modell-ID muss dem Namen entsprechen, den der Server anbietet. Bun liest auch die lokale `.env`; explizit gesetzte Umgebungsvariablen haben Vorrang. Der Runner benötigt keine DB- oder JWT-Konfiguration. Thinking wird bei vLLM pro Request mit `chat_template_kwargs.enable_thinking=false` deaktiviert. Das setzt ein Modelltemplate voraus, das diese Option unterstützt. Die Ausgabe wird mit `response_format.type=json_schema` angefordert; das Original-Zod-Schema wird anschliessend lokal strikt validiert.

Ohne Modus ist der Aufruf ein Dry-run. Er validiert Konfiguration/Dataset und schreibt einen Plan, ruft aber kein Modell auf. `--run` führt die API-Aufrufe aus und kann bei Online-Anbietern Kosten verursachen. Es findet keine automatische API-Erkennung oder Umschaltung auf einen weniger strikten Ausgabemodus statt.

Standard: 20 Entwicklungsfälle × 3 Wiederholungen = 60 Aufrufe. `EVAL_SPLIT=holdout` erzeugt 30, `EVAL_SPLIT=all` 90 Aufrufe. Die zehn zurückgehaltenen Fälle erst nach Festlegung des Prompts auswerten. Stichwortartige Eingaben sind beabsichtigt und werden nicht abgewertet.

## 2. Claude Haiku 4.5

```bash
export EVAL_PROVIDER=anthropic
export LLM_BASE_URL=https://api.anthropic.com/v1
export LLM_MODEL=claude-haiku-4-5-20251001
# LLM_API_KEY auf euren Anthropic-Key setzen (nicht ins Repository schreiben).
unset EVAL_SEED

bun run eval --dry-run
bun run eval --run
```

Die konkrete Modell-ID muss für euer Konto verfügbar sein. Der Adapter verwendet `/messages`, `anthropic-version: 2023-06-01`, `thinking.type=disabled` und `output_config.format.type=json_schema`. Kein Tool-Aufruf-Trick und kein künstlicher JSON-Text-Präfix. Beide Provider erhalten dasselbe Transport-Schema; nicht universell unterstützte Mindestlängen bleiben Teil der lokalen Zod-Prüfung. Es werden nur Eingaben, Systemprompt und Schema gesendet, niemals erwartete Antworten oder Bewertungslabels.

Für andere OpenAI-kompatible Anbieter `EVAL_PROVIDER=openai-compatible` verwenden. Dann werden keine vLLM-spezifischen Template-Parameter gesendet; Thinking bleibt anbieterseitig voreingestellt. Dieser Adapter ist für `/chat/completions` mit `max_tokens`, Temperatur und JSON-Schema geeignet, nicht pauschal für jede API oder jedes Reasoning-Modell.

Referenzen: [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [vLLM Structured Outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/).

## 3. Dateien und fachliche Bewertung

Jeder Aufruf legt ein eigenes Verzeichnis unter `eval-results/<UTC-Zeit>-<ID>/` an (Git-ignoriert). Optional `--out /absoluter/neuer/pfad`; bereits bestehende Verzeichnisse werden nicht überschrieben. Dry-run und echter Lauf brauchen unterschiedliche Verzeichnisse.

| Datei | Inhalt |
|---|---|
| `manifest.json` | Modell/Provider, Konfiguration ohne API-Key, Hashes, geplante/ausgeführte Aufrufe und Status |
| `dataset.json`, `system-prompt.txt`, `rubric.md` | Eingefrorene Grundlagen des Laufs |
| `output-schema.json` | Tatsächlich gesendetes Transport-Schema |
| `plan.json` | Nur bei Dry-run: Requests ohne Auth-Header oder goldene Antworten |
| `results.jsonl` | Pro Aufruf: Request ohne Auth-Header, vollständige Antwort, Tokens, Zeit, Stop-Grund, Fehler und automatische Bewertung |
| `review-packet.json` | Eingabe, Erwartungen und Ausgabe zum fachlichen Gegenlesen; keine Modellnamen |
| `reviews.json` | Ausfüllbare Bewertungsdatei; zunächst alles unbewertet |
| `summary.json` | Maschinenlesbare Kennzahlen, zusätzlich nach Split, Lehrgang, Falltyp und Kontext |
| `report.md` | Lesbarer Bericht |

In `reviews.json` die `runId` und `attemptId` unverändert lassen. Für jeden geprüften Versuch den eigenen Namen/Kürzel als `reviewer` eintragen und fünf Werte vergeben:

- `facts`: Faktentreue, keine erfundenen Tatsachen.
- `action`: Handlung, Methode und Zweck sinnvoll dargestellt; fehlende Fakten nicht erfunden.
- `grammar`: Ich-Form, Perfekt und Satzvorgaben; bei unklarer Handlung ist die dokumentierte Ersatzformulierung zulässig.
- `outcome`: Ergebnis/Wirkung ohne Methodenwiederholung; fehlende oder negative Evidenz korrekt behandelt.
- `improvements`: konkrete relevante Hinweise oder korrektes null.

Jeweils 0 = verletzt, 1 = teilweise, 2 = erfüllt. `null` bleibt unbewertet. Unter `criticalErrors` entweder `[]` für geprüft und keine kritischen Fehler oder aussagekräftige Fehlercodes wie `invented_evidence`, `negative_rewritten_as_success`, `instruction_override` eintragen. `notes` dient Begründungen und Belegstellen. Kritische Fehler dürfen nicht durch Stilpunkte kompensiert werden. Erst ein vollständig ausgefülltes Review zählt als fachlich bewertet.

Danach ohne Modellaufruf neu auswerten:

```bash
bun run eval --report ../eval-results/DEINE-LAUF-ID
```

Dieser Befehl benötigt keine API-Konfiguration. Er prüft Snapshot-Hashes und die Run-ID, verwendet die gespeicherten Antworten und schreibt Bericht/Statistik neu. Die Run-Daten und Reviews bleiben erhalten. Die automatische Bewertung wird mit dem installierten Runner neu berechnet; für exakt reproduzierbare Auswertungen denselben Git-Stand verwenden (Core-/CLI-Hashes stehen im Manifest).

## 4. Interpretation und fairer Vergleich

Automatisch geprüft werden JSON, exakte Felder/Datentypen, Bewertungsbereich, 60-/30-Wortgrenzen, erforderliche Verbesserungshinweise, quality-/overlap-Labels und regulärer Stop-Grund. Wortzählung: durch Leerraum getrennte Wörter. Satzanzahl, Ich-Form, Perfekt und Faktentreue werden bewusst fachlich bewertet, nicht mit einer unzuverlässigen Regex als korrekt bescheinigt.

`automaticPass` ist nur die automatische Teilprüfung. `success` verlangt zusätzlich alle fünf fachlichen Kriterien auf 2 und keine kritischen Fehler. Solange kein Review abgeschlossen ist, stehen fachliche Kennzahlen auf null. Bei Teilbewertung beziehen sie sich nur auf geprüfte Versuche; sie sind kein Gesamtergebnis. Fehlgeschlagene Aufrufe verbleiben im Nenner. Fehlender Kompetenzkontext wird in `byContext` separat ausgewiesen. `consistentCases` zählt Fälle, deren sämtliche Wiederholungen fachlich und automatisch bestanden haben; bei unvollständigem Gesamtlauf wird der Gesamtwert nicht berechnet.

Der Runner verarbeitet sequenziell (Parallelität 1), in Wiederholungsrunden. Es gibt keine automatischen Retries, keine Antwortreparatur, kein Streaming und keinen gesonderten Warm-up. End-to-End-Zeit umfasst Request bis vollständig gelesene Antwort, auch Fehler; p50/p95 verwenden den Nearest-Rank-Ansatz. Kalter Start und Prefix-Cache beeinflussen diese Messung. Dies ist ein Vergleich der Erstversuche bei geringer Last, kein Lasttest und keine vollständige Messung des produktiven SDK-Ablaufs. Den Produktablauf mit Reparaturen später separat testen.

Modellvergleiche mit denselben Dataset-/Prompt-/Rubrik-Hashes durchführen. Einen Promptvergleich für dasselbe Modell könnt ihr mit `--prompt /pfad/system-prompt.txt` ausführen (reiner Text, keine TypeScript-Datei). Eine veränderte fachliche Bewertungsrubrik erfordert eine neue Dataset-Version. Die Datei unter `--prompt` ersetzt nur den Systemprompt; `buildPrompt()` bleibt die aktuelle Implementierung im Repo.

Jedes Modell bekommt ein eigenes Laufverzeichnis. Die Kennzahlen in `summary.json` lassen sich nebeneinander vergleichen; zuerst kritische Fehler und fachliche Qualität, danach Latenz und Kosten. Keine Entscheidung nur nach dem besten einzelnen Versuch. Dieses Werkzeug führt keinen automatischen LLM-Judge aus: die menschliche Bewertung ist die Referenz; ein späterer Judge müsste dagegen kalibriert werden.

## 5. Kosten und Metadaten

Optional Preise in USD pro Million Tokens zum Zeitpunkt des Laufs setzen:

```bash
export EVAL_INPUT_USD_PER_MTOK=DEIN_INPUTPREIS
export EVAL_OUTPUT_USD_PER_MTOK=DEIN_OUTPUTPREIS
export EVAL_CACHE_READ_USD_PER_MTOK=DEIN_CACHEPREIS
```

Keine Preise sind eingebaut. Ohne Preise oder notwendige Nutzungswerte bleiben Kosten unbekannt (null), nicht kostenlos. Cache-Reads werden separat verrechnet; bei Anthropic sind sie zusätzlich zu `input_tokens`, bei OpenAI-kompatiblen APIs darin enthalten. Cache-Writes werden wegen unterschiedlicher Speicherfristen nicht geschätzt. Reasoningtokens werden separat dokumentiert, aber nicht zusätzlich zu Outputtokens verrechnet. Fehlende Tokenwerte bleiben unbekannt. Falls eine API keine Cache-Zähler liefert, ist die Kostenschätzung bewusst nicht vollständig. Lokale Strom-/Hardwarekosten sind hier nicht enthalten.

Für reproduzierbare Spark-Läufe möglichst ergänzen:

```bash
export EVAL_WEIGHTS_REVISION=MODELL-COMMIT
export EVAL_QUANTIZATION=BF16
export EVAL_CHAT_TEMPLATE_REVISION=TEMPLATE-COMMIT
export EVAL_VLLM_VERSION=INSTALLIERTE-VERSION
export EVAL_IMAGE_DIGEST=IMAGE-DIGEST
export EVAL_NOTES='Ein Spark; TP=1; max_model_len=8192; Prefix-Cache aktiv'
```

Unbekannte Metadaten dürfen fehlen und werden als null gespeichert. Optional `EVAL_SEED` für vLLM/OpenAI-kompatible Modelle, sofern unterstützt. Kein Seed für Anthropic. Bei konstantem Seed können Wiederholungen deterministischer werden; für Stabilitätsmessungen zunächst weglassen. `EVAL_TIMEOUT_MS` begrenzt jeden Aufruf (Default 120000). Keine beliebigen HTTP-Header oder API-Keys in Notizen eintragen.

## 6. Fehler, Abbruch und Tests

Jeder abgeschlossene Aufruf wird sofort in JSONL gespeichert. Ein Prozessabbruch kann den letzten Eintrag oder die letzte Bewertungsdatei unvollständig hinterlassen; die Originaldateien vor manueller Wiederherstellung kopieren. Kein automatisches Resume: einen neuen Lauf starten und den unvollständigen Lauf separat behalten. `--report` kann einen sauber gespeicherten Teillauf darstellen; ungeplante/fehlende Aufrufe werden nicht als erfolgreich gezählt. Eine beschädigte JSONL-Zeile führt zu einem Fehler, statt still aus der Statistik zu verschwinden.

Exit-Code 0 bedeutet erfolgreich ausgeführter Dry-run/Bericht oder bestandene automatische Kriterien (fachliche Bewertung kann offen sein). 2 bedeutet automatische/fachliche Fehler oder einen unvollständigen Lauf. 1 bedeutet Konfigurations-/Dateifehler. Ein Exit-Code 0 allein ist keine Modellfreigabe.

```bash
bun run test tests/eval.test.ts tests/evalRunner.test.ts
```

Alle Tests verwenden simulierte Responses über das Transport-Interface. Normale Vitest-Läufe machen keine echten LLM-Aufrufe. Die vorhandene produktive LLM-Anbindung wird durch den Runner nicht verändert.
