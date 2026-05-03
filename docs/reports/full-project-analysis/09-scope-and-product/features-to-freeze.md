# Features To Freeze

## Ziel

Liste der Features, die vorerst nicht weiter ausgebaut werden sollten, weil sie Komplexitaet erzeugen, ohne den aktuellen Multiplayer-Core-Loop direkt zu verbessern.

## Freeze-Regel

Ein Feature wird eingefroren, wenn mindestens zwei Bedingungen zutreffen:

- nicht zwingend fuer Join -> Ready -> Sim -> Results.
- braucht neue persistierte Daten oder komplexe Sync-Regeln.
- erzeugt neue Admin-/Rules-/Seed-Komplexitaet.
- wirkt fuer Spieler unfertig, wenn nur teilweise vorhanden.
- erhoeht Testaufwand deutlich.

## Eingefrorene Multiplayer-Features

### Contracts/Cap

Status:
- Coming Soon vorhanden.

Warum einfrieren:
- Braucht Vertragsmodell, Cap Space, Dead Cap, Free Agency, Cut/Sign-Regeln und UI.
- Hohe Balance- und Datenkonsistenzkosten.
- Kein Muss fuer erste simulierte Multiplayer-Woche.

Erlaubt:
- Coming Soon Screen.
- Read-only Hinweis, dass Roster/Depth Chart aktuell relevant sind.

Nicht erlaubt im MVP:
- Cap Moves.
- Vertragsverlaengerungen.
- Cuts mit Cap-Auswirkungen.

### Development

Status:
- Coming Soon vorhanden.

Warum einfrieren:
- Player XP/Progression muss fair, deterministisch und week-basiert sein.
- Ohne saubere Trainings-/Simulationsintegration entsteht falsches Erwartungsmanagement.

Erlaubt:
- Hinweis, dass Week-Simulation sichere Standardwerte nutzt.

Nicht erlaubt im MVP:
- Trainingsplaene.
- Player XP-Verteilung.
- Staff Progression.

### Trade Board

Status:
- Coming Soon vorhanden.

Warum einfrieren:
- Multiplayer Trades sind missbrauchs- und konsistenzkritisch.
- Braucht Offer Lifecycle, Confirmations, Commissioner/Deadline-Regeln, Audit und Roster/Cap-Validierung.

Erlaubt:
- Coming Soon.

Nicht erlaubt im MVP:
- Spielertrades.
- Pick-Trades.
- CPU-Trade-KI.

### Inbox

Status:
- Coming Soon vorhanden.

Warum einfrieren:
- Nachrichten/Notifications sind hilfreich, aber kein Core Loop.
- Wuerde zusaetzliche Event- und Read-State-Logik erfordern.

Erlaubt:
- Dashboard zeigt wichtige Statusinformationen.

Nicht erlaubt im MVP:
- Ligaweite Nachrichtenzentrale.
- Commissioner Messages.
- Actionable Inbox Items.

### Finance

Status:
- Coming Soon vorhanden.

Warum einfrieren:
- Ticketpreise, Merch, Owner-Finanzen und Budgets sind nicht noetig fuer Woche 1-Loop.
- Kann Spieler vom sportlichen MVP ablenken.

Erlaubt:
- Coming Soon.

Nicht erlaubt im MVP:
- Preise aendern.
- Budgetentscheidungen.
- Revenue-/Expense-Simulation.

## Eingefrorene Admin-Erweiterungen

### Vollstaendige GM-Verwaltung

Warum einfrieren:
- Entfernen/Verschieben von Usern kann echte Daten zerstoeren.
- Native Prompts und Teil-Tools wirken noch nicht produktreif.

Erlaubt:
- Diagnose.
- Nicht-destruktive Debug-Anzeige.
- Explizite, gut geguardete Repair-Scripts fuer Staging.

Nicht erlaubt im MVP:
- Schnelle destructive Admin-Massnahmen ohne Review.

### Woche abschliessen als eigene Semantik

Warum einfrieren:
- Wenn es denselben Pfad wie `simulateWeek` nutzt, ist die Semantik irrefuehrend.

Erlaubt:
- Ein klarer Button: `Woche simulieren`, wenn Simulation der echte Vorgang ist.

Nicht erlaubt im MVP:
- Zwei unterschiedlich benannte Buttons fuer denselben Write-Pfad.

## Eingefrorene Offline-Erweiterungen

Diese Analyse fokussiert Multiplayer, aber fuer Scope-Kontrolle sollten auch Offline-Nebenfeatures begrenzt bleiben:

- Finance Trades.
- Development Staff.
- Development Training, soweit nicht fuer bestehenden Offline-Loop zwingend.
- Advanced Draft Scouting.

## Freeze-Kommunikation im UI

Gute Copy:

- "Nicht Teil des aktuellen Multiplayer MVP."
- "Aktuell stehen Roster, Depth Chart, Spielablauf und Ergebnisse im Fokus."
- "Dieses Feature kommt spaeter, wenn die Liga-Progression stabil ist."

Schlechte Copy:

- "Bald verfuegbar" ohne Kontext.
- Technische Hinweise wie "Firestore Modell fehlt".
- Buttons, die klickbar wirken, aber nur nichts tun.

## Wann Freeze aufheben?

Erst wenn:

1. Join/Rejoin in Staging gruen ist.
2. Ready-State und Week Simulation live verifiziert sind.
3. Results/Standings nach Reload stabil sind.
4. E2E fuer Multiplayer Core Loop gruen ist.
5. Feature hat ein eigenes Datenmodell, Rules-Konzept und Tests.

## Fazit

Die eingefrorenen Features sind nicht schlecht. Sie sind nur zu teuer fuer den aktuellen Engpass. Der Engpass ist nicht fehlende Feature-Flaeche, sondern ein klarer, vertrauenswuerdiger Multiplayer-Loop.
