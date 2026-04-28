# Playtest Report - Neuer Nutzer

Stand: 27. April 2026

Gesamtstatus: Gelb

Playtest bestanden: Ja, eingeschraenkt.

Begruendung: Der Kern als Football-Manager funktioniert: Dashboard, Week Loop, Game Preview, Match Start, Live Screen, Match Report und Rueckkehr zur naechsten Woche sind technisch stabil und fuer neue Nutzer grundsaetzlich verstaendlich. Das Spiel fuehlt sich bereits wie ein Manager-Command-Center an. Der emotionale Sog bleibt aber noch mittel, weil Live Simulation und Match Report bei Detaildaten oft eher strukturiert erklaeren als echte Spielspannung erzeugen. Mehrere Entscheidungen zeigen gute Trade-offs, aber nicht alle Konsequenzen sind schon tief genug erlebbar.

## Executive Summary

- Technischer Kernflow: Gruen
- Neue-Nutzer-Fuehrung: Gruen/Gelb
- Manager-Entscheidungen: Gelb
- Spielspannung: Gelb
- Datenvertrauen: Gelb
- Gesamturteil: Gelb

Wichtigste Erkenntnisse:

1. Das Dashboard ist inzwischen ein klares Command Center mit sichtbarer Next Best Action.
2. Der Game Loop ist E2E validiert und ohne Sackgasse durchspielbar.
3. Depth Chart, Player Profile, Contracts und Trade Board bilden ein sinnvolles Entscheidungsnetz.
4. Die Live Simulation ist noch der schwachste Erlebnisbereich, weil sie eher verwaltet als dramatisiert.
5. Chemistry und X-Factor sollten aktuell nicht priorisiert werden; wichtiger sind Konsequenz, Datenklarheit und Entscheidungsfeedback.

## Getestete Flows

| Flow | Ergebnis | Evidenz |
|---|---:|---|
| Dashboard -> Game Preview -> Live -> Report -> Dashboard -> naechste Woche | Gruen | `npm run test:e2e:week-loop` auf `E2E_PORT=3113`: 1 Test gruen |
| First 10 Minutes neuer Nutzer | Gruen | `npx playwright test e2e/first-10-minutes.spec.ts` auf `E2E_PORT=3115`: 1 Test gruen |
| Roster -> Depth Chart -> Reorder -> Feedback -> Roster | Gruen | `npm run test:e2e:depth-chart` auf `E2E_PORT=3114`: 1 Test gruen |
| Player Profile -> Development / Depth Chart / Trade Board | Gelb | Navigation vorhanden, kein dedizierter E2E-Smoke |
| Contracts / Cap -> Player Profile / Development / Roster | Gelb | Modelltests gruen, kein dedizierter E2E-Smoke |
| Trade Board Auswahl / Balance Hinweis | Gelb | Modelltests gruen, kein dedizierter E2E-Smoke |

## Bewertungsmatrix

| Bereich | Status | Bewertung |
|---|---:|---|
| Dashboard | Gruen | Klare Next Best Action, Week Loop sichtbar, Command-Center-Gefuehl stark. |
| Game Preview | Gruen | Teams, Kontext, Readiness und Startaktion sind verstaendlich. |
| Live Simulation | Gelb | Lesbar und stabil, aber noch zu wenig Spannung; teilweise manuelle Finalisierung und Drive-Level statt echter Play-Dramaturgie. |
| Match Report | Gelb | Gute Struktur, aber bei fehlenden Detaildaten wirken Konsequenzen teils abgeleitet statt wirklich verdient. |
| Game Loop | Gruen | E2E gruen, keine Sackgasse, Rueckkehr zur naechsten Woche klar. |
| Roster / Team Management | Gruen | Gute Uebersicht, Filter, Quick Info und naechste Aktionen. |
| Depth Chart | Gruen | Entscheidung ist sichtbar, interaktiv und erzeugt Feedback. |
| Player Profile | Gruen | Schnelle Entscheidungsschicht mit Rolle, Risiko, Vergleich und Trade-offs. |
| Player Development | Gelb | Gute Signale aus vorhandenen Daten, aber noch wenig echtes Zeitgefuehl ueber mehrere Wochen. |
| Contracts / Cap | Gruen | Kosten, Laufzeit, Risiko und Decision Impact sind klar. |
| Trade Board | Gelb | Gute Vorbereitung und Balance-Hinweis, aber bewusst keine Ausfuehrung und kein E2E-Smoke. |
| Chemistry | Gelb | Nett, aber aktuell kein Kernbeduerfnis fuer die naechste Phase. |
| X-Factor | Gelb | Thematisch passend, aber weniger wichtig als bessere Konsequenzen im Core Loop. |

## First Impression

Status: Gruen

Ein neuer Nutzer versteht auf dem Dashboard grundsaetzlich, dass er als GM eine Woche vorbereitet und dann ein Spiel steuert. `GM Office`, `Next Best Action`, Week Status und Quick Actions machen den ersten Schritt sichtbar. Der E2E-Test `First 10 Minutes` bestaetigt, dass ein Nutzer vom Dashboard bis zur ersten Auswertung gefuehrt werden kann.

Restrisiko: Die App ist informationsdicht. Fuer komplett unerfahrene Football-Nutzer koennen Begriffe wie `Depth Chart`, `Cap Hit`, `OVR/POT` oder `Scheme Fit` schnell viel sein. Die UI erklaert Entscheidungen besser als einzelne Fachbegriffe.

## Game Loop

Status: Gruen

Der Ablauf funktioniert:

1. Dashboard zeigt den naechsten Schritt.
2. Week vorbereiten setzt den Zustand auf `READY`.
3. Game Preview erklaert Matchup und Startbereitschaft.
4. Match starten fuehrt in Live Simulation.
5. Spiel abschliessen fuehrt in Match Report.
6. Dashboard zeigt Post-Game und naechste Woche.

Staerke: Keine Sackgasse, klare Primaeraktionen, E2E gruen.

Schwaeche: Die Live-Phase ist noch mehr Kontrollpanel als Erlebnis. Der Nutzer versteht, was passiert, aber die Spannung eines laufenden Spiels entsteht nur begrenzt.

## Manager-Entscheidungen

Status: Gelb

### Depth Chart

Status: Gruen

- Entscheidung: Wer startet, wer ist Backup?
- Trade-off: Staerkerer Starter vs Risiko, offene Position, Rollenverschiebung.
- Konsequenz: Feedback, Dashboard-/Preview-/Report-Bezug und minimaler Engine-Impact sind vorhanden.
- Playtest-Eindruck: Das ist aktuell die beste Kernentscheidung.

### Player Profile

Status: Gruen

- Entscheidung: Starten, benchen, entwickeln oder als Risiko sehen?
- Trade-off: Jetzt stark vs langfristig besser, Starterrolle vs Fatigue, Entwicklung vs Leistung.
- Playtest-Eindruck: Sehr hilfreich, weil die wichtigste Aussage oben steht.

### Player Development

Status: Gelb

- Entscheidung: Wen foerdere ich, wer braucht Spielzeit?
- Trade-off: Starter-Snaps beschleunigen Entwicklung, erhoehen aber Belastung.
- Schwachpunkt: Entwicklung wirkt eher wie aktuelle Interpretation, noch nicht wie eine lebendige Saisonhistorie.

### Contracts / Cap

Status: Gruen

- Entscheidung: Kann ich mir den Spieler leisten, behalten oder ersetzen?
- Trade-off: Leistung vs Kosten vs Laufzeit.
- Playtest-Eindruck: Stark, weil `Teuer fuer Leistung`, `Value Contract` und `Bald auslaufend` sofort lesbar sind.

### Trade Board

Status: Gelb

- Entscheidung: Wen gebe ich ab, wen frage ich an?
- Trade-off: Value, Cap Delta, Team Need, Upside.
- Schwachpunkt: Weil keine echte Trade-Ausfuehrung existiert, bleibt es eine Planungsflaeche. Das ist korrekt fuer den Scope, aber spielerisch noch kein voller Loop.

## Spielgefuehl

Status: Gelb

Was funktioniert:

- Es fuehlt sich klar nach Manager-Spiel an.
- Ratings, Rollen, Cap, Development und Depth Chart erzeugen echte GM-Gedanken.
- Der Wunsch, noch eine Woche weiterzuspielen, entsteht vor allem nach Depth-Chart- oder Contract-Entscheidungen.

Was noch fehlt:

- Mehr Drama im Live Screen.
- Mehr echte Konsequenz im Report.
- Mehr wiederkehrende Ziele pro Woche, die nicht nur Status, sondern Spannung erzeugen.
- Weniger technische Fallback-Sprache in nutzernahen Bereichen.

## Frustration

Status: Gelb

Gefundene Reibung:

1. Fachbegriffe sind stark, aber teilweise nicht ausreichend eingeordnet.
2. Live/Report koennen bei fehlenden Daten wie Platzhalteranalyse wirken.
3. Team-Subnavigation ist breit und kann neue Nutzer ueberfordern.
4. Trade Board hat gute Vorbereitung, aber keine Aktion; das muss weiterhin klar kommuniziert werden.
5. Mobile bleibt ein Risiko, weil Navigation und Content-Dichte hoch sind.

Keine harten Blocker gefunden:

- Kein getesteter Kernflow endet in einer Sackgasse.
- E2E Week Loop, Depth Chart und First 10 Minutes sind gruen.
- Build, Lint und relevante Modelltests sind gruen.

## Feature-Bedarf

### Braucht es Team Chemistry jetzt?

Nein, nicht als naechstes grosses System. Chemistry ist thematisch gut, aber aktuell waere mehr Tiefe im Core Loop wertvoller. Chemistry sollte erst weitergebaut werden, wenn sie konkrete Entscheidungen in Depth Chart, Development oder Match Readiness beeinflusst.

### Braucht es X-Factor jetzt?

Nein, nicht priorisiert. X-Factor kann spaeter Starspieler emotional aufladen. Aktuell ist wichtiger, dass normale Entscheidungen wie Starterwahl, Cap-Risiko und Development im Spielverlauf spuerbarer werden.

### Was fehlt Wichtigeres?

- Bessere Live-Spiel-Dramaturgie.
- Klarere Post-Game-Konsequenzen.
- Dedizierte E2E-Smokes fuer Contracts und Trade Board.
- Mehr echte Read-Model-Daten im Report.
- Weniger technische Labels fuer Fallbacks.

### Welche Systeme sollten nicht gebaut werden?

- Keine komplexe Trade AI, bevor der Trade Board UI-Loop validiert ist.
- Keine tiefe Chemistry-Simulation, bevor Chemistry eine klare Entscheidung veraendert.
- Keine weiteren Spezialfaehigkeits-Screens, bevor Match Consequences staerker sind.
- Keine grosse Play-Calling-Komplexitaet, solange Live Feedback und Report-Konsequenzen noch mittel sind.

## Groesste Staerken

1. Dashboard fuehrt als Command Center.
2. Game Loop ist technisch und navigativ stabil.
3. Depth Chart macht Entscheidung sichtbar und spuerbar.
4. Player Profile reduziert Komplexitaet auf eine klare Empfehlung.
5. Contracts/Cap bringt echte Manager-Spannung: Leistung kostet etwas.

## Groesste Schwaechen

1. Live Simulation ist noch nicht spannend genug.
2. Match Report hat zu oft abgeleitete oder fallback-nahe Konsequenzen.
3. Trade Board ist nur Vorbereitung, noch kein abgeschlossener Entscheidungsloop.
4. Development braucht mehr Zeitverlauf, um langfristige Motivation zu tragen.
5. Mobile und technische Fallback-Sprache koennen Vertrauen schwächen.

## Langweilige Stellen

- Live Screen, wenn keine echten Play-by-Play-Details vorhanden sind.
- Report-Abschnitte mit generischen Team-Impact-Aussagen.
- Development, wenn Trend und Progress keine veraenderte Woche sichtbar machen.

## Ueberkomplexe Stellen

- Team-Subnavigation mit vielen gleichwertigen Tabs.
- Player Profile kann viel Information bieten; die Top Decision Section rettet das, aber darunter bleibt es dicht.
- Roster plus Contracts plus Cap plus Trade Board koennen ohne klare Aufgabe wie parallele Systeme wirken.

## Fehlende Konsequenzen

- Trade Board erzeugt noch keine gespeicherte Trade-Idee oder Ergebnisreaktion.
- Development zeigt Logik, aber noch keinen starken Wochenvergleich.
- Live Simulation erklaert nicht immer, welche konkrete Managerentscheidung gerade relevant ist.
- Match Report ist vorsichtig korrekt, aber dadurch manchmal weniger emotional.

## Konkrete Verbesserungsvorschlaege

1. Live Simulation staerker als Storyline praesentieren: kritische Drives, Momentum, Entscheidungskontext.
2. Match Report mit `Was bedeutet das fuer naechste Woche?` verdichten.
3. Contracts und Trade Board mit jeweils einem Playwright-Smoke absichern.
4. Development als Wochenvergleich erweitern: letzter Stand, aktuelle Veraenderung, Ursache.
5. Team-Subnavigation priorisieren: Core zuerst, sekundäre Systeme visuell zuruecknehmen.

## Testresultate

| Test | Ergebnis |
|---|---:|
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| Relevante Vitest-Suites fuer Dashboard, Match, Roster, Depth Chart, Player, Development, Contracts, Trades | Gruen, 12 Dateien, 120 Tests |
| `E2E_PORT=3113 npm run test:e2e:week-loop` | Gruen, 1 Test |
| `E2E_PORT=3114 npm run test:e2e:depth-chart` | Gruen, 1 Test |
| `E2E_PORT=3115 npx playwright test e2e/first-10-minutes.spec.ts` | Gruen, 1 Test |

Hinweise:

- Erster Sandbox-Lauf von `npm run test:e2e:week-loop` scheiterte vor Assertions an `tsx` IPC-Rechten. Der eskalierte Lauf war gruen.
- Ein Lauf auf Port 3100 wurde durch einen bereits belegten Port blockiert. Wiederholung auf freien Ports war stabil.
- Dedizierte E2E-Smokes fuer Contracts und Trade Board sind nicht vorhanden.

## Naechste 5 Tasks

### 1. Live Simulation Emotionaler Machen

Ziel: Der Nutzer soll waehrend des Spiels Spannung und Entscheidungskontext erleben.

Warum jetzt: Der Game Loop funktioniert technisch; die Live-Phase ist der groesste Erlebnishebel.

Scope: Bestehende Daten besser darstellen, keine neue Engine. Kritische Drives, Momentum-Text, Managerentscheidung-Bezug.

### 2. Match Report Konsequenzen Schaerfen

Ziel: Nach dem Spiel klar sehen: Was hat funktioniert, was kostet mich das, was mache ich naechste Woche?

Warum jetzt: Der Report entscheidet, ob Nutzer noch eine Woche spielen wollen.

Scope: Texte, Priorisierung, vorhandene Stats/Lineup/Contract/Development-Signale; keine neue Berechnungsschicht.

### 3. Contracts- und Trade-Board-E2E-Smokes Ergaenzen

Ziel: Finanz- und Trade-Entscheidungen als stabile GUI-Flows absichern.

Warum jetzt: Beide Screens sind entscheidungsrelevant, aber bisher nur modellseitig abgesichert.

Scope: Playwright-Smokes fuer Roster -> Contracts -> Player Profile und Roster/Profile -> Trade Board -> Auswahl -> Rueckweg.

### 4. Development Wochenvergleich Einfuehren

Ziel: Entwicklung soll sich wie Fortschritt ueber Zeit anfuehlen, nicht nur wie Statusanalyse.

Warum jetzt: Langfristige Motivation braucht sichtbare Veraenderung.

Scope: Vorhandene History-/Rating-Daten nutzen, einfache Vergleichszeile; keine neue Development Engine.

### 5. Core Navigation Priorisieren

Ziel: Neue Nutzer schneller zu Roster, Depth Chart, Game Flow, Contracts und Development fuehren.

Warum jetzt: Zu viele gleichwertige Team-Systeme machen die naechste Entscheidung schwerer.

Scope: Labels, Gruppierung, visuelle Gewichtung bestehender Navigation; keine neuen Screens.

## Endentscheidung

Playtest bestanden: Ja, eingeschraenkt.

Das Spiel ist als Manager-Erlebnis erkennbar und spielbar. Der Kern macht Sinn, die technische Stabilitaet ist fuer die geprueften Flows gut, und die wichtigsten Entscheidungen sind verstaendlich. Der Status bleibt Gelb, weil Spielspannung und Konsequenz noch nicht stark genug sind, um den Loop dauerhaft zu tragen.

Gesamtstatus: Gelb
