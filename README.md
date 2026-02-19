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

   **Wichtig:** Nach dem ersten Start (oder wenn Sie die Datenbank zurücksetzen möchten) muss die Datenbank manuell eingespielt werden:
   ```bash
   docker exec karteikarten-web-1 npx prisma db seed
   ```

2. Öffnen Sie die Anwendung im Browser:
   http://localhost:3000

## Installation via Dockerhub Image
1. docker-compose.yml Erstellen
   ```bash
	services:
	  web:
		image: moritzch/karteikarten:latest
		ports:
		  - "3000:3000"
		environment:
		  # Constructs the DB URL dynamically using the individual Postgres variables
		  DATABASE_URL: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}"
		  NEXTAUTH_URL: "${NEXTAUTH_URL}"
		  NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
		depends_on:
		  - db
		restart: always
		volumes:
		  - uploads:/app/public/uploads

	  db:
		image: postgres:15-alpine
		restart: always
		environment:
		  POSTGRES_USER: "${POSTGRES_USER}"
		  POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
		  POSTGRES_DB: "${POSTGRES_DB}"
		volumes:
		  - pgdata:/var/lib/postgresql/data

	volumes:
	  pgdata:
	  uploads:
   ```
2. .env Datei erstellen
   ```bash
	# -----------------------------
	# Datenbankkonfiguration
	# -----------------------------
	POSTGRES_USER=postgres
	POSTGRES_PASSWORD=change_this_to_a_secure_password
	POSTGRES_DB=karteikarten

	# -----------------------------
	# NextAuth Konfiguration
	# -----------------------------
	# FQDN oder IP:PORT eintragen
	NEXTAUTH_URL=http://localhost:3000

	# Ein Zufallsschlüssel kann mittels folgendem Befehl erstellt werden: openssl rand -base64 32
	NEXTAUTH_SECRET=your_super_secret_generated_string_here
   ```

3. docker compose up
4.  **Wichtig:** Nach dem ersten Start (oder wenn Sie die Datenbank zurücksetzen möchten) muss die Datenbank manuell eingespielt werden:
   ```bash
   docker exec karteikarten-web-1 npx prisma db seed
   ```

## Features 
- Authentifizierung (Admin, Standortleitung, Lehrer)
- Dashboard für verschiedene Rollen
- Schülerverwaltung und Noteneingabe
- Datei-Uploads und Export
- Archivierungsfunktion für Schüler

## Todo
   - Manuellen Datenbank-Seed ablösen
   - Verbesserungen UI, Sicherheit, Bugs

### Standard-Logins (Initial Seed)
Beim ersten Start wird die Datenbank mit Testdaten befüllt (`prisma/seed.js`). Folgende Benutzer werden angelegt:

| Rolle | Email | Passwort |
|---|---|---|
| **Admin** | `admin@karteikarten.local` | `admin123` |
| **Standortleitung** | `manager@karteikarten.local` | `password123` |
| **Lehrkraft** | `teacher@karteikarten.local` | `password123` |

