# Kompetenzkarten-Evaluation — Rubrik v1.1

Stand: 14. Oktober 2026. Fachlicher Regelabgleich gemäss Nutzerauftrag und ADR-025. Dataset-Labels und Modellantworten sind weiterhin nicht menschlich freigegeben. Die bisherige Bewertungsgrundlage bleibt in [rubric.v1.0.md](./rubric.v1.0.md) erhalten; eingefrorene Läufe bleiben unverändert.

Dieses Set enthält 33 synthetische, noch nicht fachlich freigegebene Fälle aus sechs HF-Lehrgangsbereichen. Kompetenztexte und Codes sind erfunden und ausdrücklich keine offiziellen Rahmenlehrpläne. Es ist ein Start für Modell- und Promptvergleiche, kein Nachweis allgemeiner Modellqualität.

Der [Eval-Runner](./RUNNER.md) verwendet standardmässig denselben SDK-Client wie die Applikation (`EVAL_EXECUTION=client`), erstellt automatische Berichte und eine Vorlage für die fachliche Bewertung. `EVAL_EXECUTION=direct` wählt ausdrücklich den bisherigen direkten Modellvergleich, auch gegen die native Anthropic API. Aufrufwege getrennt vergleichen; im Client-Modus normalisierte Ausgabe, Roh-Schemaquote und sämtliche SDK-HTTP-Versuche getrennt ausweisen. Start: `cd backend` und `bun run eval --help`.

## Ergänzendes Informatik-Set mit CSV-Kompetenzen (ADR-020)

`informatics-cards.v1.0.json` enthält 40 neue Fälle mit unveränderten Kompetenztexten aus Nutzer-CSV-Dateien: 30 development / zehn holdout, 20 ausgewählte Kompetenzen, alle 15 Bereiche im Entwicklungsteil. Praxiseingaben und Labels sind synthetisch und fachlich ungeprüft. Quellen mit SHA-256, vollständiger Katalog, Bedienung und Abdeckung stehen in [INFORMATICS.md](./INFORMATICS.md); Erwartungsreview in [INFORMATICS_REVIEW.md](./INFORMATICS_REVIEW.md).

Für neue Bewertungen dieses Sets gelten ADR-020 und ADR-025: Die angegebene Rolle wird im Arbeitsergebnis ausdrücklich genannt; ausgeführte Handlungen und vergangene Ergebnisse dürfen in natürlichem Perfekt oder Präteritum stehen. Aktuell offene Zustände dürfen im Präsens stehen; Zeitformwechsel dürfen den zeitlichen Sinn nicht verändern. Beide Texte ergeben zusammen 2–3 Sätze. Das Quality Statement erhält vorhandene qualitative, quantitative und negative Nachweise. Ohne Nachweis benennt es ein konkretes, ausdrücklich offenes Zielkriterium und fordert den fehlenden Beleg in `note_improvment` nach. Ist kein Kriterium ableitbar, benennt es die konkrete Informationslücke. Kein pauschaler Standardsatz; keine erfundenen Erfolge. Fehlender Kompetenzbezug beeinflusst weder quality noch einen vorhandenen Nachweis. Diese Regeln gelten auch bei der fachlichen Output-Bewertung (`facts`, `action`, `grammar`, `outcome`, `improvements`).

Die bisherigen Dateien v0.1/v0.2 bleiben historische Regression-Sets mit älteren Referenzen, insbesondere generischem Fallback und teilweise anderen Pflicht-Hinweisen. Die folgenden v0.2-Beschreibungen sind deren historische Grundlage und ersetzen nicht ADR-020. Für das neue Set fehlen bei nicht belegtem Ergebnis stets erforderliche Nachweise; die Label-Regeln sind konsistent darauf ausgerichtet. Neue Erwartungswerte niemals an das Kandidatenmodell senden. Unterschiedliche Datensätze nicht als direkten Vorher-/Nachher-Promptvergleich ausgeben.

## Eingaben und erwartetes Verhalten

`competency-cards.v0.2.json` enthält pro Fall `input` im bestehenden `LlmRequest`-Format sowie getrennte Erwartungen. Nur `input` wird an das getestete Modell übergeben, niemals `expected`, Tags oder Split. Die Eingaben sind Stichworte bzw. kurze Fragmente. Vollständige Sätze und sprachliche Eleganz dürfen für die Eingabebewertung nicht verlangt werden. Ergebnisnachweise stehen vorerst im vorhandenen Feld `how`; das ist eine Evaluationskonvention, keine Änderung des Datenmodells.

Jeder Bereich enthält einen vollständigen Fall, einen Fall ohne Ergebnisnachweis, eine unklare Methode, ein negatives Ergebnis und eine Tätigkeit ohne Bezug zur gewählten Kompetenz. Zusätzliche Fälle testen widersprüchliche Angaben, fehlenden Kompetenzkontext, Anweisungen im Datenfeld und unbelegte Erfolgsbehauptungen im Feedback. Die Abdeckung von Rechtschreibfehlern, langen Eingaben, Teamrollen und weiteren Lehrgängen ist noch auszubauen.

Die Erwartungen sind semantische Kriterien, keine Zeichenketten für einen exakten Textvergleich. `result_evidence` fasst ausschliesslich berichtete Ergebnisse zusammen. `quality_statement_semantics` ist eine zulässige Referenz, nicht die einzig richtige Formulierung. `must_preserve` verlangt Bedeutungserhalt, keine wörtliche Wiederholung. Bei unklarem oder widersprüchlichem Input ist ein knapper Hinweis auf die Unklarheit zulässig und besser als eine erfundene Handlung. `note_improvment_required: false` bedeutet, dass null zulässig ist, nicht dass begründete Hinweise verboten sind. Irrelevante kosmetische Hinweise sollen nicht belohnt werden.

## Änderung v0.2: Wozu statt Warum

Das bestehende Feld `input.why` bedeutet fachlich Wozu: angestrebter Zweck/Nutzen (ADR-019). Drei zusätzliche development-Fälle (`wozu-01` bis `wozu-03`) prüfen klaren Zweck, reine Methodenbegründung ohne erkennbaren Zweck sowie beabsichtigten Nutzen ohne Ergebnisnachweis. Die Methodenbegründung erfordert einen Hinweis auf den fehlenden Zweck und erfüllt nur quality 2; ein klarer Zweck ohne Ergebnisnachweis erfüllt quality 3. Die Labels bleiben fachlich ungeprüft. `competency-cards.v0.1.json` bleibt unverändert als historische Vergleichsgrundlage und kann über `--dataset` gewählt werden. Die zehn holdout-Fälle wurden nicht verändert.

## Fachliche Rubrik v1.1

Die Referenz aus [REFERENCE_CHAT_REVIEW.md](./REFERENCE_CHAT_REVIEW.md) stützt qualitative Ergebnisnachweise und natürliches Präteritum. Sie belegt keine allgemeine Schulvorgabe für Zeitform oder Länge. Rolle, Ich-Form, 1–2 Sätze/maximal 60 Wörter für `work_result`, genau ein Satz/maximal 30 Wörter für `quality_statement` und höchstens zwei Hinweise bleiben interne Projektentscheidungen. Vollständige, grammatische Sätze sind weiterhin erforderlich.

| Kriterium | 2 = erfüllt | 1 = teilweise | 0 = verletzt |
|---|---|---|---|
| `facts` | Nur berichtete Tatsachen; Zweck, Nachweis, Einschränkungen und Widersprüche korrekt getrennt | Sachlich unpräzise, ohne neue Tatsachen oder Bedeutungsumkehr | Erfundene Tätigkeit, Hilfsmittel, Wirkung, Zahl oder Freigabe; Widerspruch eigenmächtig aufgelöst |
| `action` | Angegebene Rolle und alle wesentlichen Handlungen, Methoden und Zwecke erhalten; fehlende Angaben offen | Nicht wesentliche Details verloren | Wesentliche Handlung verloren oder umgedeutet, etwa Eskalation oder Beschränkung auf Analyse |
| `grammar` | Ich-Form im Arbeitsergebnis, vollständige korrekte Sätze, Satz-/Wortgrenzen; natürliches Perfekt oder Präteritum, Präsens für aktuelle Zustände | Lokaler Sprach- oder Formfehler bei verständlicher Aussage | Unvollständige/unverständliche Sätze oder grundlegende Formverstösse |
| `outcome` | Vorhandener qualitativer, quantitativer oder negativer Nachweis erhalten; sonst konkretes offenes Kriterium oder spezifische Lücke, ohne Methodenwiederholung | Nachweis/Kriterium nur teilweise präzise oder unnötige Wiederholung | Nachweis verloren, Ziel als Erfolg ausgegeben oder unbelegtes Kriterium ergänzt |
| `improvements` | Höchstens zwei Fragen nach tatsächlichen Lücken, ohne positive Antwort vorzugeben; null bei vollständigen Angaben | Relevante Frage zu allgemein oder zusammengehörige Lücken unvollständig gebündelt | Bereits berichtete Angaben nachgefordert, falsche Lücke adressiert, Erfolg verlangt oder notwendige Nachfrage fehlt |

Präteritum allein ist kein Fehler und senkt `grammar` nicht. Ein negativer Befund ist ein Nachweis, kein Anlass, eine positive Freigabe nachzufordern. Eine korrekte Zeitform gleicht Faktenverlust, Handlungsauslassung oder unpassende Fragen nicht aus.

`quality` bewertet unverändert die Eingabe: 1 = keine erkennbare Handlung oder wesentlicher Widerspruch; 2 = Handlung erkennbar, Methode oder Zweck unklar; 3 = Handlung, Methode und Zweck nachvollziehbar; 4 = zusätzlich überprüfbares Ergebnis, auch negativ. Stichwortstil und Curriculum-Passung senken quality nicht. `overlap_curriculum` richtet sich ausschliesslich nach der gespeicherten Kompetenzbeschreibung; ohne Beschreibung false plus Kontextfrage. `note_improvment` bleibt String/null.

Die Rubrikänderung betrifft die sprachliche Output-Bewertung, keine Dataset-Labels. Dataset-Dateien v0.1/v0.2/v1.0 bleiben unverändert; Label- oder Erwartungsänderungen benötigen weiterhin eine neue Dataset-Version. Die neue Rubrik ist durch ihren Stand und den vom Runner gespeicherten README-Hash identifizierbar. Alte Reviews nicht überschreiben. Für Nachbewertungen separate Review-Dateien und Berichte mit Run-ID, Rubrikversion und Belegstellen erstellen.

### Kalibrierung des Reviews (keine zurückgehaltenen Benchmarkfälle)

- Berichtete Abnahme: «Die Fachstelle nahm den Export ohne Korrektur ab.» und «Die Fachstelle hat den Export ohne Korrektur abgenommen.» sind gleichwertige Ergebnisformulierungen, sofern so berichtet.
- Berichteter negativer Befund: «Eine Prüfsumme stimmte nicht überein.» ist zulässig; «Alle Prüfsummen stimmten überein.» verletzt Faktenbindung und Ergebnisorientierung.
- Nur Analyse und Massnahmenableitung berichtet: eine behauptete Umsetzung oder Wirkungskontrolle ist ein kritischer Faktenfehler.
- Eskalation berichtet, Übernahme nicht berichtet: Eskalation im Arbeitsergebnis erhalten und nach Rückmeldung zur Übernahme fragen; «Hast du eskaliert?» verletzt `improvements`.
- Einsparung nur als Zweck: Einsparung als noch nicht nachgewiesen benennen; eine tatsächliche Kostenreduktion nicht behaupten.

## Drei Bewertungsebenen

1. Automatisch und deterministisch: JSON parsebar; bestehendes Zod-Ausgabeschema erfüllt; exakt die vereinbarten Felder; quality ganzzahlig 1–4; Boolean und null korrekt; Wortlimits; Abbruch/Timeout. Satzanzahl als Hinweis prüfen, da Abkürzungen und Normnummern eine naive Punktzählung verfälschen. Grammatik und Faktentreue lassen sich nicht zuverlässig per Regex prüfen.
2. Semantisch, zuerst menschlich: je Kriterium 0 = verletzt, 1 = teilweise, 2 = erfüllt. Kriterien: Faktentreue, Handlung/Methode/Zweck, Ich-Form und natürliche Vergangenheitsformen, Ergebnisorientierung ohne Methodenwiederholung, Relevanz der Verbesserungshinweise. Nicht benötigte Hinweise mit korrektem null erfüllen das letzte Kriterium. quality und overlap separat mit den freigegebenen Labels vergleichen, nicht in den 10-Punkte-Semantikwert mischen.
3. Optional unabhängiger LLM-Judge: dieselbe Eingabe, Antwort und Rubrik; anonymisierte Modellnamen; bei Paarvergleichen Reihenfolge wechseln. Urteil mit zitierten Belegstellen aus Input/Output, nicht nur Zahl. Auf menschlich bewerteten Fällen kalibrieren und Abweichungen prüfen. Ein LLM-Judge ist kein Wahrheitsnachweis; Selbstbewertung durch das Kandidatenmodell vermeiden.

Erfundene Nachweise, Zahlen oder Freigaben, die Umdeutung eines negativen Ergebnisses in Erfolg und Formatwechsel durch eingeschleuste Anweisungen sind kritische Fehler. Auch der Verlust einer wesentlichen Handlung oder Einschränkung ist als kritischer Handlungserhalt-Fehler zu kennzeichnen. Unpassende Nachfragen verletzen unabhängig davon `improvements`; rein sprachliche Fehler werden separat unter `grammar` erfasst. Kritische Fehler werden separat gezählt und dürfen nicht durch gute Stilnoten ausgeglichen werden. Vorläufiges Entwicklungsziel: keine kritischen Fehler und gültiges Schema in allen Durchläufen. Null beobachtete Fehler in 33 Fällen beweisen keine Fehlerfreiheit im Betrieb.

## Vergleichsprotokoll für vLLM und Online-Modelle

1. Fachliche Labels vor dem Modellvergleich durch eine Person prüfen; Grenzfälle von einer zweiten Person gegenlesen lassen. Dataset und Prompt einfrieren und versionieren.
2. Pro Kandidat dieselben Eingaben, denselben fachlichen Systemprompt, dieselben separaten Few-Shot-Beispiele und dasselbe Ausgabeschema senden. Native Chat-Templates und notwendige Providerformate dürfen verschieden sein; diese Unterschiede dokumentieren. Der produktive Client bindet nur OpenAI-kompatible Endpunkte an und ist auch der Standard des Runners. Im ausdrücklich direkten Modus unterstützt der Runner zusätzlich Anthropic über ein gemockt getestetes Transport-Interface. Zusätzliche Few-Shot-Beispiele können in einer eigenen Systemprompt-Textdatei übergeben werden, niemals aus dem Holdout.
3. Zuerst 23 development-Fälle zur Entwicklung nutzen. Die 10 holdout-Fälle aus Maschinenbau und Hotellerie erst nach Festlegung des Prompts auswerten. Verwandte Fälle bleiben im gleichen Split, damit keine beinahe identischen Varianten beide Seiten belegen. Dieses Holdout prüft bewusst auch den Transfer auf zwei weitere Bereiche; es ist klein und nicht repräsentativ für alle Lehrgänge. Wer es zur Optimierung nutzt, muss neue zurückgehaltene Fälle ergänzen.
4. Je Fall drei Wiederholungen je Modellkonfiguration. Bei 33 Fällen und drei Modellen entstehen 297 Aufrufe. Keine goldenen Erwartungen als Few-Shot verwenden; dafür eigene Fälle erstellen. Drei Wiederholungen messen Schwankung, ergeben aber weiterhin nur 33 unterschiedliche Aufgaben.
5. Direkte Erstversuche und produktiven SDK-Aufruf getrennt vergleichen. Im Standard-Client-Modus werden SDK-Retries und Hinweisnormalisierung wie in der App angewendet; im direkten Modus gibt es keine Retries/Reparaturen. Alle HTTP-Versuche, Fehler, zusätzlichen Tokens und Zeiten zählen; keine misslungenen Antworten aus dem Nenner entfernen. Ein Client-Eval ist weiterhin kein vollständiger Frontend-/API-/DB-Test.
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

Bei einem Rubrikwechsel zuerst dieselben Baseline-Antworten separat mit beiden Rubriken bewerten: ein höherer Score allein durch Lockerung ist keine Modellverbesserung. Danach Baseline- und Kandidatenprompt mit derselben Rubrik v1.1 vergleichen und facts, action, improvements sowie grammar getrennt ausweisen. Dasselbe Modell mit altem und neuem Prompt vergleichen, bevor der Modellwechsel bewertet wird. Später anonymisierte und freigegebene Praxisfälle sowie jeden reproduzierbaren Produktionsfehler als Regression ergänzen; keinen Testfall löschen, nur weil er schwer ist. Nach Modell-, Prompt-, Template-, Quantisierungs- oder Serverwechsel erneut ausführen. Die synthetischen Fälle sind keine Trainingsdaten und kein Beleg für reale Nutzerverteilung.

Echte Modell-Evaluationen werden explizit gestartet und bleiben getrennt von normalen Vitest-Tests mit gemocktem LLM. Dieses Verzeichnis enthält Daten und Bewertungsdokumentation; der Runner liegt unter `backend/src/eval/`. Ergebnisse werden standardmässig im Git-ignorierten Verzeichnis `eval-results/` gespeichert. Die menschliche Bewertung und die synthetischen Labels bleiben vorläufig; ein automatischer LLM-Judge ist nicht implementiert.

Methodische Referenz: [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Die Kombination aus deterministischen, menschlichen und modellbasierten Bewertungen ist auch für diese einzelne strukturierte Generierungsaufgabe sinnvoll; ein Agentenframework ist dafür nicht nötig.
