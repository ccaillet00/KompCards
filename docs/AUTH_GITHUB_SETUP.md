# GitHub OAuth aktivieren

GitHub erstellt ausschliesslich neue KompCards-Konten ohne Passwort. Bereits über GitHub registrierte Nutzer melden sich damit erneut an. Bestehende E-Mail-/Passwortkonten lassen sich nicht verknüpfen; bei gleicher E-Mail wird die GitHub-Registrierung abgelehnt. Siehe ADR-018.

## 1. OAuth Apps bei GitHub erstellen

Unter GitHub → Settings → Developer settings → OAuth Apps jeweils eine App für lokale Entwicklung und Produktion anlegen:

| Umgebung | Homepage URL | Authorization callback URL |
|---|---|---|
| Lokal | `http://localhost:3000` | `http://localhost:3000/api/auth/callback/github` |
| Produktion | `https://service.kompcards.ccdevlab.ch` | `https://service.kompcards.ccdevlab.ch/api/auth/callback/github` |

Der Callback läuft über den Frontend-Origin (lokaler Nuxt-Proxy bzw. Traefik) zum Backend, nicht direkt über Port 4000. Der Public-Host ist kein OAuth-Callback. Die Homepage für die lokale OAuth App bei Bedarf auf die tatsächliche lokale URL anpassen; `BETTER_AUTH_URL`, Browser-Origin und Callback müssen zusammenpassen.

Der Better-Auth-GitHub-Provider fordert `read:user` und `user:email` an, keine Repository-Rechte. Private verifizierte E-Mail-Adressen werden über GitHubs E-Mail-Endpunkt gelesen. Ohne verifizierte E-Mail wird kein Konto erzeugt.

## 2. Backend konfigurieren

```dotenv
GITHUB_CLIENT_ID=deine-client-id
GITHUB_CLIENT_SECRET=dein-client-secret
BETTER_AUTH_URL=http://localhost:3000
```

Lokal in `backend/.env`; für Docker Compose in der Compose-Umgebung bzw. der nicht versionierten Root-`.env`. In Produktion `BETTER_AUTH_URL=https://service.kompcards.ccdevlab.ch` setzen. Keine Secrets in Nuxt/Public-Variablen oder ins Repository übernehmen. Vorhandenes `BETTER_AUTH_SECRET` stabil behalten: Es schützt Sessions und verschlüsselte OAuth-Tokens.

Beide GitHub-Werte leer bedeutet deaktiviert. Nur ein gesetzter Wert ist ein Konfigurationsfehler und verhindert den Backend-Start. Nach Änderung das Backend neu starten bzw. den Container neu erstellen. Es ist keine weitere DB-Migration erforderlich.

`GET /api/auth-config` liefert `{ "github": true }`, wenn der Provider konfiguriert ist. Das Frontend lädt diese Information beim Öffnen des Auth-Formulars; bei fehlender Konfiguration oder einem Ladefehler bleibt der GitHub-Button verborgen. Eine positive Antwort bestätigt die Konfiguration, nicht die Gültigkeit der GitHub-Zugangsdaten.

## 3. Abnahme mit echter OAuth App

1. `/login?mode=register` öffnen, vorhandene Zustimmung bestätigen, „Mit GitHub registrieren“ wählen. Kein Passwort erforderlich. Nach Freigabe erscheint das Dashboard.
2. Prüfen: genau ein neuer Nutzer, Rolle `user`, ein GitHub-Account ohne Passwort und eine 12-Stunden-DB-Session. Eine Kompetenzkarte erstellen.
3. Abmelden, mit „Mit GitHub anmelden“ zurückkehren: gleiche UUID und dieselbe Kompetenzkarte.
4. Noch unbekanntes GitHub-Konto am Login verwenden: Hinweis auf Registrierung, kein neuer Nutzer.
5. Mit einem Credential-Testkonto und gleicher GitHub-E-Mail testen: verständlicher Konflikt, keine zweite Auth-Methode und keine neue Sitzung. Passwortlogin funktioniert weiter.
6. Autorisierung abbrechen sowie private verifizierte E-Mail testen. Gesperrten Testnutzer prüfen.
7. In Produktion den vollständigen Durchlauf über Traefik/TLS durchführen und Secure-/HttpOnly-Session-Cookie prüfen.

Automatisierte Tests laufen ohne GitHub-Secrets und ohne echte Provideraufrufe. Der OAuth-Test nutzt Better Auth mit Memory-Adapter statt MySQL; er ersetzt nicht die obige Betriebsabnahme. Beide CI-Pipelines führen diese Tests bereits über ihre bestehenden Testjobs aus.

## Deaktivierung

Beide GitHub-Variablen entfernen und Backend neu starten. Tabellen, Konten und Karten bleiben erhalten. Bereits ausgestellte KompCards-Sessions laufen regulär weiter; neue GitHub-Anmeldungen sind deaktiviert. GitHub-only-Nutzer haben dann bis zur Reaktivierung keinen neuen Anmeldeweg. Eine Verbindung kann im Profil nicht getrennt werden; Passwortvergabe und Recovery für GitHub-only-Konten gehören zu einem späteren Feature.

## Referenzen

- [GitHub OAuth Apps erstellen](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Better Auth: GitHub](https://better-auth.com/docs/authentication/github)
- [Better Auth: Kontoverknüpfung](https://better-auth.com/docs/concepts/users-accounts)
