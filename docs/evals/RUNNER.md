# Eval-Runner verwenden

Der Standard-Eval ruft `OpenAiCompatibleLlmClient.generateCompetencyOutput()` aus `backend/src/llm/client.ts` auf: denselben Client wie die Applikation. Promptaufbau, JSON-Schema, SDK-Fehlerbehandlung, Transport-Retries und Normalisierung der Hinweise entsprechen damit dem produktiven Aufrufweg. Der Runner bewertet und protokolliert die Ergebnisse; er greift nicht auf die Datenbank zu.

Ein ausdrücklich gewählter direkter Modus bleibt für kontrollierte Modellvergleiche und die native Anthropic API erhalten. Ergebnisse beider Modi müssen getrennt ausgewiesen werden. Ein gleicher Prompt allein macht die Aufrufwege nicht identisch.

## 1. Produktiven Client evaluieren (Standard)

Im Backend-Verzeichnis müssen `LLM_BASE_URL` (inklusive `/v1`), `LLM_MODEL` und bei Bedarf `LLM_API_KEY` gesetzt sein. Bun liest auch die lokale `.env`; Prozessvariablen haben Vorrang. Der Modellname muss exakt einer vom Endpunkt angebotenen Modell-ID entsprechen.

```sh
cd backend
export EVAL_EXECUTION=client
export EVAL_PROVIDER=vllm
export EVAL_SPLIT=development
export EVAL_REPETITIONS=3

bun run eval --dry-run --dataset ../docs/evals/informatics-cards.v1.0.json
bun run eval --run --dataset ../docs/evals/informatics-cards.v1.0.json
```

Ohne `EVAL_EXECUTION` gilt `client`. Ohne Modus gilt `--dry-run`. `--run` erzeugt echte API-Aufrufe und gegebenenfalls Kosten. Es gibt keine automatische Endpoint-Erkennung oder Modellumschaltung.

Der Client-Modus verwendet die produktiven Werte: Temperatur 0,1 und 800 Ausgabetokens. Abweichende Werte für `EVAL_TEMPERATURE` oder `EVAL_MAX_TOKENS`, ein `EVAL_SEED`, ein ausdrücklich gesetztes `EVAL_TIMEOUT_MS` oder `EVAL_PROVIDER=anthropic` werden abgelehnt. So suggeriert das Manifest keine Einstellungen, die der produktive Client nicht verwendet. Für spezielle Benchmarks den direkten Modus wählen. Thinking bleibt wie in der Applikation beim Provider-/Template-Default; der Runner setzt hier kein zusätzliches Thinking-Flag. Auch Retries entsprechen dem installierten SDK.

Der Dry-run lässt denselben SDK-Client seine Requests gegen einen lokalen synthetischen Transport erzeugen. Es werden keine Netzwerkaufrufe ausgeführt und keine Dataset-Erwartungen an das Modell übergeben. `plan.json` und `output-schema.json` enthalten den tatsächlich vom SDK konstruierten Request bzw. dessen Schema.

Das Informatik-Set enthält 30 development-Fälle (90 Aufrufe bei drei Wiederholungen) und zehn holdout-Fälle (30 Aufrufe). Hintergrund und Quellen: [INFORMATICS.md](./INFORMATICS.md). Die Labels sind fachlich ungeprüft. Den Holdout erst nach Festlegung des Prompts auswerten und nicht zur Promptoptimierung nutzen.

Ohne `--dataset` bleibt das historische Set `competency-cards.v0.2.json` der Standard: 23 development-Fälle × drei = 69 Aufrufe. Die historischen Erwartungen entsprechen teilweise älteren Regeln und sind kein direkter Vergleich zum Informatik-Set.

## 2. Direkter Modellvergleich (ausdrücklich optional)

```sh
EVAL_EXECUTION=direct bun run eval --run --dataset ../docs/evals/informatics-cards.v1.0.json
```

Der direkte Modus verwendet die Transportadapter unter `backend/src/eval/core.ts`, ohne den produktiven Client aufzurufen. Für vLLM sendet er `chat_template_kwargs.enable_thinking=false`, `strict: true` und das gemeinsame Eval-Transport-Schema. Er hat keine Retries oder Reparaturen; `EVAL_TIMEOUT_MS` gilt pro Anfrage (Default 120000). `EVAL_TEMPERATURE`, `EVAL_MAX_TOKENS` und optional `EVAL_SEED` steuern diesen Modus. Seed ist für Anthropic nicht unterstützt.

Für andere OpenAI-kompatible Anbieter `EVAL_PROVIDER=openai-compatible` verwenden. Thinking bleibt dort anbieterseitig voreingestellt. Der Adapter verwendet `/chat/completions`; er ist nicht für beliebige APIs geeignet.

Die native Anthropic Messages API ist ausschliesslich im direkten Modus verfügbar:

```sh
export EVAL_EXECUTION=direct
export EVAL_PROVIDER=anthropic
export LLM_BASE_URL=https://api.anthropic.com/v1
export LLM_MODEL=claude-haiku-4-5-20251001
# LLM_API_KEY sicher in der Umgebung setzen.
unset EVAL_SEED

bun run eval --dry-run
bun run eval --run
```

Dieser Adapter sendet `/messages`, `anthropic-version: 2023-06-01`, deaktiviertes Thinking und `output_config.format.type=json_schema`. Referenzen: [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [vLLM Structured Outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/).

## 3. Dateien und Messwerte

Jeder Aufruf erzeugt ein neues Git-ignoriertes Verzeichnis unter `eval-results/<UTC-Zeit>-<ID>/`. Optional `--out /absoluter/neuer/pfad`; vorhandene Verzeichnisse werden nicht überschrieben.

| Datei | Inhalt |
|---|---|
| `manifest.json` | Aufrufweg, Modell, Konfiguration ohne API-Key, Protokoll, Snapshot- und Quellcode-Hashes |
| `dataset.json`, `system-prompt.txt`, `rubric.md` | Eingefrorene Grundlagen des Laufs |
| `output-schema.json` | Schema des gewählten Aufrufwegs |
| `plan.json` | Nur Dry-run: Requests ohne Auth-Header und Erwartungslabels |
| `results.jsonl` | Eintrag je Fall/Wiederholung mit Request, Rohantwort, Fehlern, Messwerten und Bewertung |
| `review-packet.json` | Eingaben, Erwartungen und bewertete Ausgabe zum fachlichen Gegenlesen |
| `reviews.json` | Ausfüllbare fachliche Bewertungen, zunächst unbekannt/null |
| `summary.json`, `report.md` | Maschinenlesbare bzw. lesbare Kennzahlen |

Im Client-Modus enthält `response.httpAttempts` sämtliche beobachteten HTTP-Versuche, einschliesslich fehlgeschlagener SDK-Retries. Requests werden ohne Auth-Header gespeichert, Rohantworten und Fehlermeldungen um den konfigurierten API-Key bereinigt. Der erste Request steht zusätzlich im bisherigen Feld `request`.

`response.text` und `response.raw` erhalten die letzte rohe Modell-/HTTP-Antwort. `response.validatedText` enthält das vom produktiven Client zurückgegebene Ergebnis in den bestehenden Output-Feldnamen. Diese Felder sind bewusst getrennt: Eine Hinweis-Liste kann vom Client in einen String normalisiert werden, obwohl die Rohantwort das strikte Schema verletzt. Bewertet wird im Client-Modus das validierte Ergebnis, das die App erhalten würde. Die Roh-Schemaquote wird separat ausgewiesen. SDK-Validierungsfehler bleiben fehlgeschlagene Versuche.

Die Zusammenfassung nennt den Aufrufweg, die Zahl der HTTP-Versuche und die tatsächlich beobachteten Retries. End-to-End-Zeit umfasst im Client-Modus den gesamten SDK-Aufruf inklusive Retries und Validierung sowie die kleine Beobachtungs-/Protokollierungsarbeit am Transport. Tokenwerte werden über alle HTTP-Versuche aggregiert. Fehlt ein Zähler in einem Versuch, bleibt der entsprechende Gesamtwert unbekannt; ein bekannter Teilwert wird nicht als vollständiger Verbrauch ausgegeben.

Der produktive Client unterstützt nur OpenAI-kompatible Endpunkte. Domain-Schema, API-Felder und `note_improvment` bleiben unverändert. Das LLM-Interface wird weiterhin in normalen Service-Tests gemockt; die Eval-Integrationstests verwenden das echte SDK mit gemocktem HTTP.

## 4. Fachliche Bewertung und erneute Berichterstellung

In `reviews.json` bleiben `runId` und `attemptId` unverändert. Für geprüfte Versuche `reviewer` und fünf Werte vergeben:

- `facts`: Faktentreue ohne erfundene Tatsachen.
- `action`: Handlung, Methode und Zweck; fehlende Angaben nicht erfinden.
- `grammar`: Ich-Form, natürliche Vergangenheitsformen (Perfekt oder Präteritum), Satzvorgaben und korrekte Sprache.
- `outcome`: Ergebnis oder konkretes offenes Kriterium ohne Methodenwiederholung.
- `improvements`: relevante Hinweise oder korrektes null.

Je Kriterium: 0 = verletzt, 1 = teilweise, 2 = erfüllt; null = unbewertet. `criticalErrors: []` bedeutet ausdrücklich geprüft und ohne kritische Fehler. Andernfalls aussagekräftige Fehlercodes und Belegstellen in `notes` eintragen. Kritische Fehler dürfen nicht mit Stilpunkten ausgeglichen werden.

```sh
bun run eval --report ../eval-results/DEINE-LAUF-ID
```

Der Befehl benötigt keine API-Konfiguration oder Modellaufrufe. Er prüft Snapshot-Hashes und Run-ID und berücksichtigt bei Client-Läufen das gespeicherte validierte Ergebnis. Historische direkte Läufe bleiben lesbar; fehlt die Kennzeichnung des Aufrufwegs, gelten sie als `direct`.

`automaticPass` prüft Schema, exakte Felder/Datentypen des bewerteten Outputs, quality-/overlap-Labels, Wortlimits, erforderliche Hinweise, reguläre Beendigung und Aufruffehler. Faktentreue, Grammatik und Satzanzahl werden fachlich bewertet. `success` verlangt zusätzlich fünf Zweier-Wertungen und keine kritischen Fehler. `consistentCases` zählt Fälle mit sämtlichen erfolgreichen Wiederholungen. Offene Reviews bleiben null; fehlgeschlagene Versuche bleiben im Nenner.

Exit-Codes: 0 = erfolgreicher Dry-run/Bericht bzw. bestandene automatische Kriterien; 2 = Kriterienverletzungen oder unvollständiger Lauf; 1 = Konfigurations-/Dateifehler. Ein Exit-Code 0 ist keine fachliche Modellfreigabe.

## 5. Vergleichbarkeit, Kosten und Reproduzierbarkeit

Vergleiche benötigen denselben Aufrufweg, Dataset-/Rubrik-Stand, Prompt sowie Modell-/Serverkonfiguration. Neue Client-Läufe nicht als unveränderte Fortsetzung der bisherigen direkten Benchmark-Reihe ausgeben. Ein anderer Prompt kann mit `--prompt /pfad/system-prompt.txt` übergeben werden; auch dann wird der Client genutzt, der tatsächliche Prompt eingefroren und die Abweichung vom App-Standard dokumentiert.

Parallelität bleibt 1, Wiederholungen erfolgen in Runden. Kein Streaming und kein separater Warm-up. Das ist eine Messung einzelner Client-Aufrufe bei geringer Last, kein Lasttest oder vollständiger API-/DB-/Frontend-Test. Normale Tests/CI führen keine echten Modellaufrufe aus.

Optional Preise in USD pro Million Tokens setzen: `EVAL_INPUT_USD_PER_MTOK`, `EVAL_OUTPUT_USD_PER_MTOK`, `EVAL_CACHE_READ_USD_PER_MTOK`. Ohne Preise oder vollständige Verbrauchsdaten bleiben Kosten null/unbekannt. Fehlende Cache-Zähler und zusätzliche erfolglose HTTP-Versuche dürfen nicht als kostenlos gelten. Cache-Writes mit unterschiedlichen Speicherfristen werden nicht geschätzt; lokale Strom-/Hardwarekosten sind separat zu erfassen.

Für reproduzierbare Läufe möglichst `EVAL_WEIGHTS_REVISION`, `EVAL_QUANTIZATION`, `EVAL_CHAT_TEMPLATE_REVISION`, `EVAL_VLLM_VERSION`, `EVAL_IMAGE_DIGEST` und `EVAL_NOTES` setzen. Unbekannt bleibt null. Keine API-Keys in Notizen eintragen. Der Client-Quellcode wird zusätzlich zu Core/CLI im Manifest gehasht. Für exakt reproduzierbare Berichte denselben Git-/Dependency-Stand verwenden.

Jeder abgeschlossene Fall wird sofort gespeichert. Kein automatisches Resume: Teilläufe erhalten und einen neuen Lauf starten. Beschädigte JSONL-Zeilen werden nicht still übersprungen. Einen späteren Judge zunächst gegen menschliche Bewertungen kalibrieren; derzeit ist kein automatischer LLM-Judge implementiert.

```sh
bun run test tests/llmClient.test.ts tests/eval.test.ts tests/evalRunner.test.ts
```
