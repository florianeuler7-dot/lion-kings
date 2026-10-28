// Release notes — newest entry first.
// Fields:
//   version   – semver string, used to track "seen" state in localStorage
//   date      – ISO date string
//   title     – short headline shown in badge + modal
//   highlights – array of short bullet strings
//   thanks    – optional personal note (string or null)
//   motto     – closing line shown large at bottom of modal

const RELEASE_NOTES = [
  {
    version: "2.3.0",
    date: "2026-10-28",
    title: "Neuer Coach-Ton",
    highlights: [
      "Der Coach redet jetzt locker, direkt und motivierend. It's you versus you",
      "Keine Markdown-Sternchen und langen Striche mehr im Chat",
      "Plan-Zusammenfassung bleibt stehen, bis du selbst auf Ansehen tippst",
      "Neues App-Icon: ARC, weiß auf schwarz",
    ],
    thanks: null,
    motto: "Beste Version von dir. Jeden Tag.",
  },
  {
    version: "2.2.0",
    date: "2026-10-28",
    title: "Konto & Import",
    highlights: [
      "Konto mit E-Mail und Passwort: auf Handy und Laptop beim selben Profil einloggen",
      "Chat: Enter macht eine neue Zeile, Senden per Button oder Strg+Enter",
      "Plan-Tab: bestehenden Plan als Text importieren",
    ],
    thanks: null,
    motto: "Ein Profil. Alle Geräte.",
  },
  {
    version: "2.1.1",
    date: "2026-10-28",
    title: "Coach repariert",
    highlights: [
      "Der Coach antwortet wieder – Antworten erscheinen jetzt Wort für Wort",
      "Lange Plan-Antworten laufen nicht mehr ins Zeitlimit",
      "Wenn etwas schiefgeht, steht der Grund direkt im Chat",
    ],
    thanks: null,
    motto: "Tag 2. Weiter geht's.",
  },
  {
    version: "2.1.0",
    date: "2026-10-26",
    title: "Game on",
    highlights: [
      "Der Arc startet heute: Tag 0 von 156",
      "XP und Level: jedes Workout bringt Punkte, Streaks geben Bonus",
      "Badges für Meilensteine (10 Workouts, 7-Tage-Streak, 10 t bewegt …)",
      "Neue Abschluss-Animation: Konfetti, hochzählende Stats, Level-up",
      "Neues App-Icon: Hantel vor Schneeflocke",
    ],
    thanks: null,
    motto: "Tag 0. Ab jetzt zählt jeder Satz.",
  },
  {
    version: "2.0.0",
    date: "2026-10-26",
    title: "WinterArc 26/27",
    highlights: [
      "Die App heißt jetzt WinterArc 26/27 – neues Icon, neue Farben, neue Schrift",
      "Arc-Fortschritt auf dem Home-Screen: Tag X von 182, bis 31. März",
      "Wochenziel-Ring: wie viele Einheiten diese Woche schon stehen",
      "Schnellstart-Kacheln für Cardio, Mobility und freies Training",
      "Klarere Icons statt Emojis, größere Tap-Flächen, sichtbarer Fokus",
      "Orange für Aktionen, Grün für Abschluss, Eisblau für Cardio-Tage",
    ],
    thanks: null,
    motto: "Winter is coming. So are we.",
  },
  {
    version: "1.5.0",
    date: "2026-10-26",
    title: "Fresh Look",
    highlights: [
      "Komplett neues Design – ruhiger, klarer, schneller",
      "Pausen- und Cardio-Timer als Ring mit Fortschritt",
      "Fehler werden jetzt angezeigt statt stumm zu verschwinden",
      "Crew-Feed zeigt immer aktuelle Daten (kein veralteter Cache mehr)",
      "Dauer wird überall einheitlich in Minuten gespeichert",
      "Workouts lassen sich im Verlauf auch ohne Wischen löschen",
      "Streak und „heute erledigt“ rechnen mit lokaler Zeit",
      "Eigene Pläne mit weniger als 4 Krafttagen funktionieren jetzt",
    ],
    thanks: null,
    motto: "No excuses. Only reps.",
  },
];

export default RELEASE_NOTES;
