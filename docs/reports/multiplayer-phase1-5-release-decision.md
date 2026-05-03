# Multiplayer Phase 1.5 Release Decision

Datum: 2026-05-03

## Executive Summary

Phase 1.5 bestanden: **Nein**

Phase 2 freigegeben: **Nein**

Der Multiplayer-Golden-Path ist nach explizitem Staging-Reset einmal live gruen gelaufen. Dabei wurden Ergebnisse erzeugt, Standings aktualisiert, `currentWeek` erhoeht, Ready zurueckgesetzt und keine aktiven `simulating` Locks hinterlassen.

Fuer eine Phase-2-Freigabe reicht das aber nicht. Der Lock-Cleanup-Fix ist laut den vorliegenden Reports **nicht als deployed bewiesen**: lokaler HEAD ist `39746332031b6bf544971835e9a9b65891ad1ad8`, Staging liefert weiterhin `1a28d88eaaa99a182612638652d0165705ce6901` mit Revision `afbm-staging-backend-build-2026-05-03-000`.

Zusaetzlich laufen die mutierenden Smokes nach dem ersten erfolgreichen Reset-Run nicht erneut gruen, sondern stoppen in Run 2 und Run 3 erwartbar rot im Preflight, weil der Testzustand bereits auf Woche 2 mit Ergebnissen steht. Das ist eine klare Diagnose und kein stiller State-Schaden, beweist aber nicht "mehrfach reproduzierbar gruen".

Da ein P0 offen ist, wird Phase 2 nicht freigegeben.

## Status je Kriterium

| Kriterium | Status | Bewertung | Beleg |
| --- | --- | --- | --- |
| 1. Lock-Cleanup-Fix deployed? | **Nein** | **P0** | `multiplayer-phase1-audit-report.md` sagt: Fix lokal vorhanden, aber noch nicht auf Staging deployed. `multiplayer-phase1-stability-proof-report.md` bestaetigt Commit-Abweichung: lokaler HEAD `3974633...`, Staging `1a28d88...`. |
| 2. Stale Locks entstehen nicht mehr? | **Teilweise belegt** | P1 | Nach Run 1, Run 2 und Run 3 gab es keine aktiven `simulating` Locks. Nicht belegt ist der Fehlerpfad "Lock erstellt, danach unerwarteter Simulationsfehler", weil dieser live nicht ausgeloest wurde und der relevante Fix nicht deployed ist. |
| 3. Smokes liefern klare Diagnose? | **Ja** | OK | Run 2/3 stoppen mit klarer Preflight-Diagnose: `expected-currentWeek=1 got=2`, `expected-resultsCount=0 got=...`, `No mutation was executed`. |
| 4. Testzustand ist reproduzierbar? | **Teilweise** | P1 | Mit erlaubtem Reset-Flag ist der Startzustand reproduzierbar. Ohne Reset bleiben mutierende Smokes nicht gruen, sondern diagnostizieren sauber den fortgeschrittenen Zustand. |
| 5. Kein manueller Firestore-Eingriff noetig? | **Ja fuer getesteten Pfad** | OK | Reset lief ueber erlaubte Staging-Seed-Skripte und Flags. Run 2/3 brauchten keinen manuellen Firestore-Eingriff, stoppten aber rot. |
| 6. Core Loop bleibt nach mehreren Laeufen stabil? | **Teilweise** | P1 | Der State blieb nach Run 1 bis Run 3 konsistent: keine aktiven Locks, keine Woche ohne Spiele, Ready zurueckgesetzt. Der mutierende Core Loop wurde aber nicht mehrfach erfolgreich ausgefuehrt. |
| 7. Gibt es noch P0/P1 Blocker? | **Ja** | **P0/P1 offen** | P0: Lock-Cleanup-Fix nicht deployed bzw. nicht auf Staging bewiesen. P1: Fehlerpfad nach Lock-Erstellung nicht live bewiesen; mutierende Smokes sind nicht mehrfach gruen ohne Reset. |

## Offene Risiken

### P0: Lock-Cleanup-Fix nicht deployed

Der wichtigste Fix aus Phase 1 ist nicht als Staging-deployed belegt. Solange `/api/build-info` nicht den Commit mit dem Lock-Cleanup-Fix ausliefert, kann Staging erneut in einen dauerhaft blockierenden `simulating` Lock laufen.

Fehlender Schritt:

1. Commit mit Lock-Cleanup-Fix deployen.
2. `/api/build-info` gegen diesen Commit pruefen.
3. Smokes erneut gegen exakt diesen Commit ausfuehren.

### P1: Fehlerpfad nach Lock-Erstellung nicht live bewiesen

Die Stabilitaetslaeufe beweisen erfolgreiche Simulation und Preflight-Abbruch ohne Lock-Schaden. Sie beweisen nicht, dass ein Fehler nach Lock-Erstellung live sauber auf `failed` aufraeumt.

Fehlender Schritt:

1. Gezielten Emulator- oder Staging-only Test fuer Fehler nach Lock-Erstellung ausfuehren.
2. Nachweisen, dass nur eigene fehlgeschlagene Attempts auf `failed` gehen.
3. Nachweisen, dass bestehende `simulated` Locks unveraendert bleiben.

### P1: Mutierende Smokes sind nicht mehrfach gruen ohne Reset

Run 2 und Run 3 sind nicht gruen, sondern erwartbar rot. Das ist fuer Diagnose und Idempotenz besser als stiller Schaden, aber es erfuellt nicht "mehrfach reproduzierbar gruen".

Fehlender Schritt:

1. Entscheiden, ob erwartetes Preflight-RED nach bereits simulierter Woche als akzeptiertes QA-Verhalten gilt.
2. Falls nicht: Smoke-Preflight so erweitern, dass er eine konsistente naechste spielbare Woche akzeptiert und kontrolliert weitersimulieren kann.

### P1: Kein vollstaendiger Browser-Beweis fuer echten Spielerfluss

`staging:smoke:playability` beweist den API-basierten Golden Path. Ein voller Staging-Browserflow fuer echte Spielerinteraktion bleibt nicht als Phase-1.5-Beweis dokumentiert.

Fehlender Schritt:

1. Browser-Smoke fuer Login, Team-Ansicht, Ready, Reload und Ergebnisse gegen Staging oder Emulator stabilisieren.

## Harte Entscheidung

Phase 1.5 bestanden: **Nein**

Begruendung:

- P0 offen: Lock-Cleanup-Fix ist nicht als deployed bewiesen.
- Phase-1.5-Stabilitaet ist nur teilweise belegt: Golden Path einmal gruen, danach klare Preflight-REDs statt mehrfach gruener mutierender Smokes.
- Es gibt keine aktiven Locks und keine leere Woche nach den Runs, aber der kritische Fehlerpfad ist nicht live bewiesen.

Phase 2 freigegeben: **Nein**

Freigabebedingungen:

1. Staging muss den Commit mit Lock-Cleanup-Fix per `/api/build-info` ausliefern.
2. `staging:smoke:auth`, `staging:smoke:admin-week` und `staging:smoke:playability` muessen gegen diesen Commit erneut laufen.
3. Es muss klar entschieden und dokumentiert sein, ob Run 2/3 ohne Reset gruen laufen muessen oder ob erwartetes Preflight-RED als reproduzierbarer, akzeptierter Zustand gilt.
4. Kein aktiver `simulating` Lock, keine Woche ohne Spiele, Ready reset und konsistente Results/Standings muessen nach den erneuten Runs bestaetigt sein.
