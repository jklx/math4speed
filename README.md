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

## Moodle LTI 1.3 (Deep Linking)

Math4Speed enthält ein erstes LTI-1.3- und Deep-Linking-Grundgerüst. Kopiere `.env.example` nach `.env` und trage die Registrierungsdaten der Moodle-Instanz sowie den privaten RSA-Schlüssel des Tools ein. Die JSON-Konfiguration für Moodle ist danach unter `/lti/configuration` erreichbar; Moodle benötigt außerdem den öffentlichen Schlüssel unter `/.well-known/jwks.json`.

Lehrkräfte wählen beim Anlegen einer externen Aktivität „Inhalt auswählen“. Der Math4Speed-Konfigurator speichert die fachlichen Einstellungen serverseitig und gibt einen signierten Ressourcenverweis an Moodle zurück.

Der aktuelle Stand prüft die LTI-Startsignatur, übernimmt Kategorie und Zeitlimit in das Spiel und deaktiviert die öffentliche Rangliste für LTI-Aktivitäten. Die Rückgabe von Punkten über AGS sowie die SEB-Prüfung werden im nächsten Ausbauschritt ergänzt.
