# Prüfung der Testdurchführung · 10.09.2026

Untersucht wurde der aktuelle Arbeitsstand der dauerhaften Klassentests: Anmeldung, Startfreigabe, Bearbeitung, Antwortspeicherung, Wiederaufnahme, Abgabe und Live-Auswertung. Es wurden keine Anwendungsdateien geändert. Die nachfolgend als reproduziert bezeichneten Serverfälle wurden gegen eine eigens angelegte temporäre PostgreSQL-Datenbank geprüft, die anschließend entfernt wurde. Aussagen zum Verhalten der Oberfläche beruhen auf dem Quellcode; eine interaktive Browser- oder SEB-Geräteprüfung wurde nicht durchgeführt.

P1 bedeutet: vor einem bewerteten Klassentest beheben. P2 bedeutet: relevanter Fehler bei Unterbrechungen oder bestimmten Abläufen.

1. **P1 – Namen und Antworten sind ohne Anmeldung abrufbar. Reproduziert.**

   Fundstelle: `server/server.js:1454`, Ereignis `getRoomState`.

   Ein neu verbundener Socket ohne Cookie kann für einen bereits im Server geladenen Testraum dessen Zustand anfordern. Der Handler prüft weder Anmeldung noch Zugehörigkeit oder Lehrkraftberechtigung. Im Versuch wurden Schülernamen und gespeicherte Antworten allein mit der Raum-ID zurückgegeben. Die ID steht im Schülerlink; es ist kein Erraten zufälliger IDs erforderlich, wenn jemand diesen Link besitzt.

   Abhilfe: Jeden Lesezugriff auf dauerhafte Räume autorisieren. Schülern ausschließlich die für ihre eigene Bearbeitung benötigten Daten senden; die vollständige Auswertung der Lehrkraft vorbehalten.

2. **P1 – Die Bewertung vertraut den Angaben des Browsers. Reproduziert.**

   Fundstelle: `server/server.js:1174`, besonders `1184`.

   Aufgabe, Antwort und `isCorrect` kommen vom Client. Der Server speichert `Boolean(isCorrect)` ohne mathematische Prüfung und ohne Bindung an eine serverseitig festgelegte Aufgabe. Im Versuch wurde für 2 × 3 die Antwort 999 als richtig gespeichert. Die Endabgabe zählt zwar gespeicherte Antworten, übernimmt dadurch aber bereits manipulierte Bewertungen.

   Abhilfe: Aufgaben serverseitig festlegen oder verbindlich registrieren und Antworten anhand dieser Aufgaben auswerten. HTTP- und Socket-Schreibwege müssen dieselbe Prüfung verwenden.

3. **P1 – Bereits angemeldete Schüler können vor dem Start festhängen. Serverzustand reproduziert, UI-Folge aus Code.**

   Fundstelle: `src/ExamRoom.jsx:83`, `85`, `87`; `server/server.js:867`.

   Wer aus dem Training oder einem früheren Test bereits eine gültige Sitzung besitzt, bekommt von `/wait` eine erfolgreiche Antwort, obwohl der Raumstatus des Schülers noch `pending` ist. Die Oberfläche setzt daraufhin `needsLogin=false` und zeigt „Du bist angemeldet“. Der notwendige Aufruf von `/ready` findet ausschließlich beim Absenden des ausgeblendeten Anmeldeformulars statt. Die Lehrkraft sieht den Schüler weiterhin als offen und kann den Startcode nicht freigeben.

   Abhilfe: Benutzeranmeldung und Raumanmeldung getrennt behandeln. Bei `pending` einen expliziten Raumbeitritt einschließlich SEB-Prüfung ermöglichen. Nach einem gescheiterten `/ready` darf Polling keine erfolgreiche Raumanmeldung vortäuschen.

4. **P1 – Ein abgelaufener Startcode kann den Test dauerhaft blockieren. Reproduziert.**

   Fundstelle: `server/server.js:830`, `853`, `891`, `1244`.

   Nach 60 Sekunden wird `/start` abgewiesen. Ein neuer Code lässt sich nur im Zustand `waiting` freigeben, in dem sich der Raum dann nicht mehr befindet. Noch nicht gestartete, aber als `ready` geführte Schüler lassen sich ebenfalls nicht mehr als abwesend markieren. Diese Schüler verhindern zugleich den Raumabschluss. Im Versuch wurden Start, erneute Freigabe und Abwesenheitsänderung jeweils mit 409 abgewiesen.

   Auch ein Neuladen der Lehrkraftansicht verliert den nur lokal gehaltenen Klartextcode, ohne dass ein Ersatz angefordert werden kann.

   Abhilfe: Kontrollierte erneute Codefreigabe für noch nicht gestartete Schüler sowie einen Abschlussweg für nicht teilnehmende Schüler vorsehen. Bereits gestartete Versuche dabei erhalten.

5. **P1 – Erlaubte Antwortkorrekturen werden nicht gespeichert. Reproduziert.**

   Fundstelle: `src/Game.jsx:767`; `server/server.js:1182`.

   Bei schriftlichen Aufgaben und Prozentgleichungen ersetzt die Oberfläche eine zunächst falsche Antwort nach der Korrektur durch eine richtige, unterstützte Antwort an derselben Position. Die Datenbank verwendet jedoch `ON CONFLICT ... DO NOTHING`. Im Versuch bestätigte der Server beide Schreibvorgänge erfolgreich, behielt aber die erste falsche Antwort. Auch das erneute Senden bei der Endabgabe repariert dies nicht. Schüleransicht und gespeicherte Bewertung können dadurch voneinander abweichen.

   Abhilfe: Zulässige Korrekturen ausdrücklich modellieren, etwa mit ursprünglicher Antwort und anschließendem Korrekturstand. Wiederholte oder verspätete Übertragungen dürfen einen neueren Stand nicht überschreiben.

6. **P1 – Browser und Server verwenden widersprüchliche Regeln für die Testzeit. Teilweise reproduziert.**

   Fundstelle: `src/Game.jsx:481`, `489`, `557`, `824`, `848`; `server/server.js:190`, `927`, `936`.

   Die Browseruhr pausiert bei Fehlerhinweisen, auch im Klassentest. Die gespeicherte Restzeit und die Wiederaufnahme berücksichtigen dagegen verstrichene Echtzeit. Nach längerer Fehlerkorrektur kann ein Neuladen deshalb deutlich weniger Restzeit ergeben als zuvor angezeigt. Ohne gespeicherten Aufgabenplan setzt der Browser sogar wieder die volle Dauer. Hinzu kommen der anfängliche Countdown und eine nur per Intervall heruntergezählte Browserzeit.

   Der Antwortendpunkt prüft keine Zeitgrenze: Im Versuch wurde eine neue Antwort 20 Minuten nach Beginn eines einminütigen Tests akzeptiert. Dies ist von einer erlaubten verspäteten Übertragung bereits bearbeiteter Antworten zu unterscheiden; diese Unterscheidung fehlt derzeit.

   Abhilfe: Eine verbindliche Zeitregel für Test und Wiederaufnahme festlegen und durchgängig anwenden. Falls Fehlerpausen gewollt sind, müssen sie auch serverseitig erfasst werden. Nachlieferungen benötigen eine definierte Regel.

7. **P1 – Bei Übertragungsfehlern kann die Wiederaufnahme Antworten falsch zuordnen. Aus Code abgeleitet.**

   Fundstelle: `src/Game.jsx:292`, `301`, `463`, `598`; `server/server.js:1188`.

   Laufende Schreibvorgänge prüfen keine HTTP-Fehler und besitzen keine Wiederholungswarteschlange. Geht beispielsweise Antwort 0 über beide Übertragungswege verloren, während Antwort 1 gespeichert wird, enthält der Server einen lückenhaften Antwortsatz. Beim Wiederaufnehmen verwirft die Oberfläche dessen gespeicherte Positionsnummern. Die Endabgabe nummeriert das verkürzte Array neu ab 0. Dadurch kann die ursprünglich an Position 1 gespeicherte Antwort zusätzlich an Position 0 angelegt werden und doppelt zählen.

   Geht bereits das erste Speichern des Aufgabenplans verloren, startet die Wiederaufnahme mit neu erzeugten Aufgaben und übernimmt gespeicherte Antworten nicht, weil deren Wiederherstellung vom vorhandenen Plan abhängt.

   Abhilfe: Stabile Aufgabenpositionen durchgehend erhalten, fehlgeschlagene Schreibvorgänge sichtbar machen und zuverlässig wiederholen. Den ersten Aufgabenplan bestätigen lassen, bevor dessen erfolgreiche Speicherung vorausgesetzt wird. Gezielt mit Verbindungsabbruch und anschließendem Neuladen prüfen.

8. **P2 – Nachgeladene Aufgaben fehlen nach einem Neuladen. Speichereigenschaft reproduziert, UI-Folge aus Code.**

   Fundstelle: `src/Game.jsx:185`, `513`, `808`, `859`; `server/server.js:924`.

   Anfangs werden 100 Aufgaben gespeichert. Zusätzliche Aufgaben werden nur lokal angehängt; folgende Fortschrittsmeldungen senden keinen erweiterten Plan. Außerdem verhindert `COALESCE(task_plan, ...)` auch bei einem explizit übermittelten längeren Plan die Aktualisierung. Im Versuch blieb der zuerst gespeicherte Plan unverändert. Nach mehr als 100 Aufgaben begrenzt die Wiederaufnahme die aktuelle Position daher wieder auf den alten Plan und kann eine bereits bearbeitete Aufgabe anzeigen.

   Abhilfe: Erweiterungen mit stabilen IDs dauerhaft speichern und die Position nur gegen den tatsächlich vollständigen Plan prüfen.

9. **P1 – Gleichzeitige Starts verwenden keine verlässlich zusammenhängende Transaktion. Aus Code abgeleitet, kein Lastfehler reproduziert.**

   Fundstelle: `server/server.js:751`, `762`, `887`, `895`; `server/database.js:12`.

   Raum-Erstellung und Schülerstart verwenden `getPool().query()` für `BEGIN`, Änderungen und `COMMIT`. `getPool()` liefert einen Verbindungspool, keinen reservierten Client. Damit ist bei parallelen Anfragen nicht sichergestellt, dass alle Schritte auf derselben Datenbankverbindung ausgeführt werden. Teiländerungen, falsch zugeordnete Transaktionen oder offene Transaktionen sind möglich. Gerade der gemeinsame Start einer Klasse ist ein relevanter Auslöser. Andere Abläufe, etwa die Abgabe, reservieren bereits korrekt eine Verbindung.

   Abhilfe: Für diese Abläufe ebenfalls einen Client reservieren, sämtliche Transaktionsschritte darauf ausführen und ihn im `finally` freigeben. Danach gleichzeitige Starts sowie Fehler zwischen den beiden Statusänderungen prüfen.

10. **P2 – Ein geschlossenes oder ausgefallenes Schülergerät verhindert den automatischen Abschluss. Aus Code abgeleitet.**

    Fundstelle: `server/server.js:949`, `1244`; `src/Game.jsx:605`, `611`.

    Die normale Abgabe wird vom geöffneten Browser ausgelöst. Schließt ein Schüler den Browser oder fällt das Gerät vor der Abgabe aus, bleibt sein Zustand `started`. Der Server besitzt für normale Schüler keinen zeitgesteuerten Abschluss; der Raum wartet weiter. Die Bots haben dagegen einen eigenen Abgabeablauf und verdecken diesen Unterschied in der automatischen Probe.

    Abhilfe: Einen ausdrücklich geregelten Abschluss abgebrochener Versuche vorsehen, etwa nach Ablauf der Zeit mit Übertragungsfrist oder durch die Lehrkraft. Gespeicherte Antworten erhalten und den Abbruch sichtbar kennzeichnen.

**Prüfungen und Grenzen**

- Sechs vorhandene Unit-Tests bestanden.
- Produktionsbuild bestanden. Der normale npm-Aufruf war wegen einer defekten lokalen npm-Verknüpfung nicht verwendbar; der direkte Aufruf des vorhandenen Buildwerkzeugs war erfolgreich.
- Vorhandene Integrationstests bestanden, einschließlich gleichzeitiger und verspäteter Abgaben, Wiederaufnahme, Proberaumtrennung und Berechtigungsprüfung der dafür vorgesehenen Endpunkte.
- Zusätzliche Prüfungen reproduzierten die oben beschriebenen Fälle zur bestehenden Sitzung, zum abgelaufenen Code, zur manipulierten und verspäteten Antwort, zur verlorenen Korrektur, zum unveränderlichen Aufgabenplan und zum unautorisierten Zustandsabruf.
- Automatischer Probedurchlauf mit zwei Bots bestanden, einschließlich einminütiger Bearbeitung, Serverneustart, Live-Antworten und Zurücksetzen während eines laufenden Versuchs.
- Nicht praktisch geprüft: reale Browserbedienung, iPad/SEB, Netzwerkausfall während der Oberfläche, Last einer vollständigen Klasse. Die vorhandene SEB-Prüfung bestätigt die Ablehnung eines normalen Browsers, nicht die erfolgreiche Bedienung auf einem echten SEB-Gerät.

Die bisherigen grünen Prüfungen decken überwiegend erfolgreiche Serverabläufe ab. Insbesondere das direkte Aufrufen von `/ready`, die von den Bots selbst ausgelöste Abgabe und die immer als vollständig angenommenen Antworten umgehen mehrere der problematischen Alltagssituationen.
