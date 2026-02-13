# !! 99% Vibe Coded !!

# Schülerkarteikarten System

## Voraussetzungen
Die folgenden Tools müssen auf dem System installiert sein:
- **Docker**
- **Docker Compose**

(Optional für lokale Entwicklung ohne Docker: Node.js 18+)

## Installation und Start


1. Starten Sie die Anwendung und die Datenbank:
   ```bash
   docker-compose up --build
   ```

   **Wichtig:** Nach dem ersten Start (oder wenn Sie die Datenbank zurücksetzen möchten) müssen Sie die Standard-Daten manuell einspielen (Seeding):
   ```bash
   docker exec karteikarten-web-1 npx prisma db seed
   ```

2. Öffnen Sie die Anwendung im Browser:
   http://localhost:3000

## Projektstruktur
- `src/app`: Next.js App Router Pages und Layouts
- `src/lib`: Hilfsfunktionen (z.B. Datenbankverbindung)
- `prisma`: Datenbankschema (PostgreSQL)
- `docker-compose.yml`: Definition der Services (App + DB)

## Features (Geplant/In Entwicklung)
- Authentifizierung (Admin, Standortleitung, Lehrer)
- Dashboard für verschiedene Rollen
- Schülerverwaltung und Noteneingabe
- Datei-Uploads und Export
- Archivierungsfunktion für Schüler

## Sicherheit & Konfiguration

### Environment Variables (.env)
Das Projekt benötigt eine `.env` Datei im Hauptverzeichnis. Eine Vorlage (`.env.example`) sollte folgende Variablen enthalten:

```env
# Datenbank-Verbindung (genutzt von Prisma)
DATABASE_URL="postgresql://postgres:postgres@db:5432/karteikarten?schema=public"

# NextAuth Konfiguration
# Generieren Sie ein sicheres Secret mit: openssl rand -base64 32
NEXTAUTH_SECRET="change-me-to-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Datenbank-Passwort (für den PostgreSQL Container)
POSTGRES_PASSWORD=postgres
```

**WICHTIG:** Ändern Sie `NEXTAUTH_SECRET` und `POSTGRES_PASSWORD` in einer Produktionsumgebung unbedingt auf sichere Werte!

### Standard-Logins (Initial Seed)
Beim ersten Start wird die Datenbank mit Testdaten befüllt (`prisma/seed.js`). Folgende Benutzer werden angelegt:

| Rolle | Email | Passwort |
|---|---|---|
| **Admin** | `admin@karteikarten.local` | `admin123` |
| **Standortleitung** | `manager@karteikarten.local` | `password123` |
| **Lehrkraft** | `teacher@karteikarten.local` | `password123` |

Bitte ändern Sie diese Passwörter nach dem ersten Login umgehend.

## Wartung & Updates

### NPM Pakete aktualisieren
Um Sicherheitslücken zu schließen und Abhängigkeiten aktuell zu halten, führen Sie regelmäßig Updates durch:

1. **Prüfen auf veraltete Pakete:**
   ```bash
   docker exec karteikarten-web-1 npm outdated
   ```

2. **Updates durchführen (Minor/Patch):**
   ```bash
   docker exec -u root karteikarten-web-1 npm update
   ```

3. **Sicherheits-Audits:**
   ```bash
   docker exec -u root karteikarten-web-1 npm audit fix
   ```

### Major Updates (z.B. Next.js Versionen)
Für Major-Updates (z.B. Next.js 14 -> 15) müssen Sie ggf. die `package.json` manuell anpassen und den Container neu bauen (`docker-compose up -d --build`). Beachten Sie dabei Breaking Changes der Frameworks.

Das Basis-Image wurde auf `node:20-bullseye-slim` aktualisiert, um moderne Framework-Versionen zu unterstützen.
