# Phase 3 Progress

## Ausgangspunkt

Abgeschlossenes Work Package:

- **WP-01 - User-Team-Linking und Join/Rejoin stabilisieren**

Geschlossene Findings:

- N033
- N034
- N035
- N036
- N037
- N038
- N085

Davon Core-Loop-Blocker:

- N033
- N034
- N035
- N036
- N038
- N085

## Fortschritt in Prozent

| Messpunkt | Fortschritt |
| --- | ---: |
| Alle Work Packages | 1 / 12 = **8%** |
| Minimaler spielbarer Plan | 1 / 6 = **17%** |
| Core-Loop-Blocker Findings | 6 / 20 = **30%** |
| WP-01 Findings | 7 / 7 = **100%** |

**Produktfortschritt nach Core-Loop-Blockern: 30%**

## Wie hat sich der Core Loop verbessert?

Der erste Core-Loop-Schritt ist deutlich robuster geworden:

```text
Lobby -> Draft -> Ready -> Simulation -> Ergebnis
```

Vor WP-01 konnte ein User schon in der Lobby oder beim Rejoin scheitern, weil Membership, globaler Mirror, Team-Zuordnung und lokale League-Referenz auseinanderlaufen konnten.

Nach WP-01 gilt:

- Join/Rejoin repariert fehlende oder veraltete Membership-Mirror-Daten, wenn die Zuordnung eindeutig ist.
- Ein bestehender User kann wieder konsistenter in seine Liga und sein Team geladen werden.
- Team Assignment bleibt an den transaktionalen Join-Pfad gekoppelt.
- Ungueltige lokale Liga-Daten werden im Multiplayer-E2E behandelt.
- Der Multiplayer-Flow bis Dashboard/Ready wurde regressionsgetestet.

Das bedeutet: Der Spieler kommt verlaesslicher in den Multiplayer-Kontext. Der Core Loop startet stabiler.

## Wie viele Blocker sind noch offen?

| Kategorie | Anzahl |
| --- | ---: |
| Core-Loop-Blocker insgesamt | 20 |
| geschlossen | 6 |
| offen | **14** |

Offene Core-Loop-Blocker betreffen vor allem:

- Draft-State und parallele Picks
- Ready-State und Simulation-Lock
- Week-Simulation, Schedule, Teams, Results und Standings
- zentrale Status-Normalisierung
- No-Team-/No-Roster-Fallbacks
- automatische Draft-Navigation
- Multiplayer-Simulation-Adapter

## Ist das Spiel naeher an spielbar?

**Ja, aber noch nicht spielbar im harten MVP-Sinn.**

WP-01 beseitigt einen sehr fruehen Blocker: Ein User kann besser in eine Liga und zu seinem Team gelangen. Das ist notwendig, aber noch nicht ausreichend.

Das Spiel ist naeher an spielbar, weil:

- der Lobby-/Join-Schritt nicht mehr der groesste direkte Einstiegskiller ist
- Team-Zuordnung und Membership-Mirror robuster sind
- Regressionstests fuer Multiplayer, Draft und Week Loop aktuell gruen sind

Es ist noch nicht voll spielbar, weil:

- Draft-State noch nicht als abgeschlossenes robustes Work Package gilt
- Ready-State noch offene Race-/Anzeige-Risiken hat
- Week-Simulation noch atomar/idempotent abgesichert werden muss
- Results/Standings/currentWeek noch unter WP-03/WP-02 fallen
- ein kompletter authentifizierter End-to-End-Core-Loop noch nicht als dauerhaftes Release-Gate etabliert ist

## Neue Priorisierung der Work Packages

### Prioritaet 1: WP-04 - Draft State und Pick-Transaktionen haerten

Grund:

- Nach stabilem Join ist Draft der naechste Core-Loop-Schritt.
- Ohne robusten Draft entstehen keine verlaesslichen Roster.
- N048 und N086 bleiben offene Impact-5-Blocker.

Ziel:

- Draft-Picks transaktional/idempotent absichern
- doppelte Picks verhindern
- Draft-Finalisierung und Roster-Aufbau konsistent halten
- Auto-Draftscreen/Navigation dauerhaft gegen Regression testen

### Prioritaet 2: WP-05 - Ready-State konsistent machen

Grund:

- Ready ist der direkte Uebergang von Teamvorbereitung zu Simulation.
- N039 und N093 bleiben offene Core-Loop-Blocker.
- Ein widerspruechlicher Ready-State erzeugt sofort UX-Verwirrung.

Ziel:

- Ready setzen, anzeigen und auswerten aus einer klaren Quelle ableiten
- Ready-Aenderungen waehrend Simulation blockieren oder versionieren
- GM- und Admin-Sicht konsistent machen

### Prioritaet 3: WP-03 - Week Simulation atomar und idempotent absichern

Grund:

- Simulation und Ergebnis sind der eigentliche Fortschritt im Spiel.
- N068, N069, N087, N090 und N091 sind offene Impact-5-Blocker.

Ziel:

- Simulation nur mit gueltigem Schedule und gueltigen Teams erlauben
- parallele oder doppelte Simulation verhindern
- Results, Standings und currentWeek atomar speichern
- Reload nach Simulation absichern

### Prioritaet 4: WP-02 - Multiplayer State Machine und Status-Normalisierung definieren

Grund:

- Viele offene Blocker entstehen aus parallelen Statusfeldern.
- WP-02 sollte spaetestens nach den naechsten konkreten Core-Loop-Fixes die Statuslogik vereinheitlichen.

Ziel:

- kanonische Zustandsableitung fuer Lobby, Draft, Ready, Simulation und Ergebnis
- UI-Gates und Service-Checks aus derselben Logik ableiten

### Prioritaet 5: WP-06 - Team-/Roster-Fallbacks und League Load Guards stabilisieren

Grund:

- Reload, Direktaufrufe und fehlende Daten duerfen nicht in kaputten Seiten enden.
- WP-01 hat Join/Rejoin verbessert, aber No-Team-/No-Roster-Zustaende bleiben offen.

Ziel:

- Core-Loop-Seiten laden stabil oder zeigen klare Fallbacks
- Roster/Depth Chart/Team Overview bei fehlenden Daten nicht brechen

### Prioritaet 6: WP-08 - Kritische E2E-/Smoke-Release-Gates ergaenzen

Grund:

- Nach den Core-Loop-Fixes muss der komplette Pfad reproduzierbar getestet werden.
- Aktuell gibt es noch Umgebungsfragilitaet bei E2E-Skripten.

Ziel:

- Join/Rejoin -> Draft -> Ready -> Simulation -> Ergebnis als Smoke-Gate absichern
- Staging/Auth/Admin-Smoke als Release-Signal stabilisieren

## Zurueckgestellt

Diese WPs bleiben wichtig, aber nicht direkt der naechste Spielbarkeitshebel:

| WP | Grund fuer spaeter |
| --- | --- |
| WP-07 Admin-/Simulation-Flow trennen | wichtig, aber nach atomarer Simulation wirkungsvoller |
| WP-09 Firestore Rules/Admin-Security | kritisch fuer Betrieb, aber nicht der naechste Core-Loop-Fix |
| WP-10 Online Service entkoppeln | Wartbarkeit/Performance, nicht sofort spielbarkeitsblockierend |
| WP-11 MVP-UI entschlacken | sollte nach Core-Loop-Stabilisierung folgen |
| WP-12 Restarbeiten | bewusst spaeter |

## Naechste Prioritaet

**Naechstes Work Package: WP-04 - Draft State und Pick-Transaktionen haerten**

Begruendung:

WP-01 hat den User in die Liga gebracht. Der naechste harte Core-Loop-Schritt ist Draft/Roster-Aufbau. Wenn Draft-Picks oder Draft-Finalisierung inkonsistent sind, kommt der Spieler nicht verlaesslich zu Ready und Simulation.

## Entscheidung

Das Projekt ist nach WP-01 sichtbar naeher an spielbar, aber noch nicht MVP-fertig.

**Fortschritt: 30% des Core-Loop-Blocker-Abbaus**

**Naechste Prioritaet: WP-04**
