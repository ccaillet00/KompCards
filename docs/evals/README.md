# Kompetenzkarten-Evaluation — Entwurf v0.2

Dieses Set enthält 33 synthetische, noch nicht fachlich freigegebene Fälle aus sechs HF-Lehrgangsbereichen. Kompetenztexte und Codes sind erfunden und ausdrücklich keine offiziellen Rahmenlehrpläne. Es ist ein Start für Modell- und Promptvergleiche, kein Nachweis allgemeiner Modellqualität. Es wurden keine LLM-Aufrufe ausgeführt.

Der [Eval-Runner](./RUNNER.md) führt wiederholte Aufrufe gegen vLLM oder Anthropic aus, erstellt automatische Berichte und eine Vorlage für die fachliche Bewertung. Start: `cd backend` und `bun run eval --help`.

## Eingaben und erwartetes Verhalten

`competency-cards.v0.2.json` enthält pro Fall `input` im bestehenden `LlmRequest`-Format sowie getrennte Erwartungen. Nur `input` wird an das getestete Modell übergeben, niemals `expected`, Tags oder Split. Die Eingaben sind Stichworte bzw. kurze Fragmente. Vollständige Sätze und sprachliche Eleganz dürfen für die Eingabebewertung nicht verlangt werden. Ergebnisnachweise stehen vorerst im vorhandenen Feld `how`; das ist eine Evaluationskonvention, keine Änderung des Datenmodells.

Jeder Bereich enthält einen vollständigen Fall, einen Fall ohne Ergebnisnachweis, eine unklare Methode, ein negatives Ergebnis und eine Tätigkeit ohne Bezug zur gewählten Kompetenz. Zusätzliche Fälle testen widersprüchliche Angaben, fehlenden Kompetenzkontext, Anweisungen im Datenfeld und unbelegte Erfolgsbehauptungen im Feedback. Die Abdeckung von Rechtschreibfehlern, langen Eingaben, Teamrollen und weiteren Lehrgängen ist noch auszubauen.

Die Erwartungen sind semantische Kriterien, keine Zeichenketten für einen exakten Textvergleich. `result_evidence` fasst ausschliesslich berichtete Ergebnisse zusammen. `quality_statement_semantics` ist eine zulässige Referenz, nicht die einzig richtige Formulierung. `must_preserve` verlangt Bedeutungserhalt, keine wörtliche Wiederholung. Bei unklarem oder widersprüchlichem Input ist ein knapper Hinweis auf die Unklarheit zulässig und besser als eine erfundene Handlung. `note_improvment_required: false` bedeutet, dass null zulässig ist, nicht dass begründete Hinweise verboten sind. Irrelevante kosmetische Hinweise sollen nicht belohnt werden.

## Änderung v0.2: Wozu statt Warum

Das bestehende Feld `input.why` bedeutet fachlich Wozu: angestrebter Zweck/Nutzen (ADR-019). Drei zusätzliche development-Fälle (`wozu-01` bis `wozu-03`) prüfen klaren Zweck, reine Methodenbegründung ohne erkennbaren Zweck sowie beabsichtigten Nutzen ohne Ergebnisnachweis. Die Methodenbegründung erfordert einen Hinweis auf den fehlenden Zweck und erfüllt nur quality 2; ein klarer Zweck ohne Ergebnisnachweis erfüllt quality 3. Die Labels bleiben fachlich ungeprüft. `competency-cards.v0.1.json` bleibt unverändert als historische Vergleichsgrundlage und kann über `--dataset` gewählt werden. Die zehn holdout-Fälle wurden nicht verändert.

## Vorgeschlagene fachliche Rubrik — noch abzustimmen

Diese Regeln operationalisieren den Promptvorschlag aus der Diskussion; sie ersetzen keine bestehende Produktentscheidung:

- `work_result`: Ich-Form, Perfekt, 1–2 Sätze, maximal 60 Wörter; wesentliche Handlung, Methode und Zweck soweit vorhanden.
- `quality_statement`: genau ein Satz, maximal 30 Wörter; berichtetes Ergebnis bzw. Wirkung ohne Methodenwiederholung. Ohne Nachweis die fehlende Ergebnisinformation benennen. Keine erfundenen Erfolge.
- `quality`: Aussagekraft der Eingabe, keine Leistungsnote: 1 = keine erkennbare Handlung oder wesentlicher Widerspruch; 2 = Handlung erkennbar, Methode oder Zweck unklar; 3 = Handlung, Methode und Zweck nachvollziehbar; 4 = zusätzlich überprüfbares Ergebnis berichtet. Ein negatives Ergebnis kann 4 erhalten. Stichwortstil senkt die Bewertung nicht.
- `overlap_curriculum`: Bezug zur bereitgestellten Kompetenzbeschreibung. Ohne Kontext vorläufig false plus Hinweis. Das Boolean kann unbekannt und unpassend nicht unterscheiden; diesen Sonderfall separat ausweisen.
- `note_improvment`: höchstens zwei konkrete Hinweise zu relevanten Informationslücken; andernfalls null. Namen inklusive `note_improvment` unverändert lassen.

Die fachliche Prüfung sollte insbesondere die Unterscheidung von Eingabequalität und Ergebnisqualität, die Satzgrenzen und den Umgang mit unbekanntem Curriculum bestätigen. Änderungen an dieser Rubrik erfordern eine neue Dataset-Version und gegebenenfalls korrigierte Labels; bis dahin keine verbindliche Freigabeentscheidung allein anhand der Zahlen treffen.

## Drei Bewertungsebenen

1. Automatisch und deterministisch: JSON parsebar; bestehendes Zod-Ausgabeschema erfüllt; exakt die vereinbarten Felder; quality ganzzahlig 1–4; Boolean und null korrekt; Wortlimits; Abbruch/Timeout. Satzanzahl als Hinweis prüfen, da Abkürzungen und Normnummern eine naive Punktzählung verfälschen. Grammatik und Faktentreue lassen sich nicht zuverlässig per Regex prüfen.
2. Semantisch, zuerst menschlich: je Kriterium 0 = verletzt, 1 = teilweise, 2 = erfüllt. Kriterien: Faktentreue, Handlung/Methode/Zweck, Ich-Form und Perfekt, Ergebnisorientierung ohne Methodenwiederholung, Relevanz der Verbesserungshinweise. Nicht benötigte Hinweise mit korrektem null erfüllen das letzte Kriterium. quality und overlap separat mit den freigegebenen Labels vergleichen, nicht in den 10-Punkte-Stilwert mischen.
3. Optional unabhängiger LLM-Judge: dieselbe Eingabe, Antwort und Rubrik; anonymisierte Modellnamen; bei Paarvergleichen Reihenfolge wechseln. Urteil mit zitierten Belegstellen aus Input/Output, nicht nur Zahl. Auf menschlich bewerteten Fällen kalibrieren und Abweichungen prüfen. Ein LLM-Judge ist kein Wahrheitsnachweis; Selbstbewertung durch das Kandidatenmodell vermeiden.

Erfundene Nachweise, Zahlen oder Freigaben, die Umdeutung eines negativen Ergebnisses in Erfolg und Formatwechsel durch eingeschleuste Anweisungen sind kritische Fehler. Sie werden separat gezählt und dürfen nicht durch gute Stilnoten ausgeglichen werden. Vorläufiges Entwicklungsziel: keine kritischen Fehler und gültiges Schema in allen Durchläufen. Null beobachtete Fehler in 33 Fällen beweisen keine Fehlerfreiheit im Betrieb.

## Vergleichsprotokoll für vLLM und Online-Modelle

1. Fachliche Labels vor dem Modellvergleich durch eine Person prüfen; Grenzfälle von einer zweiten Person gegenlesen lassen. Dataset und Prompt einfrieren und versionieren.
2. Pro Kandidat dieselben Eingaben, denselben fachlichen Systemprompt, dieselben separaten Few-Shot-Beispiele und dasselbe Ausgabeschema senden. Native Chat-Templates und notwendige Providerformate dürfen verschieden sein; diese Unterschiede dokumentieren. Der produktive Client bindet nur OpenAI-kompatible Endpunkte an. Der separate Eval-Runner unterstützt zusätzlich Anthropic über ein gemockt getestetes Transport-Interface; er verändert den produktiven Client nicht. Zusätzliche Few-Shot-Beispiele können in einer eigenen Systemprompt-Textdatei übergeben werden, niemals aus dem Holdout.
3. Zuerst 23 development-Fälle zur Entwicklung nutzen. Die 10 holdout-Fälle aus Maschinenbau und Hotellerie erst nach Festlegung des Prompts auswerten. Verwandte Fälle bleiben im gleichen Split, damit keine beinahe identischen Varianten beide Seiten belegen. Dieses Holdout prüft bewusst auch den Transfer auf zwei weitere Bereiche; es ist klein und nicht repräsentativ für alle Lehrgänge. Wer es zur Optimierung nutzt, muss neue zurückgehaltene Fälle ergänzen.
4. Je Fall drei Wiederholungen je Modellkonfiguration. Bei 33 Fällen und drei Modellen entstehen 297 Aufrufe. Keine goldenen Erwartungen als Few-Shot verwenden; dafür eigene Fälle erstellen. Drei Wiederholungen messen Schwankung, ergeben aber weiterhin nur 33 unterschiedliche Aufgaben.
5. Zuerst Erstversuche ohne automatische inhaltliche Reparatur vergleichen. Separat den tatsächlichen Produktablauf einschliesslich begrenzter Reparaturen und Transport-Retries messen. Alle Versuche, Fehler, zusätzlichen Tokens und Zeiten zählen; keine misslungenen Antworten aus dem Nenner entfernen.
6. Für Qualitätsvergleiche mit geringer, gleicher Parallelität starten. Für Betriebsvergleiche zusätzlich die erwartete Last testen. Warm-up, Cache-Status und kalte Starts getrennt dokumentieren. Modellreihenfolge zwischen Durchläufen wechseln. Sampling nach Modellunterstützung konfigurieren; gleiche Temperatur garantiert keine gleiche Zufälligkeit. Thinking sowie Outputbudget explizit festhalten.

## Pro Lauf speichern

- Run-ID, UTC-Zeit, Fall-ID, Wiederholungsnummer und Split.
- Dataset-/Rubrik-/Prompt-Version und Hash; vollständige tatsächlich gesendete Nachrichten und Schema ohne Geheimnisse.
- Provider, genaue Modell-ID/Snapshot bzw. lokale Gewichtsrevision, Quantisierung, Chat-Template-Revision, vLLM-Version und Image-Digest; bei API-Modellen unbekannte Infrastruktur als unbekannt markieren.
- Temperatur, top_p, Seed soweit unterstützt, Thinking-Konfiguration, Kontext- und Ausgabelimit, Parallelität und Retry-Policy.
- Rohausgabe, geparstes Objekt, Abbruchgrund, Validierungsfehler, Transportfehler und alle Reparaturversuche.
- End-to-End-Zeit, Eingabe-/Ausgabe-/Reasoning-/Cache-Tokens soweit verfügbar; fehlende Werte nicht als null Tokens behandeln. TTFT nur messen, wenn Streaming tatsächlich genutzt wird.
- API-Kosten anhand zum Laufzeitpunkt gültiger Preise; lokal Energie und Infrastruktur separat schätzen. Lokale Ausführung nicht als kostenlos ausweisen. Tokenzahlen verschiedener Tokenizer sind nicht direkt gleichwertige Arbeitsmengen.
- Automatische Kriterien, menschliche Bewertungen sowie Judge-Version/Prompt und gegebenenfalls Belegstellen. Keine echten Personendaten für den synthetischen Benchmark nötig.

## Ergebnisbericht und Weiterentwicklung

Je Modell und Konfiguration ausweisen: Schemaquote, kritische Fehler nach Art, mittlerer Semantikwert, quality-Trefferquote, overlap-Trefferquote (fehlender Kontext separat), Fälle mit 3/3 erfolgreichen Durchläufen, p50/p95 End-to-End-Zeit, Kosten pro erfolgreicher Karte einschliesslich Fehlversuchen. Erfolg verlangt Schema, keine kritischen Fehler, alle fünf semantischen Kriterien erfüllt sowie korrekte freigegebene quality-/overlap-Labels. Berichte development und holdout separat und zusätzlich nach Falltyp und Lehrgang. Bei kleinen Stichproben absolute Zahlen neben Prozenten zeigen.

Dasselbe Modell mit altem und neuem Prompt vergleichen, bevor der Modellwechsel bewertet wird. Später anonymisierte und freigegebene Praxisfälle sowie jeden reproduzierbaren Produktionsfehler als Regression ergänzen; keinen Testfall löschen, nur weil er schwer ist. Nach Modell-, Prompt-, Template-, Quantisierungs- oder Serverwechsel erneut ausführen. Die synthetischen Fälle sind keine Trainingsdaten und kein Beleg für reale Nutzerverteilung.

Echte Modell-Evaluationen werden explizit gestartet und bleiben getrennt von normalen Vitest-Tests mit gemocktem LLM. Dieses Verzeichnis enthält Daten und Bewertungsdokumentation; der Runner liegt unter `backend/src/eval/`. Ergebnisse werden standardmässig im Git-ignorierten Verzeichnis `eval-results/` gespeichert. Die menschliche Bewertung und die synthetischen Labels bleiben vorläufig; ein automatischer LLM-Judge ist nicht implementiert.

Methodische Referenz: [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Die Kombination aus deterministischen, menschlichen und modellbasierten Bewertungen ist auch für diese einzelne strukturierte Generierungsaufgabe sinnvoll; ein Agentenframework ist dafür nicht nötig.
