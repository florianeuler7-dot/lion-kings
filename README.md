# WinterArc 26/27 – Trainings-App für die Crew

Installierbare Web-App (PWA) für eine kleine Trainings-Crew: geführte Workouts,
Cardio- und Mobility-Flows, gemeinsames Dashboard mit Leaderboard und Feed, und ein
KI-Coach, der Trainingspläne erstellt und anpasst. Der „Winter Arc“ läuft vom
1. Oktober 2026 bis 31. März 2027 (siehe `src/data/arc.js`).

## Was die App kann

- Arc-Fortschritt (Tag X von 156, Start 26.10.2026) und Wochenziel-Ring auf dem Home-Screen
- XP, Level und Badges – komplett aus dem Verlauf berechnet, nichts Extra in der DB (`src/lib/xp.js`)
- Abschluss-Animationen mit Konfetti (Canvas, kein Video, respektiert reduced-motion)
- Erkennt den Wochentag und zeigt das passende Training (eigener oder Default-Plan)
- Führt Übung für Übung durch, fragt nach jedem Satz Gewicht & Wiederholungen
- Pausentimer als Fortschrittsring, Benachrichtigung bei erreichter Pause (auch bei gesperrtem Screen)
- Cardio-Timer (Zone-2 / HIIT) und Mobility-Programme zum Abhaken
- Freies Training eintragen (Fußball, Schwimmen, …)
- Verlauf mit Notizen, übersprungenen Übungen und Löschen
- Crew-Dashboard: Live-Status, Leaderboard (Woche / 30 Tage), Activity-Feed mit Reaktionen & Kommentaren
- Coach-Chat (Claude): Plan erstellen, anpassen, Fragen beantworten
- Goldene Regeln (Wasser, Schritte, Ernährung) mit 7-Tage-Verlauf

## Design

Das Design-System wurde mit dem Skill [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
erzeugt (Stil „Vibrant & Block-based“, Energy-Orange + Grün auf kühlem Slate,
Barlow Condensed / Barlow). Alle Farben, Radien und Schatten sind Tokens in
`src/index.css` (`@theme`). Icons kommen ausschließlich aus Lucide, keine Emojis als Icons.

## Technik

| Bereich      | Stack                                                     |
| ------------ | --------------------------------------------------------- |
| Frontend     | React 18, Vite 5, Tailwind CSS v4 (Build, kein CDN)       |
| Daten        | Supabase (Postgres + Realtime + Storage für Avatare)      |
| KI           | Anthropic API über Netlify Functions (`netlify/functions`) |
| Hosting      | Netlify (`netlify.toml`), PWA mit Service Worker          |

### Projektstruktur

```
src/
  App.jsx               App-Shell, Navigation, Workout-Lifecycle
  supabase.js           Alle DB-Zugriffe + Backend-Calls
  index.css             Design-Tokens, Utilities, Animationen
  components/           ui.jsx (Primitives, Wordmark), Avatar, Toast, ErrorBoundary
  screens/              Home, Workout, History, Plan, Cardio, Mobility, Dashboard, Coach, Onboarding
  data/                 Arc-Zeitraum, Default-Plan, Mobility-Programme, Zitate, Release Notes
  lib/                  Datum (lokal!), Workout-Helfer, Geräte-APIs, Session
netlify/functions/      coach-chat.mjs, parse-plan.mjs
public/                 Icons, Manifest, sw.js
scripts/                local-dev.mjs (Functions lokal), generate-icons.mjs (PNG aus icon.svg)
```

## Lokal entwickeln

Voraussetzung: Node.js ≥ 20.

```bash
npm install
npm run dev
```

`npm run dev` startet Vite (http://localhost:5173) und einen kleinen lokalen Server für die
Netlify Functions (Port 8889). Der Anthropic-API-Key wird in dieser Reihenfolge gesucht:

1. Umgebungsvariable `COACH_API_KEY`
2. Datei `.env` im Projekt (`COACH_API_KEY=sk-ant-...`, ist gitignored)
3. `netlify env:get COACH_API_KEY` (Netlify CLI muss eingeloggt sein)

Ohne Key läuft die App, nur der Coach antwortet mit einem Fehler.

App-Icons neu erzeugen (nach Änderung an `public/icon.svg`): `npm run icons`.

## Deployen

Die App wird über Netlify gebaut und ausgeliefert (`npm run build` → `dist/`).
In den Netlify-Einstellungen muss die Umgebungsvariable `COACH_API_KEY` gesetzt sein.

### Coach (Netlify Functions)

Die Functions streamen die Antwort (NDJSON) – so läuft auch eine lange Plan-Antwort nicht
ins Zeitlimit synchroner Functions. Gemeinsame Logik liegt in `netlify/functions/lib/anthropic.mjs`.

| Variable               | Default             | Zweck                                                        |
| ---------------------- | ------------------- | ------------------------------------------------------------ |
| `COACH_API_KEY`        | –                   | Anthropic API-Key (Pflicht)                                  |
| `COACH_MODEL`          | `claude-sonnet-5-5` | Hauptmodell                                                  |
| `COACH_FALLBACK_MODEL` | `claude-sonnet-4-5` | Wird automatisch genutzt, wenn das Hauptmodell nicht antwortet (404/429/5xx) |

**Coach antwortet nicht?** Die Chat-Blase zeigt den Grund in eckigen Klammern, z. B.
`[claude-sonnet-5-5: model not found]` oder `API-Key ungültig`. Details stehen in Netlify
unter *Logs → Functions → coach-chat*.

Supabase-URL und Anon-Key stehen in `src/supabase.js`. Der Anon-Key ist öffentlich –
Datenschutz hängt an den Row-Level-Security-Policies in Supabase.

### Konto-Login (mehrere Geräte)

Optional kann sich jeder ein Konto (E-Mail + Passwort) anlegen – über Supabase Auth. Das Konto
ist nur eine Identität: welches Profil (`users`-Zeile) dazugehört, steht in den Auth-Metadaten
(`app_user_id`). Keine zusätzliche Tabelle, keine Migration. Die Datenzugriffe laufen weiter
über den anonymen Client (`src/supabase.js`), der Login-Client steckt in `src/lib/auth.js`.

Einmalig im Supabase-Dashboard unter **Authentication**:

1. *Providers → Email*: aktiviert lassen. **„Confirm email“ ausschalten** – sonst muss jeder
   erst einen Link in der Mail klicken (funktioniert auch, ist aber ein Schritt mehr).
2. *URL Configuration → Site URL*: `https://noxcuse.netlify.app` – dahin führen Bestätigungs-
   und Passwort-zurücksetzen-Links.

Ablauf: Auf dem ersten Gerät unter *Home → Schlüssel-Icon* „Konto anlegen“, auf dem zweiten
Gerät beim Start einloggen – man landet direkt im eigenen Profil.

**Supabase pausiert?** Kostenlose Projekte werden nach einer Woche ohne Nutzung angehalten.
Die App zeigt dann auf dem Home-Screen ein rotes Banner. Im Supabase-Dashboard
„Restore project“ klicken.

### Nutzer löschen

`supabase/delete-other-users.sql` löscht alle Nutzer außer einem (samt Workouts, Reaktionen,
Kommentaren). Im Supabase SQL Editor ausführen, vorher den Namen anpassen.

### Benötigte Supabase-Tabellen

`users`, `workouts`, `live_status`, `reactions`, `comments`, `daily_steps` sowie der
Storage-Bucket `avatars`. Felder siehe `src/supabase.js`.

## Auf den Home Screen

**iPhone (Safari):** Teilen → „Zum Home-Bildschirm“.
**Android (Chrome):** Menü → „App installieren“.

## Plan anpassen

Der Default-Plan steht in `src/data/plan.js`. Eigene Pläne werden pro Nutzer in
`users.plan_data` gespeichert und können jederzeit über den Coach geändert oder im Plan-Tab
als Freitext importiert werden („Bestehenden Plan als Text importieren“).

## Release Notes

In `src/data/releaseNotes.js` – der neueste Eintrag wird auf dem Home-Screen angezeigt,
bis der Nutzer ihn wegklickt.
