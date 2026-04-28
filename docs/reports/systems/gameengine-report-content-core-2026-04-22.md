# Inhalt: Gameengine, Ablauf & Logik

Datum: 2026-04-22  
Rolle: Technical Writer (User-Focused)  
Status: Gruen

## Ziel

Dieses Dokument enthaelt die fertig formulierten Textinhalte fuer die Kapitel:

- Ueberblick ueber die Gameengine
- Spielablauf Schritt fuer Schritt
- Entscheidungslogik der Engine
- Outcome Engine
- Regel- und Validierungslogik

Die Texte sind fuer Anwender geschrieben und beschreiben nur die reale Systemlogik des aktuellen Projektstands.

## 1. Ueberblick ueber die Gameengine

Die Gameengine bildet einen einzelnen Spielzug als klaren, nachvollziehbaren Ablauf ab. Sie arbeitet datenbasiert: Die Grundlage sind vorgegebene Plays, Formationen, Personnel Packages, Spielsituationen und Regelprofile. Auf dieser Basis entscheidet das System, welcher Call auf Offense- und Defense-Seite am besten zur aktuellen Lage passt und welches Ergebnis daraus entsteht.

Im Kern besteht die Engine aus drei Teilen. Die Play Selection Engine waehlt den Spielzug fuer beide Seiten aus. Die Legality Engine prueft, ob die entstehende Pre-Snap-Struktur nach den aktiven Regeln ueberhaupt zulaessig ist. Die Outcome Engine loest das Duell zwischen Offense und Defense anschliessend in ein konkretes Ergebnis auf, zum Beispiel Raumgewinn, Sack, Incompletion, Explosive Play oder Turnover.

Wichtig fuer das Verstaendnis ist: Die Engine denkt nicht in freien, spontanen Football-Ideen, sondern in strukturierten Menues. Die Auswahl entsteht aus vorhandenen Plays, ihren Situationstags, den zugelassenen Formationen, dem Spielkontext und den erwarteten Staerken oder Risiken eines Calls. Dadurch bleibt das Verhalten nachvollziehbar und konsistent.

Die Engine unterstuetzt aktuell zwei Regelwelten: `NFL_PRO` und `COLLEGE`. Beide nutzen dieselbe Grundarchitektur, unterscheiden sich aber bei einzelnen Regelpunkten, zum Beispiel beim Clock-Verhalten nach First Downs und bei der erlaubten Tiefe fuer ineligible Spieler bei einem Passspielzug.

Der aktuelle Projektstand ist dabei klar: Die Gameplay-Engine ist als eigenes, bereits validiertes Modul vorhanden und laeuft in Tests, Kalibrierung und Simulationsbatches stabil. Sie ist aber noch nicht mit der separaten Saison-Matchsimulation des Projekts zusammengefuehrt. Fuer den Report ist deshalb wichtig, zwischen vorhandenem Gameplay-Kern und vollintegrierter Gesamtmatch-Logik zu unterscheiden.

## 2. Spielablauf Schritt fuer Schritt

### 1. Die Spielsituation wird gelesen

Jeder Spielzug beginnt mit einer konkreten Lage auf dem Feld. Dazu gehoeren unter anderem Down, Distance, Ballposition, Spielstand, verbleibende Zeit, Timeouts, Feldzone und Tempo. Diese Informationen bestimmen, welche Arten von Calls sinnvoll sind und welche weniger wahrscheinlich werden.

### 2. Offense und Defense erhalten ihr Auswahlmenue

Ausgangspunkt fuer beide Seiten sind die vorhandenen Playbooks und die aktive Play Library. Die Engine oeffnet damit kein komplett freies Suchfeld, sondern ein strukturiertes Menue aus passenden Plays und Play-Familien. Welche Menues ueberhaupt offenstehen, haengt von Situation, Ruleset, Formation, Personnel und den hinterlegten Gewichtungen ab.

### 3. Die Situation wird football-logisch eingeordnet

Die Engine uebersetzt die rohe Spielsituation in lesbare Football-Kontexte. Sie erkennt zum Beispiel, ob es sich um Early Down, Short Yardage, Passing Down, Red Zone, Goal to Go, Backed Up, Two Minute, Four Minute, Shot Window oder Four-Down-Territory handelt. Diese Einordnung ist wichtig, weil viele Plays nicht nur allgemein existieren, sondern gezielt fuer bestimmte Lagen gedacht sind.

### 4. Beide Seiten waehlen ihren Call

Offense und Defense waehlen ihre Plays nicht blind, sondern ueber eine gewichtete Entscheidung. Die Engine prueft, welche Plays zur Situation passen, welche im Playbook gewuenscht sind, welche ein gutes Gleichgewicht aus Sicherheit, Explosivitaet und Risiko mitbringen und welche zur erwarteten Reaktion der Gegenseite passen. So entsteht auf beiden Seiten jeweils ein konkreter Play Call.

### 5. Die Pre-Snap-Struktur wird auf Legalitaet geprueft

Sobald Offense- und Defense-Call feststehen, entsteht daraus eine gemeinsame Pre-Snap-Struktur. Diese Struktur wird vor der Aufloesung geprueft. Die Engine kontrolliert, ob die Spielerzahl stimmt, ob die Personnel-Verteilung zur Formation passt, ob die Offense legal auf der Line und im Backfield steht und ob Motion oder Shift regelkonform sind. Nur wenn diese Stufe sauber ist, geht der Spielzug in die normale Ergebnislogik.

### 6. Die Outcome Engine loest den Spielzug auf

Jetzt entscheidet die Engine, ob der Spielzug als Lauf oder Pass aufgeloest wird und welches Ergebnis daraus folgt. Bei klassischen Run- oder Pass-Familien ist die Richtung meist schon durch den Call vorgegeben. Bei RPOs wird die Richtung situativ bestimmt. Danach bewertet die Engine Druck, Run-Fit, Coverage-Stoerung, Ballverteilung und Explosive-Potenzial und erzeugt daraus ein Ergebnis.

### 7. Das Ergebnis veraendert die Spielsituation

Am Ende steht ein konkretes Event: zum Beispiel Run Stop, Run Success, Explosive Run, Pass Complete, Explosive Pass, Sack, Interception, Fumble oder ein Pre-Snap-Penalty-Fall. Daraus ergeben sich Raumgewinn, Erfolg oder Misserfolg, moeglicher Turnover, First Down, Touchdown und Clock Runoff. Diese Werte bilden die Grundlage fuer den naechsten Snap.

## 3. Entscheidungslogik der Engine

Die Selection Engine soll keine perfekte, allwissende Football-Intelligenz nachbilden. Ihr Ziel ist eine glaubwuerdige, strukturierte und coach-plausible Auswahl. Sie kombiniert dafuer mehrere Signale, statt nur auf einen einzigen Wert zu schauen.

### Playbooks geben den Rahmen vor

Die wichtigste Grundlage sind die Playbooks. Sie definieren, welche Menues in welcher Spielsituation grundsaetzlich geoeffnet werden. Die Engine beginnt deshalb nicht bei null, sondern bei einem vorgegebenen Katalog aus passenden Plays oder Play-Familien. Das sorgt dafuer, dass die Auswahl systematisch bleibt und nicht zufaellig zwischen fachlich unpassenden Calls springt.

### Die Spielsituation verschiebt die Gewichte

Danach bewertet die Engine, wie gut ein Play zur aktuellen Lage passt. Ein Call mit Red-Zone-Logik wird in der Red Zone aufgewertet. Ein Short-Yardage-Play gewinnt an Gewicht, wenn nur wenig Raum benoetigt wird. In klaren Passing Downs steigen andere Families nach oben als auf Early Downs. Dadurch veraendert sich nicht nur die Auswahl einzelner Plays, sondern auch die Family-Verteilung.

Diese Logik ist an mehreren Stellen sichtbar:

- In der Red Zone werden auf Offense-Seite vor allem kompaktere Run-, Quick- und Play-Action-Ideen bevorzugt.
- In Two-Minute-Lagen steigt der Wert von Quick Game, Dropback, Screen und Empty-Tempo.
- In langen Passing Downs verlieren klassische Run-Calls deutlich an Gewicht.
- In Shot Windows bekommen tiefer angelegte Angriffe bewusst mehr Raum.
- In Four-Minute- und Lead-Protect-Lagen werden sichere, clock-freundliche Optionen wichtiger.

### Offense und Defense denken gegeneinander

Die Engine trifft ihre Auswahl nicht nur aus Sicht einer Seite. Sie bildet auch eine Erwartung darueber, was die Gegenseite wahrscheinlich spielen wird. Erwartet die Offense viel Druck, gewinnen Pressure-Answers wie Quick Game, Bewegungspass, Screen oder bestimmte RPOs an Wert. Erwartet die Defense eher ein run-lastiges Menu, steigen Run-Fit-, Coverage- und Box-Calls.

Dadurch entsteht keine starre Einzelentscheidung, sondern ein Duell zweier Menues, die sich gegenseitig beeinflussen.

### Sicherheit, Explosivitaet und Risiko werden ausbalanciert

Jedes Play bringt nicht nur eine Richtung mit, sondern auch ein eigenes Profil. Manche Calls versprechen mehr sichere Effizienz, andere mehr Explosivitaet, wieder andere mehr Risiko. Die Engine verrechnet diese Eigenschaften in einer Gesamtbewertung. So kann ein konservativer Call trotz kleinerem Big-Play-Potenzial bevorzugt werden, wenn die Situation eher Sicherheit als Varianz verlangt.

### Spielstilprofile veraendern die Auswahl

Zusaetzlich arbeitet die Engine mit drei Grundhaltungen:

- konservativ
- balanced
- aggressiv

Diese Haltungen veraendern, wie stark Sicherheit, Risiko, Clock-Management, Four-Down-Denken oder Ueberraschungseffekt gewichtet werden. Die gleiche Spielsituation kann deshalb je nach Profil in ein anderes Menu kippen, ohne fachlich unplausibel zu werden.

### Selbstbeobachtung verhindert Monotonie

Die Engine merkt sich, was zuletzt oft gecallt wurde. Wenn ein Play, eine Variante oder eine ganze Family zu haeufig auftaucht, sinkt ihr Gewicht. Weniger benutzte Calls bekommen dagegen wieder Raum. Diese Self-Scout-Logik verhindert, dass die Auswahl auf Dauer in ein starres Lieblingsmenu faellt.

### Personnel-Fit kann zusaetzlich eingreifen

Wenn ein Personnel-Fit uebergeben wird, bewertet die Engine auch, wie gut ein Play zu einem bestimmten Paket oder zu einer Family passt. Dieser Effekt ist kein Ersatz fuer das Playbook, aber ein zusaetzlicher Feinschliff in der Auswahl.

Insgesamt gilt: Die Engine entscheidet nicht nach einem einzigen "besten" Play, sondern nach einem Zusammenspiel aus Kontext, Struktur, Risiko, Tendenz und erwarteter Gegenseite.

## 4. Outcome Engine

Die Outcome Engine beantwortet die Frage, was aus dem gewaehlten Duell tatsaechlich wird. Sie ist damit der Teil der Gameengine, der aus einer Football-Idee ein konkretes Spielergebnis macht.

### Zuerst wird der Spielpfad bestimmt

Bei den meisten Plays ist die Richtung klar. Run-Familien werden als Lauf aufgeloest, Pass-Familien als Pass. Eine besondere Rolle spielen RPOs. Dort entscheidet die Engine situativ, ob der Snap eher in einen Lauf oder einen Passzweig geht. Diese Abzweigung haengt von mehreren Faktoren ab, zum Beispiel von Box-Dichte, Leverage, Deckungsenge und den Qualitaeten des offensiven Entscheidungstraegers.

### Danach bewertet die Engine das Duell

Im zweiten Schritt vergleicht die Engine das Profil des Offensive-Calls mit dem Profil des Defensive-Calls. Dabei fliessen unter anderem Druck, Coverage-Wirkung, Run-Fit und der Charakter der gewaehlten Play-Familien ein. Das Ergebnis ist keine starre Ja/Nein-Entscheidung, sondern ein Wahrscheinlichkeitsraum fuer moegliche Ausgaenge.

### Passspielzuege koennen mehrere Arten von Ergebnissen erzeugen

Im Passspiel unterscheidet die Engine vor allem zwischen:

- Incompletion
- normalem Passerfolg
- explosivem Pass
- Sack
- Interception
- Fumble

Ob ein Pass sauber ankommt, unter Druck geraet, tiefer trifft oder im Negativergebnis endet, haengt vom Zusammenspiel aus Play-Familie, gegnerischer Struktur und den hinterlegten Matchup-Profilen ab.

### Laufspielzuege haben eine eigene Ergebnislogik

Im Laufspiel unterscheidet die Engine vor allem zwischen:

- Run Stop
- Run Success
- Explosive Run
- Fumble

Hier spielen vor allem Line-Push, Runner-Qualitaet, defensiver Run-Fit, Box-Praesenz und Tackling-Wirkung eine Rolle.

### Erfolg wird nach Down unterschiedlich bewertet

Die Engine bewertet einen Spielzug nicht nur nach brutten Yards, sondern auch nach Spielsituation. Auf fruehen Downs reicht ein Teil des benoetigten Raumgewinns oft schon fuer einen erfolgreichen Play. Auf spaeten Downs muss dagegen in der Regel die volle Distanz geschafft werden. Dadurch wirkt dieselbe Yardzahl je nach Down anders.

### First Down, Touchdown und Feldposition werden fortgeschrieben

Wenn ein Spielzug erfolgreich abgeschlossen wird, aktualisiert die Engine auch den Spielzustand. Dazu gehoeren neue Down-and-Distance-Werte, veraenderte Feldposition, Ballbesitzwechsel nach Turnover, Punktveraenderungen bei Touchdowns und die herunterlaufende Uhr.

### Illegale Pre-Snap-Strukturen gehen nicht in die normale Outcome-Logik

Wenn die Pre-Snap-Pruefung vorher scheitert, entsteht kein normales Football-Ergebnis. Stattdessen liefert die Engine einen Pre-Snap-Penalty-Fall. Das ist wichtig, weil dadurch illegale Snapshots nicht heimlich wie regulaere Spielzuege behandelt werden.

### Optional kann der Wert eines Plays eingeordnet werden

Die Engine kann ein Ergebnis zusaetzlich noch als Zustandsveraenderung bewerten. Dann geht es nicht nur um Yards oder Erfolg, sondern auch darum, wie sich die Spielsituation in Richtung erwarteter Punkte oder Siegchance verschiebt. Diese Bewertung ist vorhanden, aber nicht der Kern der eigentlichen Snap-Aufloesung.

## 5. Regel- und Validierungslogik

Die Validierungslogik arbeitet auf zwei Ebenen. Zuerst wird die Play Library selbst geprueft. Danach wird jeder konkrete Snap zur Laufzeit auf Legalitaet kontrolliert.

### Die Library wird vor der Nutzung auf Konsistenz geprueft

Bevor ein Play ueberhaupt sinnvoll in die Engine gelangen kann, muss seine Definition in sich stimmen. Geprueft wird dabei unter anderem:

- ob alle Pflichtbestandteile vorhanden sind
- ob Familie und Struktur zusammenpassen
- ob Trigger, Reads, Assignments, Counter und Audibles sauber referenziert sind
- ob Metriken in einem gueltigen Bereich liegen
- ob Rulesets, Metadaten und Legality Templates zusammenpassen
- ob die hinterlegte Pre-Snap-Struktur grundsaetzlich legal ist

Diese Stufe ist wichtig, weil sie verhindert, dass formal unvollstaendige oder widerspruechliche Plays erst spaet in der Laufzeit Probleme erzeugen.

### Die Legality Engine prueft den Snap vor dem Ergebnis

Sobald ein konkreter Offense- und Defense-Call zusammenkommen, kontrolliert die Engine die entstehende Pre-Snap-Struktur. Das umfasst mehrere Gruppen von Regeln.

#### Spielerzahl und Personnel

Die Engine prueft, ob beide Seiten mit der richtigen Zahl an Spielern auf dem Feld stehen. Ausserdem kontrolliert sie, ob die tatsaechlich ausgerichteten Spieler zur ausgewaehlten Personnel-Struktur passen. Damit werden falsche Paketkombinationen sichtbar, auch wenn eine Formation auf den ersten Blick plausibel wirkt.

#### Offensive Struktur

Auf Offense-Seite wird geprueft:

- ob genug Spieler auf der Line stehen
- ob nicht zu viele Spieler im Backfield stehen
- ob genug eligible Receiver vorhanden sind
- ob die Enden der Line regelkonform besetzt sind
- ob Interior-Spieler korrekt ineligible bleiben

Damit stellt die Engine sicher, dass aus Formation und Personnel auch wirklich ein legaler Football-Snap entsteht.

#### Motion und Shift

Die Engine prueft ausserdem:

- wie viele Spieler beim Snap in Motion sind
- ob ein Spieler in Motion illegal auf der Line steht
- ob Motion unerlaubt Richtung Line laeuft
- ob Motion aus einer korrekt gesetzten Formation gestartet wurde
- ob ein Shift lang genug gesetzt war, bevor der Ball gesnappt wird

Diese Regeln greifen je nach aktivem Ruleset, folgen aber derselben Grundlogik: Erst eine saubere, gesetzte Struktur darf zum Snap fuehren.

#### Ineligible Downfield

Fuer Passspielzuege kann die Engine zusaetzlich pruefen, ob ineligible Spieler zu weit downfield geraten sind. Auch hier beruecksichtigt sie den aktiven Regeltyp. Die erlaubte Tiefe ist im College groesser als im NFL-Profil.

### Was bei Regelverstoessen passiert

Wenn die Struktur nicht legal ist, wird das nicht ignoriert oder still korrigiert. Die Engine markiert den Snap als illegal. In der Outcome-Aufloesung fuehrt das zu einem Pre-Snap-Penalty-Fall statt zu einem regulaeren Spielzug. Dadurch bleibt die Regelwirkung fuer Anwender nachvollziehbar und die Simulation sauber.

### Warum diese Stufe fachlich wichtig ist

Die Validierungslogik ist nicht nur eine technische Schutzschicht. Sie sorgt dafuer, dass die Engine football-logisch bleibt. Ohne diese Ebene koennten fachlich unpassende Pakete, fehlerhafte Formationen oder illegale Motion-Muster in die normale Simulation durchrutschen und dort unrealistische Ergebnisse erzeugen.

## Statuspruefung

- Verstaendlich? `Ja`
- Fachlich korrekt? `Ja`
- Vollstaendig? `Ja`

## Abschlussstatus

Status: Gruen

PROMPT 4 kann gestartet werden.
