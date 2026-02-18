# Schülerkarteikarten System

## Voraussetzungen
Die folgenden Tools müssen auf dem System installiert sein:
- **Docker**
- **Docker Compose**

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

## Features 
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

