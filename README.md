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

## Klassen und Konten (in Vorbereitung)

Klassen, Schülerkennungen und Tests werden dauerhaft in PostgreSQL gespeichert. Für die Kontoverwaltung muss der Server mit diesen Umgebungsvariablen starten:

```text
DATABASE_URL=postgresql://…
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<mindestens 12 Zeichen>
ADMIN_DISPLAY_NAME=Administration
```

Beim ersten Start legt die Anwendung mit diesen Angaben das Admin-Konto an. Dieses Konto darf Lehrkraft-Konten erstellen. Ohne `DATABASE_URL` bleiben die bisherigen Trainings- und Mehrspielerfunktionen verfügbar; die Kontoverwaltung ist dann bewusst deaktiviert.

## Probedurchlauf

Unter **Verwaltung → Klasse → Tests → Probedurchlauf** öffnest du eine getrennte Kopie mit einem fiktiven Schüler. Die Probe-Kennung steht im Proberaum. Öffne dort die Schüleransicht in einem neuen Tab, melde dich mit dieser Kennung an und gib nach der Freigabe durch die Lehrkraft den Startcode ein. Aufgaben, Bearbeitung, Live-Fortschritt und Auswertung verwenden den normalen Testablauf. Die echte Klasse und ihre Ergebnisse bleiben getrennt.

Ein erneuter Klick öffnet denselben Proberaum. Mit **Probedurchlauf zurücksetzen** werden ausschließlich dessen Antworten und Bearbeitungsstände gelöscht; schließe vorher die Schüleransicht und öffne sie danach neu. Probedurchläufe übernehmen beim Anlegen die Aufgaben- und Zeiteinstellungen. Bei SEB-Tests ist **Probedurchlauf** eine Browserprobe ohne SEB-Pflicht; **SEB-Geräteprobe** verwendet die echte SEB-Konfiguration auf dem Schulgerät.

Technische Ablaufprüfung: `npm run test:rehearsal` benötigt eine lokale `DATABASE_URL` mit Berechtigung zum Anlegen einer temporären Datenbank. Die Prüfung erstellt eine eigene Datenbank und entfernt sie anschließend wieder; vorhandene Tabellen werden nicht verwendet.

### Automatische Probe-Schüler

Vor dem Start einer Browserprobe kannst du **Automatische Schüler hinzufügen** wählen. Mia rechnet schneller (jede siebte Antwort falsch), Noah langsamer (jede vierte Antwort falsch). Das Tempo richtet sich nach der Aufgabenkategorie. Beide warten auf den Startcode und geben nach der konfigurierten Testzeit automatisch ab. Die Live-Ansicht und Auswertung zeigen ihre gespeicherten Antworten. Du kannst gleichzeitig selbst rechnen oder den manuellen Probe-Schüler vor der Freigabe als abwesend markieren.

Die Automatik läuft auf dem Server und verwendet die normalen Endpunkte für Anmeldung im Raum, Startcode, Antworten, Fortschritt und Abgabe sowie dieselben Aufgabengeneratoren wie die Schüleransicht. Sie ist ausschließlich für getrennte Browserproben freigeschaltet. **Probedurchlauf zurücksetzen** stoppt laufende Aktionen, löscht die Probe-Ergebnisse und meldet die automatischen Schüler wieder an. Nach einem Serverneustart werden laufende Bearbeitungen fortgesetzt; falls die Automatik den gerade freigegebenen Startcode noch nicht erhalten hatte, fordert sie zum Zurücksetzen auf. Die Automatik prüft den Serverablauf; die Bedienung der Schüleroberfläche und SEB werden weiterhin manuell geprüft.

Mit `npm run test:rehearsal:bots` wird zusätzlich ein vollständiger einminütiger automatischer Durchlauf einschließlich Serverneustart, Live-Antworten und Zurücksetzen geprüft. Wie die kurze Ablaufprüfung verwendet er eine eigene temporäre Datenbank.
