# NO EXCUSES – Trainings-App für die Crew

Installierbare Web-App (PWA) für eine kleine Trainings-Crew: geführte Workouts,
Cardio- und Mobility-Flows, gemeinsames Dashboard mit Leaderboard und Feed, und ein
KI-Coach, der Trainingspläne erstellt und anpasst.

## Was die App kann

- Erkennt den Wochentag und zeigt das passende Training (eigener oder Default-Plan)
- Führt Übung für Übung durch, fragt nach jedem Satz Gewicht & Wiederholungen
- Pausentimer als Fortschrittsring, Benachrichtigung bei erreichter Pause (auch bei gesperrtem Screen)
- Cardio-Timer (Zone-2 / HIIT) und Mobility-Programme zum Abhaken
- Freies Training eintragen (Fußball, Schwimmen, …)
- Verlauf mit Notizen, übersprungenen Übungen und Löschen
- Crew-Dashboard: Live-Status, Leaderboard (Woche / 30 Tage), Activity-Feed mit Reaktionen & Kommentaren
- Coach-Chat (Claude): Plan erstellen, anpassen, Fragen beantworten
- Goldene Regeln (Wasser, Schritte, Ernährung) mit 7-Tage-Verlauf

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
  components/           ui.jsx (Primitives), Avatar, Toast, ErrorBoundary
  screens/              Home, Workout, History, Plan, Cardio, Mobility, Dashboard, Coach, Onboarding
  data/                 Default-Plan, Mobility-Programme, Zitate, Release Notes
  lib/                  Datum (lokal!), Workout-Helfer, Geräte-APIs, Session
netlify/functions/      coach-chat.mjs, parse-plan.mjs
public/                 Icons, Manifest, sw.js
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

## Deployen

Die App wird über Netlify gebaut und ausgeliefert (`npm run build` → `dist/`).
In den Netlify-Einstellungen muss die Umgebungsvariable `COACH_API_KEY` gesetzt sein.

Supabase-URL und Anon-Key stehen in `src/supabase.js`. Der Anon-Key ist öffentlich –
Datenschutz hängt an den Row-Level-Security-Policies in Supabase.

### Benötigte Supabase-Tabellen

`users`, `workouts`, `live_status`, `reactions`, `comments`, `daily_steps` sowie der
Storage-Bucket `avatars`. Felder siehe `src/supabase.js`.

## Auf den Home Screen

**iPhone (Safari):** Teilen → „Zum Home-Bildschirm“.
**Android (Chrome):** Menü → „App installieren“.

## Plan anpassen

Der Default-Plan steht in `src/data/plan.js`. Eigene Pläne werden pro Nutzer in
`users.plan_data` gespeichert und können jederzeit über den Coach geändert werden.

## Release Notes

In `src/data/releaseNotes.js` – der neueste Eintrag wird auf dem Home-Screen angezeigt,
bis der Nutzer ihn wegklickt.
