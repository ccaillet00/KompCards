# KompCards — Frontend-Design

**Stand:** 2026-09-21

**Status:** Verbindliche Design- und Umsetzungsgrundlage für den MVP

## 1. Ziel und Geltungsbereich

KompCards erhält eine ruhige, wertige Desktop-Oberfläche für HF-Studierende. Das Design soll die strukturierte Arbeit an Kompetenzkarten erleichtern und die «Fuchswelt» als unterstützende visuelle Erzählung einsetzen.

Diese Datei beschreibt den aktuell implementierten Designstand. Sie ist bei allen Änderungen an Seiten, Layouts, Komponenten, Styling, Texten oder Bildassets zusammen mit den Referenzbildern unter [`references/`](./references/) zu beachten.

Die Anwendung wird mit Nuxt, Vue, TypeScript, Tailwind CSS und daisyUI umgesetzt. Die Regeln aus den übrigen Projektdokumenten, insbesondere das fixe Datenmodell und die vorhandenen API-Verträge, bleiben vorrangig.

## 2. Quellen und Verbindlichkeit

- `docs/design/references/` enthält visuelle Mockups. Sie zeigen Komposition, Hierarchie, Stimmung und gewünschte Abläufe.
- `frontend/public/images/fox-world/` enthält die produktiven Illustrationen.
- `frontend/public/brand/kompcards-logo.svg` ist das produktive Logo.
- `frontend/tailwind.config.cjs` enthält die Design-Tokens.
- `frontend/assets/css/main.css` enthält globale Komponentenklassen sowie die Masken und Verläufe für die Bildintegration.
- Wiederverwendbare UI-Bausteine liegen unter `frontend/components/`.

Die Mockups sind eine visuelle Referenz, keine Laufzeit-Assets und keine fachliche Quelle. Sie dürfen niemals direkt als Seitenhintergrund oder Benutzeroberfläche eingebunden werden. Bedienbare Oberflächen werden immer semantisch mit Vue/HTML, Tailwind CSS und daisyUI aufgebaut.

Wenn Mockup, API oder Datenmodell voneinander abweichen, gelten API und Datenmodell. Insbesondere besitzt `quality` exakt vier Stufen (1–4), nicht fünf.

## 3. Gestaltungsprinzipien

Die visuelle Sprache ist freundlich, konzentriert und erwachsen:

- warmes Off-White statt reinem Weiss;
- dunkles Blau als tragende Marken- und Interaktionsfarbe;
- warme Goldtöne nur als Akzent;
- Serifenschrift für grosse Überschriften und Markenmomente;
- Sans-Serif für Fliesstext, Navigation, Formulare und Bedienung;
- grosszügiger Weissraum und klare inhaltliche Hierarchie;
- feine Borders, weiche Schatten und moderat gerundete Flächen;
- reduzierte Lucide-Line-Icons;
- Illustrationen als atmosphärische Begleitung, niemals als Konkurrenz zum Inhalt;
- kurze und dezente Übergänge ohne spielerische Effekthascherei.

Die Benutzerführung und Lesbarkeit haben Vorrang vor einer pixelgenauen Kopie der Mockups.

## 4. Designsystem

### Farben

Das daisyUI-Theme `kompcards` ist die zentrale Farbquelle:

| Rolle | Token | Wert |
|---|---|---|
| Primärfarbe | `primary` | `#0d4775` |
| Sekundärfläche | `secondary` | `#e8f0f5` |
| Akzent | `accent` | `#d89437` |
| Dunkle Neutralfarbe | `neutral` | `#173a58` |
| Seitenhintergrund | `base-100` | `#fdfbf6` |
| Abgesetzte Fläche | `base-200` | `#f5f3ed` |
| Border/Disabled | `base-300` | `#e3e6e6` |
| Fliesstext | `base-content` | `#163650` |
| Erfolg | `success` | `#3b8c62` |
| Warnung | `warning` | `#d58b2c` |
| Fehler | `error` | `#b74343` |

Farben in Komponenten bevorzugt über diese semantischen Tokens verwenden. Neue Hex-Werte nur ergänzen, wenn kein vorhandener Token die gewünschte Rolle erfüllt.

### Typografie

- Display: `font-display` = Georgia, Cambria, Times New Roman, Serif-Fallback.
- UI/Text: `font-sans` = Inter mit System-Fallbacks.
- Hero-Titel: `.display-title`.
- Abschnittstitel: `.section-title`.
- Kleine Kontextzeile: `.eyebrow`.
- Überschriften `h1` bis `h3` sind standardmässig Display-Schrift und primärblau.

Es ist derzeit kein externer Webfont eingebunden. Diese Entscheidung nicht nebenbei durch einen CDN-Font verändern.

### Raster, Flächen und Form

- `.page-shell`: gemeinsame Inhaltsbreite, maximal `88rem`, mit responsiven horizontalen Innenabständen.
- `UiSurfaceCard`: Standardfläche mit feinem Primary-Border, `rounded-box` und `shadow-soft`.
- Box-Radius: `0.75rem`; Button-Radius: `0.5rem`.
- Formfelder sind 3rem hoch, Textareas mindestens 7rem, mit dezentem Border und sichtbarem Primary-Fokus.
- Primäre Aktionen verwenden `UiButton` in `primary`; alternative Aktionen `secondary` oder `ghost`; destruktive Aktionen `danger`.

Vor einer neuen lokalen Variante ist zu prüfen, ob ein bestehender Baustein unter `frontend/components/ui/` erweitert werden kann.

### Icons und Logo

- Icons werden ausschliesslich über `UiIcon` und die zentrale Auswahl in `frontend/utils/lucideIcons.ts` verwendet.
- Dekorative Icons erhalten keinen gesprochenen Namen; informative Icons benötigen ein Label oder sichtbaren Begleittext.
- Das Logo wird über `BrandLogo` eingebunden, nicht pro Seite neu zusammengesetzt.

## 5. Fuchswelt und Bildkomposition

Die Illustrationen sind dekorative, seitenfüllende Hintergrundelemente. Text und Bedienung bleiben echte UI und liegen immer über einer ausreichend deckenden, warmen Verlaufsfläche.

| Kontext | Produktives Asset |
|---|---|
| Landing Page und CTA | `/images/fox-world/landing-hero.webp` |
| Login und Registrierung | `/images/fox-world/login/registration.webp` |
| Dashboard, Meine Karten, Profil | `/images/fox-world/dashboard.webp` |
| Kompetenz wählen | `/images/fox-world/competency-select.webp` |
| Arbeit dokumentieren und Auswertung | `/images/fox-world/work-documentation.webp` |

Verbindliche Kompositionsregeln:

1. Bilder rechts ausrichten und ihre Proportionen erhalten. Auf App-Seiten wird `object-contain` eingesetzt, damit die Szene nicht hart angeschnitten oder vergrössert wird.
2. Der Übergang zwischen Inhaltsfläche und Illustration wird über die vorhandenen Masken und Blend-Klassen in `main.css` erzeugt: `.hero-artwork-image`, `.auth-artwork-image`, `.fox-world-page-image` sowie die jeweiligen `*-blend`-Klassen.
3. Keine sichtbare vertikale Bildkante und kein abruptes Rechteck hinter dem Inhalt erzeugen. Anpassungen an Maske und Overlay immer gemeinsam prüfen.
4. Dekorative Bildcontainer verwenden `aria-hidden="true"`; die enthaltenen Bilder besitzen ein leeres `alt`-Attribut.
5. Hauptinhalt liegt in einer eigenen Stacking-Ebene über Bild und Blend. Er muss bei jeder unterstützten Breite vollständig lesbar und bedienbar bleiben.
6. Auf schmaleren Viewports darf die Illustration ausgeblendet oder reduziert werden. Sie darf niemals Formulare, Navigation oder Aktionen verdecken.
7. Keine Mockup-Datei aus `docs/design/references/` in den Runtime-Code importieren.

## 6. Seiten und Navigation

| Route | Layout | Aufgabe | Bildwelt |
|---|---|---|---|
| `/` | `public` | Produkt erklären, Einstieg anbieten | Landing Hero |
| `/login` | `auth` | Bestehenden Nutzer anmelden | Login/Registration |
| `/register` | `auth` | Nutzer registrieren | Login/Registration |
| `/dashboard` | `default` | Persönlichen Fortschritt und letzte Karte zeigen | Dashboard |
| `/cards` | `default` | Kartenliste und Statusfilter | Dashboard |
| `/cards/new` | `default` | Lehrgang → Bereich → Kompetenz wählen | Competency Select |
| `/cards/:id` | `default` | Arbeit strukturiert dokumentieren | Work Documentation |
| `/cards/:id/result` | `default` | LLM-Ergebnis prüfen und bearbeiten | Work Documentation |
| `/profile` | `default` | Profildaten darstellen und Abmeldung anbieten | Dashboard |

Öffentliche Navigation: Landing Page → Login oder Registrierung.

Authentifizierte Hauptnavigation: Dashboard, Meine Karten, Profil.

Fachlicher Workflow: Kompetenz wählen → Arbeit dokumentieren → LLM-Prüfung → Auswertung.

Die drei Workflow-Schritte werden mit `WorkflowSteps` dargestellt. Technische Backend-Bezeichnungen werden nicht ungefiltert in der Oberfläche angezeigt.

## 7. Fachliche Darstellung

### Kompetenzkarte erstellen

Die Auswahl erfolgt hierarchisch: Lehrgang → Bereich → Kompetenz. Ein Auswahlfeld wird erst aktiviert, wenn die vorherige Stufe gewählt ist. Nach der Auswahl werden die Kompetenzinformationen angezeigt; erst danach beginnt die Dokumentation.

### Arbeit dokumentieren

Die Oberfläche erfasst die vorhandenen Backend-Felder, darunter Rolle, Was, Wie, Wozu (Zweck/Nutzen), Umfeld und die fachlich definierte Betreff-/Vorgabenangabe. Die drei W bedeuten: Was = ausgeführte Handlung, Wie = Vorgehen/Methode, Wozu = angestrebter Zweck/Nutzen. Die Wozu-Frage lautet «Wozu hast du die Arbeit ausgeführt?». Das API-Feld bleibt `why`. Der frühere Warum-Text im Referenzmockup ist fachlich überholt.

Eine Karte kann als Entwurf gespeichert oder zur LLM-Prüfung übermittelt werden.

### LLM-Auswertung

Die Auswertung zeigt nur tatsächlich vom Backend gelieferte Informationen:

- fachlich formuliertes Arbeitsergebnis;
- Qualitätsbewertung 1–4 und qualitative Begründung (`quality_statement`);
- Abdeckung des Lehrplans;
- Verbesserungshinweise;
- Revisionsmöglichkeit mit Nutzerfeedback.

`QualityRating` stellt vier Stufen dar: 1 Schwach, 2 Verbesserungsbedürftig, 3 Gut, 4 Sehr gut. Der Nutzer kann das Ergebnis im Rahmen der vorhandenen API speichern, überarbeiten oder verwerfen.

Wenn mehrere Revisionen zur aktuellen Eingabe vorhanden sind, zeigt der Kopf der Auswertung eine kompakte Vor-/Zurück-Navigation mit Positionsanzeige. Das Blättern ist nur eine lokale Vorschau. Eine Auswertung wird erst durch die ausdrückliche Auswahlaktion gespeichert; die gespeicherte Auswertung trägt zusätzlich eine textliche Kennzeichnung und wird beim erneuten Öffnen zuerst angezeigt.

### Meine Karten und Status

Alle vom Backend gelieferten Karten werden kompakt als Liste angezeigt und können über Statusfilter eingegrenzt werden. Es gelten folgende nutzerfreundliche Bezeichnungen:

| Wert | UI-Bezeichnung |
|---|---|
| 1 | Entwurf |
| 2 | In Prüfung |
| 3 | Prüfung fehlgeschlagen |
| 4 | Prüfung abgeschlossen |
| 5 | Abgeschlossen |
| 6 | Verworfen |

Das zentrale Mapping liegt in `frontend/utils/proofStatus.ts` und darf nicht parallel in Seiten dupliziert werden.

### Dashboard

Das Dashboard zeigt erstellte und abgeschlossene Karten, den Fortschritt zum fachlichen Ziel von 45 Karten, die zuletzt bearbeitete Karte und den Einstieg in eine neue Karte. Es werden keine zusätzlichen Kennzahlen oder Backend-Funktionen erfunden.

### Authentifizierung und Profil

Registrierung und Login verwenden ausschliesslich die vorhandenen Auth-Verträge. GitHub wird bei konfiguriertem Backend in Login und Registrierung angeboten. Neue GitHub-Konten benötigen kein Passwort; bestehende Konten werden nicht verknüpft. Noch nicht implementierte Funktionen wie Passwort-Reset oder Profilbearbeitung dürfen visuell angedeutet, aber weder simuliert noch als funktionierende Aktion angeboten werden. Sie werden deaktiviert, klar gekennzeichnet oder ausgeblendet.

## 8. Responsive Verhalten

Der authentifizierte MVP ist desktop-first. Die Landing Page soll auch auf schmaleren Viewports verständlich und bedienbar bleiben.

- Der zentrale Desktop-Breakpoint für die Fuchswelt liegt aktuell bei `lg` (`1024px`); einzelne dichte Resultatansichten blenden Bilder erst bei `xl` ein.
- Auf kleineren Breiten erhalten Bilder weniger Gewicht oder werden verborgen; der Inhalt nutzt die gesamte verfügbare Breite.
- Navigation, Formulare und Hauptaktionen dürfen nicht horizontal abgeschnitten werden.
- Neue Mobile-Navigationsmuster sind eine eigene Designentscheidung und werden nicht beiläufig ergänzt.

## 9. Barrierefreiheit und Bewegung

- Jede Seite besitzt genau eine sinnvolle `h1`; die weitere Überschriftenhierarchie bleibt logisch.
- Formulare verwenden sichtbare Labels, zugeordnete IDs und verständliche Fehlertexte.
- Interaktive Elemente sind per Tastatur erreichbar und zeigen den globalen `:focus-visible`-Ring.
- Farbe allein darf keinen Status oder Fehler vermitteln; Text oder Icon ergänzt die Bedeutung.
- Dekorative Bilder bleiben für Assistenztechnologien unsichtbar.
- Übergänge sind kurz. `prefers-reduced-motion: reduce` deaktiviert Bewegung in `main.css` und `transitions.css`.
- Lade-, Fehler-, Leer- und Disabled-Zustände bleiben als echte Zustände sichtbar; sie werden nicht durch rein dekorative Platzhalter ersetzt.

## 10. Regeln für spätere Änderungen

1. Vor Frontend-Arbeit diese Datei, das passende Mockup, die betroffene Seite und bestehende UI-Komponenten lesen.
2. Vor neuen UI-Daten die vorhandenen API-Endpunkte, Typen und Composables prüfen. Keine Endpunkte oder Rückgabefelder für ein Mockup erfinden.
3. Striktes TDD gilt auch für UI-Verhalten: zuerst ein fehlschlagender Vitest-Test, danach die minimale Implementierung und anschliessend Refactoring.
4. Vorhandene `data-test`-Selektoren sind Testverträge. Sie nicht ohne Anpassung der Tests entfernen oder umbenennen.
5. Wiederkehrende Muster als Komponente oder zentrale Utility lösen; keine unterschiedlichen Status-, Qualitäts- oder Farb-Mappings pro Seite anlegen.
6. Änderungen an Design-Tokens zentral in `tailwind.config.cjs` vornehmen. Bildmasken und globale Gestaltungsmuster gehören in `main.css`, nicht als mehrfach kopierte Inline-Styles in Seiten.
7. Neue Runtime-Bilder gehören nach `frontend/public/`; Referenzmaterial bleibt unter `docs/design/references/`.
8. Nach visuellen Änderungen mindestens Landing Page, Auth-Layout und eine betroffene App-Seite auf einem Desktop-Viewport prüfen. Dabei besonders Lesbarkeit, Bildbeschnitt, Verlaufskanten, Fokuszustände und Überlagerungen kontrollieren.
9. Abschliessend im Frontend `lint`, `test`, `typecheck` und `build` ausführen; die projektweite Definition of Done bleibt zusätzlich bestehen.

## 11. Bewusst nicht enthalten

- kein Dark Mode;
- keine vollständig mobile App-Navigation;
- keine erfundenen Backend-Funktionen;
- keine direkte Verwendung kompletter Mockups als UI;
- keine externe Schrift- oder Asset-Abhängigkeit ohne bewusste Projektentscheidung.
