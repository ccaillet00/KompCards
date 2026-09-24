# Lokaler Auth-Setup

Die lokale Entwicklung startet mit einer leeren Datenbank. Es werden keine bestehenden MVP-Benutzer übernommen.

1. Lokale Datenbank und Volumes zurücksetzen:

   ```sh
   docker compose down -v
   docker compose up -d db
   ```

2. Im Backend `BETTER_AUTH_SECRET` und `BETTER_AUTH_URL=http://localhost:3000` konfigurieren.
3. Better-Auth-Schema und Foreign-Key-Cutover explizit ausführen:

   ```sh
   cd backend
   bun run db:migrate:auth-schema
   bun run db:migrate:cutover
   ```

4. Backend und Frontend starten und den ersten Benutzer über `/login?mode=register` registrieren.
5. Den ersten Administrator ausschließlich über seine explizit ausgewählte UUID in `auth_user.role` setzen.

`userTable` und `userSession` werden weiterhin als leere Legacy-Tabellen angelegt. Die Dateien für eine mögliche spätere Bestandsübernahme bleiben im Repository, sind für diesen lokalen Start aber nicht erforderlich.
