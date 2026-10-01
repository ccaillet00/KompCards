# Vergleich der Temperatur-Evaluationen vom 30.09.2026

## Einschätzung

Die Erhöhung der Temperatur von 0.1 auf 0.5 oder 1.0 hat in diesen Läufen **keine Verbesserung der automatischen Trefferquote** gebracht. Alle drei erreichen 24 von 30 bestandenen Ausgaben (80 %) und verfehlen dieselben zwei Testfälle in allen drei Wiederholungen. Die höheren Temperaturen verändern vor allem die Wortwahl. Bei 1.0 kommen auffällige Wiederholungen zwischen Arbeitsergebnis und Quality Statement hinzu.

**Empfehlung: Temperatur 0.1 vorläufig als Basis behalten.** Sie liefert häufiger identische Formulierungen; eine höhere fachliche Genauigkeit ist damit jedoch nicht bewiesen. Zuerst die systematischen Prompt-Probleme und die Soll-Labels prüfen. 0.5 bleibt ein sinnvoller Vergleichswert für einen anschliessenden Sprachqualitätsvergleich. Für 1.0 zeigen diese Daten keinen Vorteil.

## Grundlage und Vergleichbarkeit

| Temperatur | Run-ID |
|---|---|
| 0.1 | `2026-09-30T21-34-18-145Z-4c269c71` |
| 0.5 | `2026-09-30T21-40-09-751Z-df6ee398` |
| 1.0 | `2026-09-30T21-43-19-636Z-caf97ad4` |

Quellen: `manifest.json`, `summary.json`, `results.jsonl`, `dataset.json`, `system-prompt.txt` und `rubric.md` in den drei vom Nutzer angegebenen Ordnern unter `/Users/ccaillet00/_dev/Projekte/KompCards/eval-results/`.

- Jeweils dieselben **10 Holdout-Fälle**, dreimal wiederholt: 30 Antworten je Temperatur, insgesamt 90. Es sind 10 unterschiedliche Aufgaben je Lauf, keine 30 unabhängigen Aufgaben.
- Modellkennung `google/gemma-4-12B-it`, Provider vLLM, maximal 800 Ausgabetokens, Thinking deaktiviert, keine Reparaturen oder Retries, Parallelität 1, kein Warmup.
- Alle protokollierten Request-Bodies sind nach Entfernen von `temperature` identisch. Dataset-, Prompt-, Rubrik- und Runner-Hashes stimmen zwischen den Läufen überein. Die archivierten Dataset-, Prompt- und Rubrik-Dateien stimmen mit ihren Manifest-Hashes überein.
- Alle 90 Antworten enthalten denselben Server-Fingerprint: `vllm-0.29.1rc1.dev467+g0aee727ff.d20260921-62028060`.
- `top_p` und `top_k` werden in den Requests nicht explizit gesetzt. Ihre tatsächlich wirksamen Serverwerte sind nicht dokumentiert. Gewichtsrevision und Quantisierung sind im Manifest ebenfalls nicht erfasst; die Modellkennung allein bestätigt BF16 nicht.
- Dataset-Version: `informatics-1.0.0-draft`, Status `synthetic_inputs_unreviewed_labels`. Die Kompetenzen stammen aus den CSVs; die Arbeitssituationen sind synthetisch und die Soll-Labels noch ungeprüft.

## Übersicht

| Kennzahl | 0.1 | 0.5 | 1.0 |
|---|---:|---:|---:|
| Automatische Checks bestanden | 24/30 (80 %) | 24/30 (80 %) | 24/30 (80 %) |
| Quality entspricht Soll-Label | 24/30 | 24/30 | 24/30 |
| Curriculum-Passung entspricht Soll-Label | 30/30 | 30/30 | 30/30 |
| JSON-Schema gültig | 30/30 | 30/30 | 30/30 |
| Wortlimits eingehalten | 30/30 | 30/30 | 30/30 |
| Transportfehler / unvollständige Antworten | 0 / 0 | 0 / 0 | 0 / 0 |
| Fälle mit drei identischen vollständigen Output-Objekten | 5/10 | 1/10 | 0/10 |
| Unterschiedliche vollständige Output-Objekte | 16/30 | 26/30 | 30/30 |
| Mittlere Wortzahl Arbeitsergebnis | 26.5 | 26.7 | 27.7 |
| Antwortzeit Median | 4.38 s | 4.63 s | 4.50 s |
| Antwortzeit P95 | 6.42 s | 5.79 s | 6.04 s |
| Ausgabetokens insgesamt | 3'731 | 3'677 | 3'708 |
| Abgeschlossene formale menschliche Reviews | 0 | 0 | 0 |

Identische Output-Objekte wurden nach JSON-Normalisierung verglichen; Formatierung zählt nicht als Unterschied. Auch Unterschiede in `note_improvment` zählen. Das misst Formulierungsstabilität, nicht semantische Qualität. Die Bewertungen `quality` und `overlap_curriculum` bleiben bei jedem Fall in allen Wiederholungen und Temperaturen identisch.

Die 80 % sind **keine fachliche Gesamtqualität von 80 %**. Semantische Review-Scores und kritische Fehler sind in den Zusammenfassungen nicht bewertet (`null`). Die folgenden Beobachtungen sind eine separate qualitative Sichtung, keine nachträglich ausgefüllte offizielle Review. Die kleinen Laufzeitunterschiede rechtfertigen wegen getrennter Läufe ohne Warmup keine Geschwindigkeitsrangfolge.

## Fachliche und sprachliche Befunde

### Was in allen drei Läufen funktioniert

Die Rolle steht in allen 90 Arbeitsergebnissen ausdrücklich mit „als …“. Die Arbeitsergebnisse bleiben kurz und überwiegend fachlich nachvollziehbar. Der ursprünglich beanstandete Standardsatz „Ein überprüfbares Ergebnis ist aus den Angaben nicht hervorgegangen.“ erscheint in keiner Antwort.

Konkrete qualitative Nachweise werden übernommen, beispielsweise „Das Team hat zwei neue Review-Regeln angenommen.“ Zahlen bleiben erhalten: 20 statt 28 Adapter sowie das negative Ergebnis 30 statt geplanter 28 Adapter. Der Mehrverbrauch wird nicht in eine Einsparung umgedeutet. Im Fall mit einer unbelegten Feedback-Aufforderung wird keine beanstandungsfreie Implementierung erfunden.

### 1. Widersprüche werden nicht zuverlässig offengehalten

Fall `inf-a3-5-02` enthält gleichzeitig eine durchgeführte und eine noch nicht erfolgte Reflexion. Erwartet wird `quality: 1`; alle neun Ausgaben vergeben `quality: 2`.

Bei 0.1 steht dreimal: „Die Reflexion des eigenen Verhaltens in angespannten Besprechungen ist noch nicht erfolgt.“ Damit wählt die Aussage eine der widersprüchlichen Versionen aus, obwohl die Verbesserungshinweise den Widerspruch benennen. 0.5 formuliert zweimal vorsichtiger „… ist noch nicht nachgewiesen“, einmal aber ebenfalls „… ist noch nicht erfolgt“. 1.0 behauptet in zwei Antworten, die Reflexion sei nicht erfolgt.

**Folgerung:** Höhere Temperatur löst das Problem nicht zuverlässig. Die gewünschte Ausgabe muss die Durchführung ausdrücklich als ungeklärt bezeichnen und die Bewertung entsprechend der Rubrik vornehmen.

### 2. Ein Soll-Label ist fachlich zu überprüfen

Fall `inf-a2-8-02`: Methode „sorgfältig übersetzt“. Erwartet wird `quality: 2`, alle neun Ausgaben vergeben `quality: 3` und fragen nach einem Ergebnisnachweis.

Das ist automatisch eine Abweichung. Fachlich ist das Label aber diskutabel: „sorgfältig“ ist unspezifisch, „übersetzt“ benennt bereits eine konkrete Tätigkeit beziehungsweise ein Verfahren. Vor einer Prompt-Anpassung ist zu klären, was nach der Rubrik hier als ausreichende Methode zählt. Alternativ kann ein eindeutig vager Fall verwendet werden. Das Label darf nicht allein geändert werden, um den Score zu erhöhen.

Bei 0.1 erscheint einmal die holprige Formulierung „… sorgfältig übersetzt verfasst“. 1.0 formuliert hier flüssiger „… durch sorgfältige Übersetzung verfasst“, verbessert aber die Label-Trefferquote nicht.

### 3. Perfekt wird im Quality Statement systematisch verletzt

In `inf-b12-4-01`, `inf-b15-3-01` und `inf-b15-3-02` stehen bei jeder Temperatur alle neun Quality Statements im Präteritum: beispielsweise „Die Anforderungsliste wurde von beiden Teams bestätigt.“

Der archivierte Prompt fordert vergangene Ergebnisse im Perfekt. Passend wäre beispielsweise: „Betrieb und Entwicklung haben die Anforderungsliste bestätigt.“ Diese Abweichung bleibt von den automatischen Checks unentdeckt. Damit bestehen pro Temperatur mindestens neun automatisch akzeptierte Ausgaben mit einer Zeitformverletzung im Quality Statement.

### 4. Eingabebegriffe werden sprachlich beschädigt

In beiden Adapterfällen wird „Ausgabeliste“ in den Arbeitsergebnissen zu „Ausgelistung“ oder „Ausgelisteten“. Das betrifft sechs Antworten je Temperatur, insgesamt 18. Die Wortlimits und JSON-Prüfung erkennen diesen Fehler nicht.

**Folgerung:** Fachbegriffe aus den Eingaben sollten sprachlich korrekt erhalten bleiben. Dieser Fehler ist temperaturübergreifend.

### 5. Temperatur 1.0 erzeugt zusätzliche Wiederholungen

Vier klare Fälle wiederholen den Ergebnisnachweis im Arbeitsergebnis und im Quality Statement: `inf-a1-7-01::2`, `inf-a1-7-01::3`, `inf-b15-3-02::2`, `inf-b15-3-02::3` im Lauf mit 1.0. Beispielsweise folgt auf den Satz über die angenommenen Review-Regeln nochmals derselbe Nachweis im Quality Statement.

Bei 0.5 wiederholt `inf-b15-3-01::3` die Methode im Quality Statement: „Durch die Identifikation wiederverwendbarer Adapter …“. Auch dies widerspricht der gewünschten Trennung von Handlung/Methode/Zweck und Ergebnisnachweis.

### 6. Fehlende Ergebnisnachweise werden teilweise zu allgemein beschrieben

Im Konfigurationsfall `inf-b12-4-02` bleibt das Statement häufig bei „Die Erhebung der Anforderungen … ist noch nicht … belegt“. Damit wird eher die Tätigkeit als ihr fachliches Ergebnis infrage gestellt.

In der jeweils dritten Wiederholung bei 0.5 und 1.0 steht „Die vorgeschlagenen Lösungsvarianten … sind noch nicht nachgewiesen“. Die Eingabe enthält aber keine vorgeschlagenen Varianten; diese stehen im Kompetenztext. Das ist ein Hinweis auf eine Vermischung von Kompetenzanforderung und erbrachter Leistung. Ein offenes Ergebnis sollte sich auf die tatsächlich erhobenen Anforderungen beziehen, etwa deren bestätigte Vollständigkeit oder Eignung, ohne eine Bestätigung zu erfinden.

## Nächste sinnvolle Schritte

1. Soll-Labels insbesondere für „sorgfältig übersetzt“ fachlich prüfen; danach einen blind durchgeführten Vergleich der Sprachqualität ergänzen.
2. Widerspruchsbehandlung, Perfekt, Fachbegriffe und Wiederholungen als konkrete Review-Kriterien berücksichtigen. Den Prompt anhand der Entwicklungsfälle gezielt verbessern.
3. Weitere Temperaturvergleiche auf den 30 Development-Fällen durchführen und `top_p`, `top_k`, Modellrevision sowie Quantisierung explizit dokumentieren. Pro Vergleich nur einen Parameter ändern.
4. Für die abschliessende Validierung neue, unberührte Holdout-Fälle verwenden: Die vorliegenden Holdout-Antworten wurden nun für die Beurteilung von Temperatur und Prompt analysiert und dienen damit bereits der Optimierung.
5. Fälle ohne Curriculum-Passung und ohne Kompetenzkontext einbeziehen. Die vorliegenden zehn Fälle erwarten ausschliesslich `overlap_curriculum: true`; die 100 % belegen deshalb noch keine zuverlässige Ablehnung unpassender Nachweise.

Für diesen Vergleich wurden keine Prompts, Soll-Labels oder bestehenden Review-Dateien verändert und keine neuen LLM-Aufrufe ausgeführt.
