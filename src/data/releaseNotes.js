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
  {
    version: "1.4.0",
    date: "2026-04-30",
    title: "Fresh Drop",
    highlights: [
      "Pause-Timer zählt jetzt hoch statt runter — du entscheidest wann du weiter machst",
      "Empfohlene Pausenzeit als grüner Marker sichtbar",
      "Letzten Satz korrigieren falls du dich vertippt hast",
      "Workout-Abschluss jetzt mit vollem Gold-Screen und Stats",
      "Button wechselt zu 'Übung abschließen' beim letzten Satz",
      "Verlauf und Feed zeigen relative Zeit statt Datum",
    ],
    thanks: "Special thanks to: Davide ♥",
    motto: "Keep pushing — never back down.",
  },
];

export default RELEASE_NOTES;
