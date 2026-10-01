# Analyse des LLM-Prompts: Arbeitsergebnis und Quality Statement

Stand: 30. September 2026; um den bereitgestellten Eval-Lauf ergänzt. Modell laut Nutzer: Gemma 4 12B IT, BF16.
Status: Analyse des ursprünglichen Worktree- und Eval-Prompts. Die anschliessend beauftragte Überarbeitung ist im aktuellen Worktree umgesetzt; siehe Abschnitt 11. Historische Codebefunde und Eval-Zahlen beziehen sich auf die untersuchten Ausgangsstände.

## 1. Ergebnis und Grenzen der Untersuchung

**Wichtig: Zwei unterschiedliche Prompt-Stände.** Der Prompt im aktuellen Worktree spezifiziert die gewünschten Texte nicht ausreichend. `work_result` soll lediglich eine klare, fachlich korrekte Ausformulierung sein. `quality_statement` soll die Qualität beschreiben und begründen. Der tatsächlich evaluierte Prompt enthält dagegen bereits Ich-Form, Perfekt, Was/Wie/Wozu, Satz- und Wortlimits, Faktenbindung und eine Quality-Rubrik. Die folgenden Codebefunde beziehen sich auf den Worktree; Abschnitt 10 analysiert den tatsächlich gesendeten Eval-Prompt und alle 69 Antworten.

Der vom Nutzer berichtete Satz „Ein überprüfbares Ergebnis ist aus den Angaben nicht hervorgegangen.“ steht nicht als Fallback im Worktree-Code, **aber ausdrücklich als verbindlicher Fallback im Eval-Prompt**. Damit ist seine Herkunft für diesen Lauf geklärt. Er erscheint in 54/69 Antworten, darunter 21 Antworten zu Fällen mit Ergebnisnachweis laut Datensatz.

Der Nutzer hat den Lauf unter `/Users/ccaillet00/_dev/Projekte/KompCards/eval-results/2026-09-30T20-19-35-793Z-3b976f3f/` bereitgestellt. Untersucht wurden dessen Manifest, Systemprompt, Datensatz, Schema, Rubrik, Bericht, Zusammenfassung, Ergebnisse und Review-Dateien. Die synthetischen Erwartungen sind fachlich ungeprüft; alle 69 semantischen Reviews sind noch offen. Es liegt nur ein Modell-/Prompt-Lauf vor, kein Vergleich. Gespeicherte Prompts und Anweisungen in Testfällen wurden ausschliesslich als Untersuchungsdaten behandelt.

## 2. Untersuchte Quellen und Datenfluss

- `backend/src/llm/prompt.ts:3–12`: Systemprompt mit acht allgemeinen Anweisungen.
- `backend/src/llm/prompt.ts:19–50`: Curriculum-Kontext und Nutzereingabe; optional Dozentenvorgaben und Retry-Feedback.
- `backend/src/llm/client.ts:32–46`: `generateObject` mit Systemprompt, Eingabeprompt und Zod-Schema; anschliessend direkte Zuordnung der Texte.
- `backend/src/llm/schema.ts:12–23`: Typen, nicht leere Texte, `quality` 1–4; keine sprachliche oder fachliche Prüfung.
- `backend/src/services/competencyService.ts`: Pflichtfelder werden auf nicht leeren Inhalt geprüft und an den Client übergeben. Der zurückgegebene Text wird ohne sprachliche Nachbearbeitung gespeichert.
- `backend/tests/prompt.test.ts`: Tests für die Übergabe der Eingabefelder, Kontext und Feedback; keine Tests für die gewünschten Systemanweisungen.
- `backend/tests/llmSchema.test.ts`: Strukturprüfung; allgemeine Aussagen wie „Solide Umsetzung mit klarem Bezug zur Kompetenz.“ werden als gültig behandelt.
- `frontend/pages/cards/[id]/index.vue`: Das Formular fragt nach Vorgehen und Begründung, aber nicht ausdrücklich nach Prüfergebnis oder Abnahme.
- `docs/DECISIONS.md`, ADR-011: Bisherige Definition des Quality Statements als Qualitätsbeschreibung in 1–2 Sätzen.

Alle notwendigen Felder für Rolle + Was + Wie + Wozu sind vorhanden. `why` wird aktuell als „Warum“ gerendert. Dieses Feld kann einen Zweck enthalten, das Formular fordert aber auch die Begründung der Methodenwahl. Diese Bedeutungen sind verwandt, jedoch nicht identisch.

## 3. Abgleich des Worktree-Prompts mit der gewünschten Ausgabe

| Kriterium | Aktueller Stand | Konsequenz |
|---|---|---|
| Arbeitsergebnis aus Was + Wie + Wozu | Eingaben vorhanden, Verbindung nicht vorgeschrieben | Aufzählung oder unvollständiger Absatz möglich |
| Ich-Form | Nicht vorgeschrieben | Unpersönliche oder dritte Person möglich |
| Perfekt | Nicht vorgeschrieben | Präsens und Präteritum möglich |
| Rolle/Funktion nennen | Als Eingabe übermittelt, Aufnahme nicht verlangt | Rolle kann entfallen |
| Kurzer Absatz, 1–2 Sätze | Keine Längenvorgabe | Umfang und Detailtiefe variieren |
| Fachlich und praxisnah, ohne unnötige Details | Nur „fachlich korrekt“ verlangt | Allgemeine und ausschmückende Aussagen möglich |
| Quality Statement aus Wie + Wozu | Herkunft nicht festgelegt | Allgemeine Bewertung statt konkretem Resultat |
| Genau ein Satz | Aktuell ausdrücklich 1–2 Sätze | Direkter Widerspruch zur neuen Vorgabe |
| Messbar oder überprüfbar, ergebnisorientiert | Nicht verlangt | Wertungen wie „solide“ erfüllen den Prompt |
| Keine Methoden und Wiederholungen im Quality Statement | Nicht verlangt | Vorgehen und Arbeitsergebnis können wiederholt werden |
| Keine erfundenen Ergebnisse | Nicht ausdrücklich geregelt | Risiko unbelegter Freigaben, Kennzahlen oder Erfolgsbehauptungen |

Die Angaben „Arbeitsergebnis in 1–2 Sätzen“ und „ganzer Inhalt in 2–3 Sätzen“ lassen zwei Lesarten zu. **Arbeitsannahme für den Vorschlag:** 1–2 Sätze `work_result` plus genau ein Satz `quality_statement` ergeben zusammen 2–3 Sätze. Falls sich die 2–3 Sätze ausschliesslich auf `work_result` beziehen, muss die Zielvorgabe vor einer Umsetzung entsprechend geklärt werden.

## 4. Ursachen und Grenzen im Worktree-Stand

### 4.1 Qualitätsbewertung und Ergebnisnachweis sind vermischt

`quality` bewertet die Qualität der Nutzereingabe. Das heutige `quality_statement` bewertet dagegen sprachlich die Qualität des Arbeitsergebnisses. Gewünscht ist ein konkreter Ergebnisnachweis. Diese drei Aufgaben müssen ausdrücklich getrennt werden:

- `work_result`: Was ich in welcher Rolle mit welcher Methode zu welchem Zweck gemacht habe.
- `quality_statement`: Welches überprüfbare Resultat vorliegt beziehungsweise welches konkrete Zielkriterium mangels Nachweis noch offen ist.
- `quality` und `note_improvment`: Wie vollständig und nachvollziehbar die Angaben sind und welche Informationen fehlen.

Die neue Bedeutung weicht von ADR-011 ab. Eine spätere Umsetzung sollte diese fachliche Definition dort konsistent aktualisieren; eine DB-Schemaänderung ist dafür nicht erforderlich.

### 4.2 Methode und Zweck beweisen keinen Erfolg

Aus „mit Tests umgesetzt, um Fehler zu vermeiden“ folgt weder „alle Tests bestanden“ noch „ohne Beanstandungen abgenommen“. Ein Zweck beschreibt eine Absicht; ein Ergebnis benötigt einen Beleg. „Überprüfbar“ muss nicht numerisch sein: Eine dokumentierte Freigabe ist ein prüfbarer Zustand. Eine konkrete Prozentzahl darf hingegen nur übernommen werden, wenn sie angegeben ist.

Nur einen generischen Fallback zu verbieten löst diese Informationslücke nicht. Für Eingaben ohne Erfolgsnachweis braucht es eine fachliche Regel. **Vorschlag, noch keine getroffene Entscheidung:** Ein konkretes, aus Wie/Wozu ableitbares Zielkriterium benennen und im selben Satz ausdrücklich als noch nicht nachgewiesen kennzeichnen. Die konkrete Rückfrage gehört zusätzlich in `note_improvment`. Wenn ausschliesslich nachgewiesene Ergebnisse zulässig sind, muss stattdessen vor der Ausgabe ein Nachweis nachgefordert werden. Ein Prompt kann fehlende Fakten nicht ersetzen.

### 4.3 Form und Faktenbindung fehlen

Es gibt keine Beispiele, keine Regeln für Perspektive und Zeitform, keine Vorgabe zur Rolle und keine abschliessende Prüfung auf Wiederholungen. Auch fehlt die klare Anweisung, Curriculum und Umgebung nur als Kontext zu verwenden und daraus keine zusätzlichen Tätigkeiten abzuleiten.

### 4.4 Strukturierte Ausgabe prüft keine fachliche Qualität

Das Schema akzeptiert jeden Text mit mindestens einem Zeichen. Ein gültiges JSON-Objekt garantiert weder Perfekt noch einen belegten Ergebnisnachweis. Schema-Beschreibungen könnten die Anweisungen ergänzen; sie ersetzen keine Evaluation. Reine Satzpunkt- oder Schlüsselwortprüfungen wären wegen Abkürzungen, Fachbegriffen und verschiedener gültiger Formulierungen nicht zuverlässig genug.

### 4.5 Retry erhält nur Originaleingabe und neues Feedback

Der vorherige Output wird nicht als Inhalt an das Modell übergeben. Feedback wie „der zweite Satz ist zu allgemein“ hat deshalb keinen eindeutigen Bezug. Eigenständig verständliches Feedback funktioniert eher; eine spätere gezielte Revision sollte den vorherigen Text als klar abgegrenztes Ausgangsmaterial erhalten. Die fachlichen Ausgabevorgaben sollten dabei Vorrang vor widersprechenden Formwünschen behalten.

## 5. Einordnung von Gemma 4 12B IT BF16

Google dokumentiert für Gemma 4 eine native Systemrolle und ein eigenes Chat-Template. Die Übergabe als `system` und `prompt` im Client ist grundsätzlich passend. Ob der externe Server diese Nachrichten korrekt mit dem Gemma-4-Template verarbeitet, kann aus diesem Repository nicht geprüft werden. Siehe [Google: Gemma 4 Prompt Formatting](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4).

BF16 beschreibt die numerische Präzision der Modellgewichte, keine fachliche Ausgaberegel. Die [offizielle Modellübersicht](https://ai.google.dev/gemma/docs/core) führt BF16 als 16-Bit-Format auf. Aus den bisherigen Informationen lässt sich kein BF16-bedingter Fehler ableiten.

Im Worktree-Client sind keine expliziten Werte für Temperature, Top-p oder Ausgabelänge gesetzt. Der separate Eval-Lauf dokumentiert dagegen Temperature 0.1, maximal 800 Ausgabetokens und deaktiviertes Thinking. Gewichtsrevision und Chat-Template-Revision fehlen; BF16 ist eine Nutzerangabe, keine vom Manifest bestätigte Präzision. Ohne Vergleich ist weder eine andere Sampling-Einstellung noch ein Modellwechsel als Lösung belegt.

Empfehlung aus der Codeanalyse: Zuerst einen knappen, eindeutig gegliederten Prompt mit belegten Beispielen prüfen. Danach bei gleichem Modell und gleichen Eingaben jeweils nur eine Variable ändern. Ein grösseres Modell behebt fehlende fachliche Regeln nicht verlässlich.

## 6. Vorschlag für die zentralen Prompt-Regeln

Der folgende Block ist ein **Entwurf**, kein bereits eingebauter Prompt. Er setzt die Satzanzahl-Arbeitsannahme und den vorgeschlagenen Umgang mit fehlenden Nachweisen voraus. Die bestehende Ausgabe mit allen fünf Feldern bleibt erhalten.

```text
Du formulierst Kompetenznachweise für HF-Studierende in fachlichem Deutsch.
Verwende ausschliesslich Tatsachen aus der Eingabe. Erfinde keine Tätigkeiten,
Prüfergebnisse, Abnahmen, Freigaben, Zahlen oder Wirkungen. Curriculum und
Umgebung dienen der Einordnung und belegen keine zusätzlichen Handlungen.

work_result:
- Schreibe einen zusammenhängenden Absatz mit 1–2 kurzen Sätzen in Ich-Form.
- Formuliere die ausgeführten Handlungen im Perfekt: „Ich habe …“.
- Nenne die angegebene Rolle/Funktion ausdrücklich.
- Verbinde Was (Handlung), Wie (wesentliche Methode) und Wozu (Zweck aus why).
- Ein Zweck kann mit „um … zu …“ formuliert werden; behaupte damit keinen Erfolg.
- Bleibe fachlich, praxisnah und prägnant; keine Listen, Floskeln oder Zusatzdetails.

quality_statement:
- Schreibe genau einen klaren Satz über das Ergebnis, keine allgemeine Bewertung.
- Leite das Prüfkriterium aus Wie und Wozu ab; verwende nur angegebene Ergebnisbelege.
- Nenne einen konkreten prüfbaren Zustand oder eine ausdrücklich angegebene Messung.
- Beschreibe keine Methoden und wiederhole nicht Handlung, Rolle oder Zweck.
- Behaupte Abnahme, Freigabe oder fehlende Beanstandungen nur bei explizitem Beleg.
- Fehlt ein Ergebnisbeleg, benenne ein aus der Eingabe ableitbares konkretes
  Zielkriterium und kennzeichne es im selben Satz als noch nicht nachgewiesen.
- Ist auch kein konkretes Zielkriterium ableitbar, kennzeichne diese Lücke ehrlich;
  erfinde kein Kriterium, nur um das gewünschte Format zu erfüllen.

quality:
- Bewerte die Qualität und Nachvollziehbarkeit der Eingabe von 1 bis 4.
- Verwechsle die Eingabequalität nicht mit der belegten Qualität des Ergebnisses.

note_improvment:
- Nenne konkret fehlende Angaben oder Nachweise; sonst null.

overlap_curriculum:
- Beurteile den Bezug der beschriebenen Tätigkeit zur angegebenen Kompetenz.

Prüfe vor der Ausgabe Rolle, Ich-Form, Perfekt der Handlungen, Handlung/Methode/Zweck,
Satzanzahl, Ergebnisbezug, Faktenbindung und vermeidbare Wiederholungen.
Gib ausschliesslich das strukturierte Objekt mit den bestehenden fünf Feldern aus.
```

Im Worktree fehlen konkrete Kriterien für `quality` 1–4. Der Eval-Prompt enthält bereits eine explizite Rubrik; deren Umsetzung scheitert in 33/69 Antworten an den vorläufigen Erwartungswerten. Für diesen Stand muss die Anwendung der vorhandenen Rubrik verbessert und fachlich geprüft werden, statt lediglich eine weitere Rubrik hinzuzufügen.

## 7. Illustrative Beispiele, keine beobachteten Eval-Ausgaben

**Belegter Erfolg:** Rolle: Applikationsentwickler. Was: Importfunktion umgesetzt. Wie: CSV-Mapping und automatisierte Tests; alle 12 definierten Importfälle bestanden. Wozu: Kundendaten vollständig übernehmen.

- Arbeitsergebnis: „Ich habe als Applikationsentwickler eine Importfunktion mit CSV-Mapping und automatisierten Tests umgesetzt, um Kundendaten vollständig zu übernehmen.“
- Quality Statement: „Alle 12 definierten Importfälle haben Kundendaten vollständig übernommen.“

Der Ergebnissatz enthält das Resultat, nicht die Methode „automatisierte Tests“; die Zahl stammt aus der Beispieleingabe.

**Belegte Freigabe:** Rolle: Projektleiter. Was: Einführungskonzept erstellt. Wie: Anforderungen abgestimmt; Geschäftsleitung hat das Konzept freigegeben. Wozu: Einführung des Ticketsystems vorbereiten.

- Arbeitsergebnis: „Ich habe als Projektleiter ein Einführungskonzept auf Basis abgestimmter Anforderungen erstellt, um die Einführung des Ticketsystems vorzubereiten.“
- Quality Statement: „Die Geschäftsleitung hat das Einführungskonzept freigegeben.“

**Fehlender Erfolgsnachweis:** Gleiche Importaufgabe, aber Wie nennt nur CSV-Mapping und Tests, keine Resultate.

- Arbeitsergebnis: wie im ersten Beispiel, sofern dieselbe Handlung und derselbe Zweck angegeben sind.
- Vorgeschlagenes Quality Statement: „Die vollständige Übernahme der Kundendaten ist als Zielkriterium noch nicht nachgewiesen.“
- Verbesserungshinweis: „Ergänze, ob die Kundendaten vollständig übernommen wurden und welches Prüfergebnis dies belegt.“

Der letzte Fall erfüllt bewusst keinen belegten Erfolgsnachweis: Er macht die Informationslücke konkret. Ob dieser Umgang fachlich akzeptiert wird oder zuerst nachgefragt werden muss, bleibt offen.

## 8. Empfohlene Evaluation und nächste Schritte

1. Den bereitgestellten Eval-Lauf als Ausgangsbasis verwenden. Sein Systemprompt stimmt in allen 69 gespeicherten Requests mit `system-prompt.txt` überein, unterscheidet sich aber vom aktuellen Worktree. Vor einer Umsetzung den zu bearbeitenden Prompt-Stand abgleichen.
2. Satzanzahl und Verhalten bei fehlendem Ergebnisnachweis fachlich klären. Die geänderte Bedeutung von `quality_statement` bei einer Umsetzung in ADR-011 dokumentieren.
3. Prompt-Regeln per TDD im Backend ergänzen; keine Änderung an Tabellen, Spalten oder den Wertebereichen. Unit-Tests sichern den Prompt-Vertrag mit gemocktem LLM, keine echten Modellaufrufe.
4. Eine separate, bewusst ausgeführte Evaluation am externen Modell mit identischen Fällen vor und nach der Änderung durchführen. Mindestens vollständige Eingaben, rein qualitative Belege, fehlende Nachweise, knappe Eingaben und widersprechendes Retry-Feedback abdecken.
5. Pro Fall bewerten: Rolle vorhanden, Ich-Form, Perfekt, Was/Wie/Wozu vollständig, kurzer Absatz, Quality Statement genau ein Satz, prüfbarer Ergebnisbezug, keine Methodenwiederholung und keine erfundenen Fakten. Generische Fallbacks und unbelegte Erfolgsaussagen gesondert zählen. Mehrfachläufe zeigen die Stabilität.
6. Prompt-/Modellversion, Chat-Template, Sampling-/Thinking-Einstellungen und Eval-Rubrik protokollieren. Erst danach Sampling oder Modell separat vergleichen.

Erfolg bedeutet weniger generische Aussagen **ohne** mehr erfundene Erfolgsbelege. Ein schönerer Text allein ist kein ausreichendes Qualitätskriterium.

## 9. Prüfung dieser Änderung

Bei der ersten Analyse wurden nur Dokumente geändert. Die damaligen sechs Checks konnten wegen fehlender Abhängigkeiten nicht starten. Die anschliessende Prompt-Implementierung und deren Prüfung sind in Abschnitt 11 beschrieben. Es wurde kein echter LLM-Aufruf ausgeführt.

## 10. Konkrete Auswertung des bereitgestellten Laufs

### 10.1 Versuchsaufbau und Aussagekraft

Run-ID: `2026-09-30T20-19-35-793Z-3b976f3f`. vLLM, `google/gemma-4-12B-it`, 23 development-Fälle mit je drei Wiederholungen. Der Datensatz enthält 33 Fälle; die zehn Holdout-Fälle wurden in diesem Lauf nicht ausgeführt. Temperature 0.1, `max_tokens` 800, Thinking deaktiviert, Parallelität 1, keine Retries oder Reparaturen. JSON-Schema wurde mit `response_format` übergeben. Die Antworten enthalten den Server-Fingerprint `vllm-0.29.1rc1.dev467+g0aee727ff.d20260921-62028060`; die manifestseitige Versionsangabe ist dennoch leer. BF16, genaue Gewichtsrevision und tatsächlich angewendetes Chat-Template sind nicht unabhängig bestätigt.

| Messwert | Ergebnis | Einordnung |
|---|---:|---|
| Schema gültig | 69/69 (100 %) | Struktur funktioniert |
| Automatische Kriterien bestanden | 26/69 (37,7 %) | Keine semantische Erfolgsquote |
| `quality` trifft vorläufiges Label | 36/69 (52,2 %) | 33 Fehlzuordnungen in elf Fällen |
| `overlap_curriculum` trifft Label | 69/69 (100 %) | Einschliesslich drei Versuchen ohne Kontext |
| Wortlimits erfüllt | 69/69 (100 %) | Belegt keine korrekte Satzanzahl oder Grammatik |
| Erforderlicher Hinweis vorhanden | 56/69 (81,2 %) | 13-mal fehlt ein laut Datensatz erforderlicher Hinweis |
| Exakter generischer Ergebnis-Fallback | 54/69 (78,3 %) | 18 Fälle, jeweils in allen drei Wiederholungen |
| Fallback trotz Ergebnisnachweis laut Dataset | 21/36 (58,3 %) | Sieben von zwölf Fällen mit Ergebnisnachweis |
| Eingegebene Rolle wörtlich im Arbeitsergebnis | 0/69 | Stringprüfung; in den gelesenen Texten auch keine explizite Funktionsnennung |
| Beginn mit „Ich habe“ | 69/69 | Ich-Form funktioniert; vollständiges Perfekt dadurch nicht bewiesen |
| Fachlich vollständig bewertet | 0/69 | Semantische Gesamtnote und kritische Fehlerquote bleiben offen |
| Transportfehler / unvollständige Antworten | 0/69 | Kein Hinweis auf Abbruch als Ursache |
| Laufzeit p50 / p95 | 3,87 s / 6,16 s | Kein Vergleichslauf vorhanden |

Die Einzelzählungen wurden aus `results.jsonl` und den Erwartungen in `dataset.json` nachgerechnet. Bei allen 23 Fällen bleibt `quality` über die drei Wiederholungen gleich. Die Fehlbewertungen sind damit in diesem Lauf reproduzierbar; die Formulierungen variieren teilweise trotzdem. Drei Wiederholungen ergeben weiterhin nur 23 unterschiedliche Aufgaben.

### 10.2 Der Fallback wird vorgeschrieben und zu breit angewendet

Der Eval-Prompt schreibt wörtlich vor: „Wenn kein konkretes Ergebnis oder keine überprüfbare Wirkung angegeben ist, schreibe: ‚Ein überprüfbares Ergebnis ist aus den Angaben nicht hervorgegangen.‘“ Auch die Dataset-Referenzen ohne Nachweis enthalten diesen Satz. Sein Auftreten ist in diesen Fällen erwartetes Prompt-Verhalten, kein eigenständiger Beleg für schlechte Modellleistung.

Von den 54 Fallback-Antworten gehören 33 zu elf Fällen ohne Ergebnisnachweis laut Datensatz. Die anderen 21 betreffen vorhandene qualitative Bestätigungen, negative Ergebnisse oder Resultate ausserhalb der gewählten Kompetenz. Hier verwirft das Modell relevante Angaben:

| Fall | Vorhandene Ergebnisangabe | Beobachtung in allen drei Wiederholungen |
|---|---|---|
| `informatik-05` | Raumbuchung bestätigt | Fallback, `quality` 3 statt 4; Bestätigung teilweise sogar im Arbeitsergebnis enthalten |
| `pflege-04` | Zwei notwendige Einträge fehlen, Nachbearbeitung offen | Negativen Befund durch Fallback ersetzt, `quality` 3 statt 4 |
| `pflege-05` | Budgetfreigabe durch Verwaltung | Fallback, fordert teilweise gerade die bereits vorhandene Freigabe nach |
| `sozial-04` | Vier von fünf laut Rückmeldung ohne Beteiligung an Auswahl | Fallback statt negativer Ergebnisinformation |
| `sozial-05` | Zwölf von zwölf Möbelstücken zugeordnet | Fallback trotz Zahl und überprüfbarem Zuordnungsresultat |
| `wirtschaft-04` | Doppelte Position, Entscheidung bis Korrektur vertagt | Befund und Folge entfallen im Ergebnisstatement |
| `wirtschaft-05` | Eine Farbvariante durch Organisationsteam ausgewählt | Auswahlresultat entfällt; fordert Abnahme oder Veröffentlichung nach |

Alle vier Fälle mit `overlap_curriculum = false` und vorhandenem Ergebnisnachweis erhalten den Fallback und `quality` 3 statt 4. **Hypothese:** Das Modell vermischt Kompetenzpassung mit Eingabequalität und Ergebnisnachweis. Das Muster ist deutlich, beweist aber keine interne Ursache. Der Prompt sollte ausdrücklich sagen: Ein fehlender Kompetenzbezug ändert weder einen vorhandenen Ergebnisnachweis noch die davon unabhängige Eingabequalität.

Negative Ergebnisse werden nicht durchgehend ignoriert: `informatik-04` erhält korrekt `quality` 4 und nennt die zwei fehlgeschlagenen Tests. Die übrigen drei negativen Fälle werden dagegen als ergebnislos behandelt. Beispiele sollten deshalb auch negative Resultate aus Pflege, Sozialpädagogik und Betriebswirtschaft abdecken.

### 10.3 Arbeitsergebnis: gute Grundstruktur, fehlende Rolle und konkrete Fehler

Ich-Form und kurze Ausgaben funktionieren grundsätzlich. Die Rolle fehlt durchgehend, weil der Eval-Prompt sie nur verlangt, wenn sie „zum Verständnis nötig“ ist. Das widerspricht der Nutzeranforderung. Eine klare Regel wäre: „Nenne die angegebene Rolle/Funktion im ersten Satz ausdrücklich.“

Konkrete sprachliche und fachliche Auffälligkeiten:

- `pflege-03`, alle drei Versuche: „… ergänzt und dabei sorgfältig vorgegangen …“. Das gemeinsame Hilfsverb „habe“ passt nicht zu „vorgegangen“; korrekt wäre „… und bin dabei … vorgegangen“. Zudem ist „sorgfältig“ keine konkrete Methode. Minimal belegte Formulierung: „Ich habe als Studierende Pflege die Pflegedokumentation ergänzt, um Informationen für die nächste Schicht bereitzustellen.“ Die fehlende Methode sollte gezielt nachgefragt werden.
- `wirtschaft-01`: „… in der Preise und Lieferkosten gegenübergestellt wurden …“. Der eingebettete Handlungssatz steht im Präteritum. Auch das Quality Statement „Die Berechnung wurde … freigegeben“ erfüllt die im Eval-Prompt verlangte Perfektform nicht. Möglich wäre „Die Leitung hat die Berechnung ohne Korrektur freigegeben.“
- `informatik-01`: „Die acht definierten Testfälle wurden mit einem Ergebnis von 8/8 bestanden.“ Die Formulierung ist redundant, im Präteritum und sprachlich unnatürlich. Prägnanter: „Alle acht definierten Testfälle sind bestanden worden.“
- `sozial-03`: Die Eingabe enthält „durchgeführt / nicht stattgefunden“. Trotzdem behaupten alle drei Outputs eine Durchführung. Das verletzt die ausdrückliche Regel, widersprüchliche Angaben nicht eigenmächtig aufzulösen. Es handelt sich um einen konkreten Befund zur Faktentreue, der im offiziellen Review noch nicht bewertet ist.
- `sozial-01::1`: Die Ausgabe macht aus einem Abschlussfeedback über Mitentscheidung eine Beteiligung „an der Mitentscheidung im Abschlussfeedback“. Das verschiebt die Bedeutung. Bei fragmentarischen Angaben muss die beobachtete Aussage erhalten bleiben, statt ein elegantes, aber anderes Ereignis zu formulieren.

Ein universelles Muster „Ich habe … verwendet“ ist für Verben mit „sein“ und verschiedene Fachdomänen zu eng. Wenige vollständige Beispiele mit unterschiedlichen Verben und Funktionen wären hilfreicher. Der Entwurf in Abschnitt 6 ist deshalb nur eine Grundlage und muss um die hier belegten Fehler ergänzt werden.

### 10.4 Die Eingabebewertung setzt die vorhandene Rubrik nicht zuverlässig um

Die elf Fälle mit falschem `quality` sind `informatik-05`, `pflege-01`, `pflege-03`, `pflege-04`, `pflege-05`, `sozial-03`, `sozial-04`, `sozial-05`, `wirtschaft-03`, `wirtschaft-04` und `wirtschaft-05`, jeweils in allen drei Versuchen.

Besonders deutlich: `pflege-01` nennt korrekt die Bestätigung durch das Folgeteam im Quality Statement, vergibt aber trotzdem 3 statt 4. Ergebnisextraktion und Rating sind also inkonsistent. `pflege-03` („sorgfältig“) und `wirtschaft-03` („Zahlen“) erhalten 3 trotz unklarer Methode. Der Widerspruch in `sozial-03` erhält 2 statt der in der Rubrik definierten 1.

Eine spätere Promptrevision sollte eine kurze Entscheidungsreihenfolge verlangen: zuerst Widerspruch/erkennbare Handlung, dann konkrete Methode und Zweck, dann vorhandener Ergebnisnachweis. Bewertet wird die ursprüngliche Eingabe; weder ein schön formulierter Text noch Curriculum-Passung soll die Stufe ersetzen.

### 10.5 Grenzen der automatischen Evaluation

`automaticPass` scheitert an Label-Abweichungen oder fehlenden Pflicht-Hinweisen; Satzanzahl, Rollenaufnahme, Perfekt, Ergebnisverlust und Widerspruchsauflösung sind darin nicht als zuverlässige semantische Prüfung abgebildet. Deshalb können fachlich schlechte Texte automatisch bestehen.

Auch das Dataset benötigt eine fachliche Konsistenzprüfung: `wozu-01` und `wozu-03` lassen `note_improvment = null` ohne Ergebnisnachweis ausdrücklich zu; andere Fälle mit ebenso fehlendem Nachweis verlangen einen Hinweis. Die niedrigere automatische Quote misst daher auch unterschiedliche Label-Konventionen. Der pauschale Begriff „nicht erfreulich“ sollte getrennt in Struktur, Label-Treffer, Faktenbindung und Stil betrachtet werden.

Die Review-Dateien enthalten noch keine ausgefüllten Bewertungen. Diese Analyse ergänzt belegte Beobachtungen, trägt aber keine erfundenen Reviews ein und setzt unbekannte kritische Fehler nicht auf null.

### 10.6 Prioritäten für eine Überarbeitung des tatsächlich evaluierten Prompts

1. Rolle ausdrücklich aufnehmen; Perfekt für alle ausgeführten Handlungen verlangen und durch grammatisch verschiedene Beispiele verdeutlichen.
2. Ergebnisinformationen aus den gesamten Sachangaben zuerst erfassen; Freigaben, Bestätigungen, Auswahlentscheidungen und negative Befunde gleichermassen als Nachweise behandeln. Methoden bleiben in `work_result`, Resultate in `quality_statement`.
3. Curriculum-Passung ausdrücklich von Ergebnisnachweis und `quality` entkoppeln.
4. Den generischen Fallback durch den fachlich noch zu klärenden Umgang mit fehlenden Nachweisen ersetzen. Konkrete Kriterien aus Wie/Wozu dürfen als offene Zielkriterien formuliert werden; ein erreichtes Ergebnis darf daraus weiterhin nicht erfunden werden. Fehlende Daten konkret in `note_improvment` nachfragen.
5. Widersprüche vor der Ausformulierung erkennen; keine Durchführung behaupten, solange „durchgeführt / nicht stattgefunden“ ungeklärt ist.
6. Vor der Ausgabe eine kurze Konsistenzprüfung verlangen: Passt `quality` zum erkannten Nachweis? Fordert der Hinweis etwas nach, das bereits angegeben ist? Enthält das Statement den vorhandenen negativen Befund?
7. Dataset-Hinweisregeln vereinheitlichen und menschliche Reviews ausfüllen. Danach denselben Lauf mit derselben Modellkonfiguration und einem einzelnen überarbeiteten Prompt wiederholen; zunächst keinen Modellwechsel mit der Promptänderung vermischen.

Der Lauf belegt sowohl einen unerwünschten ausdrücklich vorgeschriebenen Fallback als auch dessen fehlerhafte Anwendung bei vorhandenen Nachweisen. Mehr Ausgabe-Spielraum oder ein pauschales Verbot des Fallback-Satzes allein löst die Probleme daher nicht.

## 11. Umgesetzte Prompt-Überarbeitung

Auf Nutzerauftrag wurde `backend/src/llm/prompt.ts` überarbeitet. Der neue Systemprompt ersetzt die allgemeinen Worktree-Anweisungen durch den fachlichen Vertrag aus ADR-020: ausdrückliche Rolle, Ich-Form, Perfekt mit passenden Hilfsverben, Was/Wie/Wozu, 1–2 Sätze Arbeitsergebnis plus genau ein Ergebnissatz. Das Feld `why` wird im Eingabeprompt als Wozu bezeichnet. Beispiele zeigen qualitative Freigabe, negatives Ergebnis, fehlenden Nachweis und Widerspruch; Beispieldaten dürfen nicht als Fakten der aktuellen Eingabe verwendet werden.

Der Prompt priorisiert vorhandene Nachweise, trennt sie von Curriculum-Passung und Eingabequalität und fragt bei fehlendem Nachweis konkret nach. Ein offenes Kriterium wird als noch nicht nachgewiesen formuliert; Ergebnisse werden nicht erfunden. Die Schemafelder und das Client-Interface bleiben unverändert. Der separate Eval-Prompt im anderen Checkout sowie das historische Dataset wurden nicht überschrieben.

TDD: Sieben neue Tests sind zuerst am alten Prompt fehlgeschlagen, danach sind alle 14 Prompt-Tests grün. Die Tests sichern die Anweisungen und Eingabefeld-Übergabe; sie belegen keine sprachliche Modellleistung. Der vollständige Backend-Lauf besteht mit 81 Tests, Lint und Typecheck; das Frontend mit 48 Tests, Lint und Typecheck. Eine neue echte Gemma-Evaluation wurde nicht gestartet; die gespeicherten 69 Antworten stammen weiterhin vom alten Eval-Prompt.

Vor einem erneuten Vergleich muss der Eval-Runner den neuen Systemprompt verwenden; für semantische Reviews muss die Referenz zum fehlenden Nachweis versioniert vom generischen Fallback auf ein konkretes offenes Kriterium umgestellt werden. Die alten automatischen Label-Treffer und die neue Formulierungsqualität sind getrennt zu vergleichen.

Übertragung: Die Änderungen wurden in den bereits vorhandenen Checkout von `refactor/System-Prompt` integriert. Bestehende ADRs und Tests bleiben erhalten; die neue Entscheidung wurde dort als ADR-020 eingeordnet. Die historischen Worktree-Befunde beschreiben den ursprünglichen Ausgangsstand.

Prüfung nach der Übertragung: Im Ziel-Checkout bestehen 145 Backend-Tests (davon 21 Prompt-Tests) und 76 Frontend-Tests sowie Lint und Typecheck für beide Tiers. Es wurde kein echter LLM-Aufruf ausgeführt und kein Commit erstellt.
