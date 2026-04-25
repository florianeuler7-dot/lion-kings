# CUT.PHASE – Trainings-Agent

Dein persönlicher Trainings-Begleiter als Web-App. Installierbar auf dem Home Screen.

## Was die App kann

- Erkennt automatisch den Wochentag und zeigt dir das richtige Training
- Führt dich Übung für Übung durch
- Fragt nach jedem Satz: Gewicht & Wiederholungen
- Pausentimer startet automatisch (mit Vibration am Ende)
- Erinnert alle 15 Min ans Trinken
- Speichert deinen kompletten Verlauf
- Zeigt dir letzte Gewichte als Referenz für Progression

---

## Schnellster Weg zum Deployen (10 Minuten)

### Schritt 1: Vercel-Account anlegen
1. Gehe zu https://vercel.com
2. „Sign Up" → mit GitHub, GitLab, Bitbucket oder E-Mail anmelden
3. Kostenlos, keine Kreditkarte nötig

### Schritt 2: Projekt deployen (Drag & Drop)
1. Auf https://vercel.com/new
2. Den ENTPACKTEN Ordner `cutphase-app` finden – aber **NICHT** den ganzen Ordner hochladen!
3. Stattdessen: Klick auf **„Deploy"** im Vercel-Dashboard und wähle „Browse" 
4. Den `cutphase-app`-Ordner auswählen

**Alternative (zuverlässiger): Vercel CLI**

Falls du Node.js installiert hast:
```bash
cd cutphase-app
npm install
npm install -g vercel
vercel
```
Folge den Prompts (Standard-Einstellungen reichen). Du bekommst eine URL wie `https://cutphase-app.vercel.app`.

### Schritt 3: Auf den Home Screen
**iPhone (Safari):**
1. URL in Safari öffnen
2. Teilen-Button (Quadrat mit Pfeil nach oben)
3. „Zum Home-Bildschirm"
4. Name vergeben → „Hinzufügen"
5. App-Icon erscheint auf dem Home Screen

**Android (Chrome):**
1. URL in Chrome öffnen
2. Drei-Punkte-Menü oben rechts
3. „App installieren" oder „Zum Startbildschirm hinzufügen"

Fertig. Die App startet jetzt im Vollbild-Modus, fühlt sich an wie eine native App.

---

## Lokal testen (optional)

Wenn du Node.js installiert hast:
```bash
cd cutphase-app
npm install
npm run dev
```
Dann http://localhost:5173 im Browser öffnen.

---

## Daten

Alle Daten werden lokal in deinem Browser gespeichert (`localStorage`). Wenn du den Browser-Cache löschst oder die App vom Home Screen entfernst, sind die Daten weg.

Für Backup: Im Browser → Developer Tools → Application → Local Storage → kopieren.

---

## Plan-Anpassungen

Der komplette Plan ist in `src/App.jsx` ganz oben in der Konstante `PLAN` definiert. Du kannst Übungen, Sätze, Wiederholungen und Pausenzeiten dort einfach anpassen.

Nach Änderungen:
- Lokal: Vite reloaded automatisch
- Vercel: einfach `vercel --prod` ausführen, oder bei GitHub-Verknüpfung wird automatisch deployed
