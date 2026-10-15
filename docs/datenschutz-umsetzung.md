# Datenschutz: Umsetzung für den Einsatz in Bayern

Stand: 15.10.2026. Hosting laut Betreiberangabe: Google Cloud.
Dieses Dokument hält den Arbeitsstand fest. Es ersetzt keine schulische Freigabe
und bestätigt keine vollständige Rechtskonformität. Die produktive
Serverkonfiguration und Verträge sind noch nicht geprüft.

## Erstes Maßnahmenpaket im Quellcode

- Raumdaten werden vor jeder Übertragung anhand der aktuellen Anmeldung und
  Raumzuordnung geprüft. Schülergeräte erhalten ausschließlich den eigenen
  Teilnehmereintrag; Klassenergebnisse erhält die zuständige Lehrkraft.
- Abmeldung oder Entzug der Schülerkennung berechtigen eine bestehende
  Verbindung nicht weiter zum Lesen oder Schreiben von Testdaten.
- PDF-Berichte erfordern eine angemeldete, für die Klasse zuständige Lehrkraft.
  Die Berichtsdaten werden aus der Datenbank geladen, auch nach einem Neustart.
- API-Antworten und PDF-Berichte erhalten `Cache-Control: no-store`.
- Vollständige Raumdaten werden nicht mehr in Server- oder Browserkonsolen
  protokolliert. Weitere Fehler- und Zugriffsprotokolle sind separat zu prüfen.
- Noto Sans wird mit seiner SIL Open Font License aus `public/fonts/noto-sans`
  ausgeliefert. Die externen Google-Fonts- und Preconnect-Verweise sind entfernt.

Die Änderungen sind lokal; eine Veröffentlichung ist damit nicht erfolgt.

## Nächste technische Maßnahmen

- Schüleranmeldungen auf gemeinsam verwendeten Geräten verkürzen; auch bestehende
  Sitzungen beim Umstieg berücksichtigen. Aktuell beträgt die Gültigkeit 180 Tage.
- Lehrkraft- und Adminanmeldungen gegen wiederholte Passwortversuche schützen.
  Passwortwechsel, Kontosperrung und Widerruf bestehender Sitzungen vorsehen.
- Löschabläufe für Schüler mit gespeicherten Prüfungen vervollständigen:
  Fremdschlüssel mit `ON DELETE RESTRICT` verhindern derzeit direkte Löschungen.
  Gesetzliche Aufbewahrungspflichten müssen zuvor geklärt werden.
- Aufbewahrungsfristen für Übungen, Prüfungen, Konten, Protokolle und Backups
  festlegen und technisch umsetzen. Archivieren allein löscht keine Daten.
- Auskunft und Berichtigung vollständig ermöglichen; Pseudonyme anstelle
  vollständiger Namen als Standard für den schulischen Einsatz prüfen.
- HTTPS und Weiterleitung von HTTP, sichere Datenbankverbindungen,
  Origin-Prüfungen für HTTP/WebSocket und Schutz vor fremden Schreibanfragen
  prüfen. Bei Datenbank-TLS die Zertifikatsprüfung aktivieren.
- Protokollierung von Zugangstokens in URLs, Webserver- und Deploymentprotokollen
  sowie deren Aufbewahrung und Zugriffsberechtigung prüfen.

## Angaben und Entscheidungen, die noch fehlen

- Rechtlicher Betreiber und dessen ladungsfähige Anschrift und Kontakt.
- Verantwortliche Stelle für die schulische Verarbeitung und Kontakt des
  zuständigen Datenschutzbeauftragten.
- Öffentliche/private Schule, konkrete Nutzungsform (freiwillige Übung,
  verpflichtende Nutzung, Leistungsnachweis), Jahrgangsstufen und Reichweite.
- Google-Cloud-Vertragspartner, Projekt-/Datenbank-/Backup-Regionen,
  Unterauftragnehmer, Administrations- und Supportzugriffe und gegebenenfalls
  Drittlandübermittlungen. Ein EU-Standort allein beantwortet diese Fragen nicht.
- Auftragsverarbeitungsverträge entlang der tatsächlichen Vertragskette.
- Schulische Entscheidung über den Einsatz und die konkrete Rechtsgrundlage.

Danach können Impressum, Datenschutzhinweise für Website und Schulnutzung,
altersgerechte Schüler-/Elterninformationen sowie erforderliche Vertragsunterlagen
mit zutreffenden Angaben erstellt werden. Unvollständige Muster werden nicht als
fertige Rechtstexte veröffentlicht.

## Bayern: Grundlagen für die schulische Prüfung

Das Kultusministerium stellt Hinweise und Muster speziell für passwortgeschützte
Lernplattformen bereit. Für Math4Speed sind insbesondere Anlage 2 Abschnitt 4 zu
§ 46 BaySchO und die konkrete schulische Nutzung mit dem zuständigen
Datenschutzbeauftragten zu prüfen. Aus Regelungen für zentral bereitgestellte
Angebote darf keine automatische Freigabe für ein eigenes Angebot abgeleitet werden.

- [Bayerisches Kultusministerium: Datenschutz an Schulen](https://www.km.bayern.de/recht/datenschutz-an-schulen/)
- [BaySchO einschließlich Anlagen](https://www.gesetze-bayern.de/Content/Document/BaySchO2016/true)
- [DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679)
- [DSK: Orientierungshilfe für Online-Lernplattformen, Stand 2018](https://www.datenschutzkonferenz-online.de/media/oh/20180426_oh_online_lernplattformen.pdf)

Verarbeitungsverzeichnis, technische und organisatorische Maßnahmen,
Datenschutzvorfallverfahren, Erforderlichkeit einer Datenschutz-Folgenabschätzung
und anwendbare Barrierefreiheitsanforderungen sind mitzuprüfen. Die tatsächliche
Erforderlichkeit und Dauer jedes Cookies, auch des Tastatureinstellungscookies,
muss dokumentiert werden; ein Cookie-Banner ist kein pauschaler Ersatz dafür.

## Prüfung dieses Maßnahmenpakets

`node --env-file=.env.local tests/rehearsal-integration.js` legt eine eigene lokale
Testdatenbank an und entfernt sie nach dem Lauf. Der Test prüft jetzt zusätzlich:

- Raumdatenzugriffe ohne Anmeldung und durch eine fremde Lehrkraft werden abgewiesen.
- Schüler erhalten bei direkter Abfrage und automatischer Übertragung nur eigene Daten.
- PDF-Downloads ohne Lehrkraftanmeldung oder für fremde Klassen werden abgewiesen;
  der zuständige Lehrer erhält eine PDF mit `no-store`.
- Bereits verbundene Lehrkräfte verlieren nach Abmeldung den Datenzugriff.
- Abgemeldete Schüler können über die bestehende Verbindung weder Antworten noch
  Fortschritt speichern oder die Prüfung abgeben.
- Die bestehenden Abläufe für Startcode, Antworten, Fortsetzen, Abgabe,
  Probedurchlauf und Zurücksetzen werden weiterhin geprüft.

Weitere lokale Prüfungen: Server-Syntax, ESLint, Server-Tests und Produktionsbuild.
Die gebaute Seite und ihre Styles enthalten keine Google-Fonts-Verweise mehr;
beide lokalen Schriftdateien wurden über HTTP abgerufen und die Trainingsseite
wurde im Browser visuell geprüft.
Das bestätigt weder die Live-Konfiguration noch schulrechtliche Voraussetzungen.
