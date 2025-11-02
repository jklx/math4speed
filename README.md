# Math4Speed — Einmaleins-Test

Kurze Anleitung

- Starten: Installiere Abhängigkeiten und starte den Dev-Server.
- Du bekommst 100 Aufgaben (Einmaleins). Aufgaben mit *1 und *10 kommen seltener vor.
- Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es 10 Strafsekunden.
- Am Ende siehst du deine Gesamzeit (Rohzeit + Strafsekunden) und eine Übersicht aller Aufgaben mit Rückmeldung.

Schnellstart (Windows PowerShell)

```powershell
cd c:/Users/jakob/workspace/math4speed
npm install
npm run dev
```

Öffne dann im Browser die angezeigte Vite-URL (standardmäßig http://localhost:5173).

Anpassungen

- Die Wahrscheinlichkeit, dass Aufgaben mit Faktor 1 oder 10 auftauchen, ist bewusst reduziert. Wenn du eine andere Verteilung willst, passe `generateProblems` in `src/App.jsx` an.
