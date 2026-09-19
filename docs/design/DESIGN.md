# KompCards Frontend Design

## Ziel

Das bestehende KompCards MVP erhält eine Desktop-Benutzeroberfläche.

Die Anwendung wird mit Nuxt, TypeScript, TailwindCSS und daisyUI umgesetzt.

Die Mockups unter `docs/design/references/` dienen als visuelle
Referenz für die Implementierung.

Die Illustrationen unter `public/images/fox-world/` sind die echten
Bildassets, welche in der Anwendung verwendet werden sollen.

Das KompCards-Logo befindet sich unter `public/brand/kompcards-logo.svg`.

---

## Grundprinzip

Die Benutzeroberfläche wird vollständig mit Vue/HTML, TailwindCSS
und daisyUI umgesetzt.

Mockup-Bilder dürfen NICHT direkt als Benutzeroberfläche eingebunden
werden.

Die Mockups dienen ausschliesslich als visuelle Referenz.

Illustrationen der Fuchswelt werden als separate Bildassets eingebunden.

---

## Zielplattform

Die KompCards-Applikation ist für den MVP eine Desktop-Anwendung.

Die eigentliche Anwendung muss nicht für Mobile optimiert werden.

Die Landing Page darf responsive umgesetzt werden.

---

## Design

Die Benutzeroberfläche soll sich möglichst eng an den bereitgestellten
Mockups orientieren.

Charakteristisch sind:

- warmes Off-White als Hintergrund
- dunkles Blau als Primärfarbe
- Serifenschrift für grosse Überschriften
- Sans-Serif für Formulare und UI-Elemente
- grosszügige Abstände
- dezente Borders und Schatten
- leicht gerundete Cards und Formulare
- reduzierte Line-Icons
- Integration der Fuchswelt in den Hintergrund
- weiche Übergänge zwischen UI und Illustration

Die Fuchswelt soll visuell unterstützen und darf die Bedienbarkeit
nicht beeinträchtigen.

---

## Navigation

Öffentlicher Bereich:

Landing Page
→ Login
→ Registrierung

Authentifizierter Bereich:

Dashboard
→ Kompetenzkarte erstellen
→ Arbeit dokumentieren
→ LLM-Prüfung
→ Auswertung

Zusätzlich:

Meine Karten

Profil kann bereits dargestellt werden, muss aktuell aber noch keine
vollständige Funktionalität besitzen.

---

## Kompetenzkarte erstellen

Die Auswahl erfolgt hierarchisch:

Lehrgang
→ Bereich
→ Kompetenz

Die Auswahlfelder werden nacheinander freigeschaltet.

Nach Auswahl einer Kompetenz werden Informationen zur Kompetenz
angezeigt.

Anschliessend kann der Benutzer mit der Dokumentation beginnen.

---

## Arbeit dokumentieren

Folgende Felder werden erfasst:

- Rolle
- Was wurde gemacht?
- Wie wurde vorgegangen?
- Warum wurde so gehandelt?
- Umfeld

Die Arbeit kann als Entwurf gespeichert werden.

Alternativ kann sie zur Prüfung an das LLM übermittelt werden.

---

## LLM-Auswertung

Die Auswertung enthält:

- fachlich formuliertes Arbeitsergebnis
- Qualitätsbewertung von 1 bis 5
- qualitative Erklärung der Qualitätsbewertung
- Abdeckung des Lehrplans
- Verbesserungshinweise
- Vorschlag für eine überarbeitete Formulierung

Die Qualitätsbewertung bewertet die Qualität der beschriebenen
Tätigkeit bzw. des Arbeitsergebnisses und wird zusätzlich textlich
begründet.

Der Benutzer kann das Ergebnis speichern, überarbeiten oder verwerfen.

---

## Meine Karten

Es werden alle nicht gelöschten Kompetenzkarten angezeigt.

Die Darstellung erfolgt als kompakte Liste.

Pro Kompetenzkarte werden mindestens angezeigt:

- Bereich
- Kompetenz
- Status

Oberhalb der Liste befinden sich Statusfilter.

Benutzerfreundliche Statusbezeichnungen:

1 → Entwurf
2 → In Prüfung
3 → Prüfung fehlgeschlagen
4 → Prüfung abgeschlossen
5 → Abgeschlossen
6 → Verworfen

Die technischen Backend-Statusbezeichnungen sollen nicht direkt
angezeigt werden.

---

## Dashboard

Das Dashboard zeigt den persönlichen Fortschritt.

Für den Lehrgang müssen mindestens 45 Kompetenzkarten erstellt werden.

Angezeigt werden:

- Anzahl erstellter Kompetenzkarten
- Anzahl abgeschlossener/bestätigter Kompetenzkarten
- Fortschritt gegenüber dem Ziel von 45 Karten
- zuletzt bearbeitete Kompetenzkarte
- Möglichkeit zum Erstellen einer neuen Kompetenzkarte

Es sollen keine zusätzlichen Backend-Funktionen erfunden werden.

---

## Authentifizierung

Registrierung:

- name
- email
- password

Login erfolgt mit den vom bestehenden Backend vorgesehenen Daten.

Profil, Passwort-Reset und GitHub-Login können im Design bereits
vorbereitet sein, auch wenn die Backend-Funktionalität noch nicht
vollständig vorhanden ist.

Nicht implementierte Funktionen dürfen nicht simuliert werden.
Sie können deaktiviert oder ausgeblendet werden.

---

## Backend

Die bestehende Backend-Implementierung und Datenbank dürfen durch die
Frontend-Implementierung nicht unnötig verändert werden.

Bestehende API-Endpunkte sollen wiederverwendet werden.

Vor Änderungen muss zuerst untersucht werden:

- welche API-Endpunkte vorhanden sind
- wie Authentifizierung funktioniert
- welche Datentypen zurückgegeben werden
- wie die Statuswerte verwendet werden
- welche Nuxt-Struktur bereits vorhanden ist
- welche Tailwind/daisyUI-Konfiguration bereits vorhanden ist

Keine neuen Backend-Endpunkte erfinden, nur um das Mockup nachzubauen.