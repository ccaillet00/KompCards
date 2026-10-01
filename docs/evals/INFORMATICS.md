# Informatik-Eval mit CSV-Kompetenzen — v1.0 (Entwurf)

40 synthetische Praxiseingaben, 30 development und zehn holdout. Die Kompetenztexte stammen unverändert aus den vom Nutzer bereitgestellten CSV-Dateien. Labels und Praxissituationen wurden erstellt und sind **noch nicht fachlich freigegeben**. Die CSV-Exporte wurden nicht mit einer offiziellen Veröffentlichung abgeglichen; daraus folgt kein Nachweis ihres amtlichen Versionsstands.

## Quellen und Abdeckung

`informatics-catalog.v1.0.json` enthält alle importierten Felder aus einem Curriculum, 15 Bereichen und 91 Kompetenzen. Die Originaldateien hatten UTF-8-BOMs; diese wurden beim CSV-Parsing entfernt. Die Titel und Beschreibungen inklusive Schreibfehlern bleiben exakt erhalten. IDs und Fremdschlüssel bleiben Zeichenketten wie im CSV-Export. Es wurden keine Datenbanktabellen importiert oder geändert.

Die SHA-256-Prüfsummen der drei Originaldateien stehen im Katalog und im Dataset; das Dataset enthält auch den Hash des Katalogs. Die originalen CSV-Dateien in Downloads wurden nicht verändert. Die Snapshots sind JSON-Dateien, damit sie trotz der bestehenden `*.csv`-Ignore-Regel versioniert werden können.

Alle 15 Bereiche sind im development-Split enthalten. Die 40 Fälle verwenden 20 ausgewählte Kompetenzen, nicht sämtliche 91 Kompetenzen. Fünf ausschliesslich zurückgehaltene Kompetenzen bilden den holdout-Split. Varianten derselben Kompetenz liegen immer im selben Split. Eine Kompetenz wird für den Fall ohne Kontext nur in der Metadatenreferenz festgehalten und nicht an das Modell übermittelt.

| Bereich | Entwicklungs-Kompetenz | Schwerpunkt |
|---|---|---|
| A1 | A1.2 | Prozessoptimierung, unklare Methode |
| A2 | A2.4 | Präsentation und qualitative Rückmeldung |
| A3 | A3.2 | Weiterbildung, Zweck versus Methodenbegründung |
| B4 | B4.4 | Entscheidungsfindung, fehlende Handlung |
| B5 | B5.4 | Risikoanalyse, widersprüchliche Durchführung |
| B6 | B6.2 | Ressourcenplanung, negativer Befund, unpassende Tätigkeit |
| B7 | B7.3 | Anforderungsspezifikation, unklare Methode |
| B8 | B8.3 | Qualitätsindikatoren, fehlende Freigabe |
| B9 | B9.2 | Schutzbedarf, unbelegte Behauptung im Feedback |
| B10 | B10.1 | Softwarearchitektur, Tätigkeit ohne Bezug |
| B11 | B11.7 | Datenintegration, negativer Integritätsbefund |
| B12 | B12.2 | Netzwerkplanung, fehlender Kompetenzkontext |
| B13 | B13.1 | Restore-Konzept, negatives Ergebnis, Anweisung im Datenfeld |
| B14 | B14.2 | Incident-Teamrolle, Eskalation und Tippfehler |
| B15 | B15.2 | Energieverbrauch, Messung versus beabsichtigter Nutzen |

Die Paare sind teilweise ähnlich, um einzelne Informationsunterschiede zu prüfen. Deshalb die Ergebnisse auch pro Kompetenzpaar betrachten; 40 Fälle sind keine 40 unabhängigen Domänen. Drei Wiederholungen ergeben 120 Antworten, aber weiterhin nur 40 Aufgaben. Das Set bildet weder die reale Nutzerverteilung noch den gesamten Informatik-Lehrplan vollständig ab.

## Fachlicher Vertrag und Review

Bewertung nach ADR-020: Arbeitsergebnis mit ausdrücklicher Rolle, Ich-Form und Perfekt, 1–2 Sätze/maximal 60 Wörter; Quality Statement genau ein Satz/maximal 30 Wörter. Vorhandene qualitative, quantitative und negative Nachweise müssen erhalten bleiben. Ohne Beleg ein konkretes offenes Kriterium nennen und gezielt nachfragen; kein erfundener Erfolg und kein pauschaler Ergebnis-Fallback. Eingabequalität und Curriculum-Passung werden unabhängig bewertet.

`quality_statement_semantics` beschreibt eine zulässige Bedeutung, keine Zeichenkette für einen exakten Textvergleich. Ergebnisnachweise stehen in den Sachangaben, vor allem `how`. `result_evidence` fasst diese nur für die Bewertung zusammen. `must_preserve` verlangt Rolle, wesentliche Handlung und Zweck in ihrer Bedeutung; Tippfehler dürfen korrigiert werden, Widersprüche dürfen nicht eigenmächtig aufgelöst werden. Hinweise sind in diesem Set bei fehlendem Nachweis stets erforderlich. Bei vollständig belegten Angaben ist null zulässig; ein nicht passender Curriculum-Bezug allein senkt quality nicht.

Vor einem verbindlichen Vergleich `INFORMATICS_REVIEW.md` fachlich prüfen: insbesondere Kompetenzbezug, zulässige Handlungsauslegung bei Stichworten, quality-Stufen und Ergebnisbelege. Die Vorlage enthält noch keine Freigaben. Änderungen der Erwartungen erfordern eine neue Dataset-Version. Nach einem Modelllauf werden dessen `reviews.json` separat bewertet; Dataset-Review und Output-Review sind verschiedene Schritte.

Den Holdout nicht als Few-Shot-Beispiele oder zur Promptoptimierung verwenden. Wenn seine Fehler zur Optimierung verwendet werden, neue zurückgehaltene Fälle ergänzen. Die Few-Shot-Beispiele im aktuellen Prompt sind nicht aus diesem Set kopiert.

## Verwendung im bestehenden Runner

Aus `backend/`, mit eurer bisherigen vLLM-/Gemma-Konfiguration:

```bash
EVAL_SPLIT=development bun run eval --dry-run --dataset ../docs/evals/informatics-cards.v1.0.json
EVAL_SPLIT=development bun run eval --run --dataset ../docs/evals/informatics-cards.v1.0.json
```

Standardmässig drei Wiederholungen: development 90 Aufrufe, holdout 30, all 120. Der erste Befehl erzeugt ausschliesslich einen Plan. Nur der zweite startet echte Modellaufrufe; bei der Erstellung dieses Sets wurde kein Modell aufgerufen.

Nach Festlegung des Prompts:

```bash
EVAL_SPLIT=holdout bun run eval --run --dataset ../docs/evals/informatics-cards.v1.0.json
```

Der Runner übernimmt den aktuellen Systemprompt und `buildPrompt()`; das Set benötigt keine Runneränderung. Nur `input` wird ans Modell geschickt, nie Erwartungen, Tags, Quellreferenzen oder Prüfvorlagen. Die JSON-Datei ist explizit über `--dataset` auszuwählen. Der bisherige Standard bleibt v0.2; v0.1/v0.2 und ihre historischen Ergebnisse werden nicht überschrieben. Deren ältere Fallback-/Hinweisregeln nicht mit diesem Set vermischen.

Die technische Evaluation ist für alle Sets gleich; die fachliche Grundlage für den neuen Ergebnissatz ist in der vom Runner eingefrorenen `README.md` dokumentiert. Für Modellvergleiche dieselben Dataset-/Prompt-/Rubrik-Hashes verwenden. Dieses neue Set allein misst keine Verbesserung gegenüber dem alten Lauf mit anderen Fällen.

## Technische Prüfung

Vier Dataset-Tests sind zunächst wegen fehlender Dateien fehlgeschlagen und danach grün. Sie prüfen Runnerformat, CSV-Kontextbeziehungen, Bereichsabdeckung, Splittrennung und relevante Grenzfall-Erwartungen. Die Quelldatei- und Katalog-Prüfsummen wurden zusätzlich gegen die Originale geprüft. Development- und Holdout-Dry-runs erzeugen 90 beziehungsweise 30 geplante Aufrufe; sie senden keine Requests und enthalten keine goldenen Erwartungen in den Modellnachrichten. Alle 149 Backend- und 76 Frontend-Tests sowie Lint und Typecheck beider Tiers bestehen. Diese Checks bestätigen die technische Nutzbarkeit, nicht die fachliche Freigabe der Labels.
