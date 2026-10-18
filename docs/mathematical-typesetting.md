# Prüfung des mathematischen Satzes

Stand: 15. Oktober 2026. Geprüft wurden die gemeinsame mathematische Eingabe sowie die Wurzelaufgaben einschließlich Hinweisen, Lösungswegen und Rückblicken. Dies ist keine Prüfung sämtlicher Mathematikdarstellungen anderer Übungstypen oder des PDF-Layouts.

## Maßstäbe

- Zahlen, Rechenzeichen und Variablen stehen aufrecht, entsprechend dem verwendeten Schulbuch und der ausdrücklichen Gestaltungsentscheidung des Nutzers. Dies weicht bewusst von den [NIST-Empfehlungen zu kursiven Variablen](https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-10-more-printing-and-using-symbols-and-numbers) ab.
- Exponenten gehören strukturell zum gesamten Basisausdruck. Ihre Platzierung muss dessen Höhe berücksichtigen. Unter Wurzeln ist eine kompaktere Anordnung üblich.
- Der Wurzelstrich überdeckt den gesamten Radikanden; zwischen dessen höchstem Zeichen und dem Strich bleibt Abstand.
- Klammern umfassen ihren Inhalt. Bei größerem Inhalt müssen sie entsprechend wachsen; ein äußerer Exponent darf dabei nicht auf der normalen Ziffernhöhe bleiben.
- Brüche benötigen Abstand zum Strich und eine Ausrichtung an der mathematischen Achse. Rechenzeichen erhalten ihrem Kontext entsprechende Abstände.

Diese Zusammenhänge beschreibt [MathML Core](https://www.w3.org/TR/mathml-core/) für Wurzeln, Brüche, Klammern, Operatoren und Skripte. Konkrete Abstände hängen auch von den Metriken der verwendeten Schrift ab. Werte wie „65 Prozent“ sind unsere Gestaltungsentscheidung, kein allgemeiner Normwert.

## Befunde und Änderungen

1. **Mehrstellige Exponenten:** Die allgemeine Eingabe stellte bisher nur die erste Ziffer hoch. Ganze Zifferngruppen werden nun als Exponent behandelt, auch wenn der Cursor zwischen den Ziffern steht.
2. **Schrift und Variablen:** Variablen werden als mathematische Zeichen ausgezeichnet, auf Wunsch aber aufrecht dargestellt. Eingabe und Wurzeldarstellung erben dieselbe Textschrift; normale Beschreibungstexte bleiben unverändert.
3. **Zahlen und Rechenzeichen:** Dezimalzahlen werden als Zahlen zusammengehalten. Das echte Minuszeichen wird als Operator erkannt.
4. **Platz für Exponenten:** Die bisherigen relativen Verschiebungen veränderten nur das sichtbare Bild. Die Anhebung wird jetzt über die vertikale Ausrichtung in die Zeilenberechnung einbezogen. Dadurch kann der Wurzelstrich auf die tatsächliche Höhe reagieren.
5. **Klammern und äußere Exponenten:** Die zuvor gewünschten größeren Klammern und die höhere Stellung der äußeren Exponenten bleiben erhalten. Die Basisausrichtung der Klammern wurde beibehalten.
6. **Bruchstriche:** Die Stärke skaliert nun mit der Schriftgröße, wie bereits der Wurzelstrich.

## Grenzen und Validierung

Die Wurzelaufgaben kombinieren HTML, CSS und ein SVG-Wurzelzeichen; die allgemeine Eingabe nutzt MathML. Die gemeinsamen Schrift- und Größenregeln vermindern Unterschiede, ersetzen aber keine vollständig schriftmetrische MathML-Satzengine. Insbesondere sind Klammergröße und Exponentenhöhe bei Wurzelaufgaben weiterhin bewusst gewählte Näherungen.

Zur Prüfung dient eine im Browser gerenderte Vergleichsseite mit 48, 24 und 16 Pixel großen Formeln: einfache und geklammerte Wurzeln, ein- und mehrstellige Exponenten, Brüche und Beträge. Automatisierte Tests prüfen zusätzlich die mathematischen Token, mehrstellige Hochzahlen und die unveränderte Darstellung von Beschreibungstexten. Ein interaktiver Mausklicktest ist davon nicht abgedeckt.
