# Fachliche Prüfung: Informatik-Eval v1.0

Status: offen. Diese Vorlage bewertet die Erwartungen, nicht Modellantworten.
Kompetenztexte stammen aus Nutzer-CSV-Dateien; Situationen und Erwartungen sind synthetisch.
Vor einem verbindlichen Vergleich Qualität, Kompetenzbezug, Ergebnisnachweis und erforderliche Hinweise prüfen.
Holdout-Inhalte nicht zur Prompt-Optimierung nutzen. Falls sie dafür verwendet werden, neue zurückgehaltene Fälle ergänzen.

| Fall | Split | Kompetenz | Quality | Bezug | Erwarteter Ergebniskern | Review / Begründung |
|---|---|---|---:|---|---|---|
| inf-a1-2-01 | development | A1.2 | 4 | true | Die Bereichsleitung hat den Optimierungsvorschlag zur Umsetzung freigegeben. | offen |
| inf-a1-2-02 | development | A1.2 | 2 | true | Die Verringerung der Wartezeiten ist noch nicht nachgewiesen. | offen |
| inf-a2-4-01 | development | A2.4 | 4 | true | Die Fachabteilung hat alle drei Verständnisfragen als geklärt bestätigt. | offen |
| inf-a2-4-02 | development | A2.4 | 3 | true | Das Verständnis der Release-Änderungen durch die Fachabteilung ist noch nicht nachgewiesen. | offen |
| inf-a3-2-01 | development | A3.2 | 4 | true | Die praktische Abschlussprüfung ist bestanden worden. | offen |
| inf-a3-2-02 | development | A3.2 | 2 | true | Der arbeitsbezogene Zweck und das Lernergebnis der Weiterbildung sind noch offen. | offen |
| inf-b4-4-01 | development | B4.4 | 4 | true | Das Architekturboard hat die Entscheidungsbegründung bestätigt. | offen |
| inf-b4-4-02 | development | B4.4 | 1 | true | Ein konkreter Entscheidungsgegenstand und ein Entscheidungsnachweis fehlen. | offen |
| inf-b5-4-01 | development | B5.4 | 4 | true | Der Lenkungsausschuss hat den aktualisierten Plan freigegeben. | offen |
| inf-b5-4-02 | development | B5.4 | 1 | true | Die Durchführung der Risikoanalyse und ihr Ergebnis sind ungeklärt. | offen |
| inf-b6-2-01 | development | B6.2 | 4 | true | Eine Wochenendschicht ist unbesetzt geblieben und der Plan ist zur Nachbearbeitung zurückgegeben worden. | offen |
| inf-b6-2-02 | development | B6.2 | 4 | false | Der Gastgeber hat eine Farbvariante ausgewählt. | offen |
| inf-b7-3-01 | development | B7.3 | 4 | true | Der Product Owner hat die zwölf spezifizierten Anforderungen bestätigt. | offen |
| inf-b7-3-02 | development | B7.3 | 2 | true | Die eindeutige Umsetzbarkeit der Anforderungen ist noch nicht nachgewiesen. | offen |
| inf-b8-3-01 | development | B8.3 | 4 | true | Der Qualitätsverantwortliche hat die Messdefinitionen abgenommen. | offen |
| inf-b8-3-02 | development | B8.3 | 3 | true | Die Eignung der Messdefinitionen zur Beurteilung der Release-Qualität ist noch nicht nachgewiesen. | offen |
| inf-b9-2-01 | development | B9.2 | 4 | true | Der Datenschutzverantwortliche hat die Klassifikation bestätigt. | offen |
| inf-b9-2-02 | development | B9.2 | 3 | true | Die Einstufung des Schutzbedarfs der Personaldaten ist noch nicht bestätigt. | offen |
| inf-b10-1-01 | development | B10.1 | 4 | true | Das Betriebsteam hat die Architekturentscheidungen bestätigt. | offen |
| inf-b10-1-02 | development | B10.1 | 4 | false | Die Finanzabteilung hat die Abrechnung ohne Korrektur angenommen. | offen |
| inf-b11-7-01 | development | B11.7 | 4 | true | Zwei Fremdschlüsselprüfungen sind fehlgeschlagen und die Freigabe ist ausstehend geblieben. | offen |
| inf-b11-7-02 | development | B11.7 | 3 | true | Die konsistente Speicherung der Auftragsdaten ist noch nicht nachgewiesen. | offen |
| inf-b12-2-01 | development | B12.2 | 4 | true | Der Netzwerkverantwortliche hat den Soll-Entwurf genehmigt. | offen |
| inf-b12-2-02 | development | B12.2 | 4 | false | Der Netzwerkverantwortliche hat den Soll-Entwurf genehmigt. | offen |
| inf-b13-1-01 | development | B13.1 | 4 | true | Eine von sieben geprüften Dateien ist nach der Wiederherstellung nicht lesbar gewesen. | offen |
| inf-b13-1-02 | development | B13.1 | 3 | true | Die Wiederherstellbarkeit der Dokumentenablage ist noch nicht nachgewiesen. | offen |
| inf-b14-2-01 | development | B14.2 | 4 | true | Das Betriebsteam hat die Eskalation mit dokumentierter Fehlerzuordnung übernommen. | offen |
| inf-b14-2-02 | development | B14.2 | 3 | true | Die Übernahme der zugeordneten Störung durch die zuständige Stelle ist noch nicht nachgewiesen. | offen |
| inf-b15-2-01 | development | B15.2 | 4 | true | Der gemessene Nachtverbrauch ist von 18 auf 11 kWh pro Woche gesunken. | offen |
| inf-b15-2-02 | development | B15.2 | 3 | true | Eine Verringerung des Energieverbrauchs der Testsysteme ist noch nicht nachgewiesen. | offen |
| inf-a1-7-01 | holdout | A1.7 | 4 | true | Das Team hat zwei neue Review-Regeln angenommen. | offen |
| inf-a1-7-02 | holdout | A1.7 | 3 | true | Eine Verbesserung der Zusammenarbeit bei Code-Reviews ist noch nicht nachgewiesen. | offen |
| inf-a2-8-01 | holdout | A2.8 | 4 | true | Der Lieferant hat die Störungsbeschreibung als verständlich bestätigt. | offen |
| inf-a2-8-02 | holdout | A2.8 | 2 | true | Die Verständlichkeit der englischen Störungsbeschreibung ist noch nicht bestätigt. | offen |
| inf-a3-5-01 | holdout | A3.5 | 4 | true | Eine Kollegin hat in zwei Folgebesprechungen ruhigere Reaktionen beobachtet. | offen |
| inf-a3-5-02 | holdout | A3.5 | 1 | true | Die Durchführung der Reflexion und eine Verhaltensänderung sind ungeklärt. | offen |
| inf-b12-4-01 | holdout | B12.4 | 4 | true | Betrieb und Entwicklung haben die Anforderungsliste bestätigt. | offen |
| inf-b12-4-02 | holdout | B12.4 | 3 | true | Die Eignung der Anforderungen zur Verwaltung der Systemkonfigurationen ist noch nicht bestätigt. | offen |
| inf-b15-3-01 | holdout | B15.3 | 4 | true | Es sind 20 statt 28 Adapter neu bestellt worden. | offen |
| inf-b15-3-02 | holdout | B15.3 | 4 | true | Es sind nach der Bedarfskorrektur 30 statt geplanter 28 Adapter neu bestellt worden. | offen |
