# Full Project Prioritized Action Plan

Datum: 2026-05-01

## Go / No-Go

Ist das Spiel aktuell spielbar?

Nein, nicht als vollstaendige Multiplayer-Version.

Ja, als technischer Multiplayer-Prototyp mit funktionierendem Online-Einstieg, Join, Ready-Sync und lokal validiertem 16-Team-Fantasy-Draft.

## Was konkret fehlt zur spielbaren Version?

- Echte Multiplayer-Week-Simulation mit Match-Ergebnissen, Stats, Reports und sichtbaren Konsequenzen.
- Entscheidung zu roten Simulation-QA-Baselines.
- Firestore-Draft-State aus dem grossen League-Dokument herausloesen oder zumindest Last-/Dokumentgroessen-Risiko validieren.
- Firebase-E2E fuer den kompletten Draft, nicht nur lokaler Draft-E2E und separater Firebase-Join-E2E.
- UI-Fokus auf den ersten spielbaren Loop: Join -> Draft -> Ready -> Ergebnisse -> naechste Week.

## Realistische Aufwandsschaetzung

- Spielbare Multiplayer-MVP-Version: 80 bis 140 Stunden.
- Release-nahe Staging-Version mit belastbarer QA, Firebase-Draft-E2E, Observability und UX-Polish: 160 bis 260 Stunden.
- Production-taugliche Version mit Admin-Sicherheit, Skalierungsdatenmodell und Monitoring: 260+ Stunden.

## Problem-Liste nach Severity

### CRITICAL

1. Multiplayer-Week-Simulation ist noch placeholder-lastig
   - Blockiert echte Spielbarkeit.
   - Firebase-Admin-Simulation schaltet Week weiter, aber erzeugt keine echten Match-Ergebnisse/Reports.

2. Simulation-QA-Gates sind rot
   - Production-Fingerprints weichen fuer 8 Seeds ab.
   - Balancing-Test unterschreitet erwartete Scoring-Untergrenze.

3. Post-Draft-Payoff fehlt
   - Spieler koennen draften, aber danach fehlt die Belohnung durch echten Spieltag.

### HIGH

4. Firestore-Draft-State ist potenziell zu gross und zu zentral
   - Spielerpool und Picks liegen im League-Dokument.
   - Jeder Pick schreibt denselben State-Hotspot.

5. Firebase-Draft ist nicht als kompletter Browser-E2E mit 16 echten Firebase-Usern getestet
   - Lokaler Draft-E2E ist gruen.
   - Firebase-E2E deckt Join/Ready ab, aber nicht kompletten 16-Team-Draft.

6. Online-Service und Dashboard-Komponente sind weiter zu gross
   - `online-league-service.ts`: 8933 Zeilen.
   - `online-league-placeholder.tsx`: 2112 Zeilen.

7. Sichtbare Firebase-UI enthaelt unsynchronisierte Aktionen
   - Das verwirrt Spieler und erhoeht Risiko fuer falsche Erwartungen.

### MEDIUM

8. Lokaler Backendmodus ist Default
   - Gut fuer Entwicklung, schlecht fuer eindeutige Release-Signale.

9. Admin-Sicherheit ist MVP, nicht Production
   - Statischer HMAC-Token, kein Ablauf/Rolling Session/CSRF-Konzept.

10. Build-/Workspace-Warnung wegen mehrerer Lockfiles
   - Kein Blocker, aber Release-Hygiene schlecht.

11. Draft UX ist korrekt, aber nicht spannend genug
   - Zu wenig Spieler-Kontext, Empfehlungen, Needs und Folgen.

12. Mobile wurde nicht belastbar validiert
   - Wahrscheinlich nutzbar, aber nicht freigegeben.

### LOW

13. Emulator-Tests erzeugen erwartete, aber laute Permission-Denied-Logs.
14. Einige Texte nutzen technische Begriffe wie "Placeholder", "Sync" und "Firebase" zu sichtbar fuer Spieler.
15. Admin-Tools und Debug-Testaktionen sind noch nah an produktiver Admin-UI.

## Top 10 Massnahmen fuer eine spielbare Version

### 1. Echte Multiplayer-Week-Simulation anschliessen

Ziel: Admin-Simulation erzeugt echte Ergebnisse statt Placeholder.

Umsetzung:

- Einen serverseitigen Multiplayer-Week-Simulation-Service erstellen, der bestehende Engine-/Season-Simulation wiederverwendet.
- Input aus Firestore-Teams/Rostern/Depth Charts lesen.
- Ergebnisse in `weeks`, `matches`, `events`, optional Stats/Reports schreiben.
- Ready-State nach erfolgreicher Simulation zuruecksetzen.
- Idempotenz ueber bestehenden `adminActionLocks`-Mechanismus behalten.
- UI im Dashboard auf echte Week-Ergebnisse verlinken.

Akzeptanz:

- Nach Simulation sieht jeder Spieler sein Ergebnis.
- Reload zeigt dasselbe Ergebnis.
- Doppelter Klick erzeugt keine zweite Simulation.

### 2. Simulation-QA-Baselines entscheiden und reparieren

Ziel: Keine rote Engine-QA fuer Multiplayer-Freigabe.

Umsetzung:

- Ursachen fuer neue Fingerprints diffen.
- Entscheiden: neue Baseline bewusst akzeptieren oder Engine-Bug fixen.
- `medium-vs-medium.averageTotalScore` entweder fachlich korrigieren oder Erwartung begruendet anpassen.
- QA-Bericht mit Entscheidung schreiben.

Akzeptanz:

- `npm run qa:production:test` gruen.
- `npm run qa:simulation-balancing:test` gruen.

### 3. Firestore-Draft-Datenmodell entschlacken

Ziel: Draft skaliert und bleibt debugbar.

Umsetzung:

- `fantasyDraft` als kleines State-Dokument speichern.
- Picks als Subcollection `draftPicks/{pickNumber}` speichern.
- PlayerPool als Subcollection oder serverseitig deterministisch ableitbar speichern.
- `availablePlayerIds` aus Picks ableiten oder als kompakter Index speichern.
- Migration fuer neue Testligen reicht; keine breite Datenmigration noetig, solange nur Testliga aktiv ist.

Akzeptanz:

- Kein Pick schreibt 656-Pick-Array ins League-Dokument.
- Firestore-Dokumentgroessen bleiben weit unter Limit.

### 4. Firebase-E2E fuer kompletten Draft ergaenzen

Ziel: Lokaler Draft-E2E wird durch echten Firebase-Flow ergaenzt.

Umsetzung:

- Emulator-Seed fuer 16 Teams/User oder 16 Browser-Kontexte.
- Admin startet Draft.
- Picks ueber Repository/Firebase-Transaktionen ausfuehren.
- Wrong-team, duplicate-player und Reload pruefen.
- Abschluss und Week-1-Ready pruefen.

Akzeptanz:

- `npm run test:e2e:multiplayer:firebase:draft` gruen.

### 5. Sichtbare Firebase-Unsupported-Aktionen aus MVP-Flow entfernen

Ziel: Spieler sehen nur Dinge, die wirklich funktionieren.

Umsetzung:

- Dashboard in Firebase-MVP-Modus auf First Steps, Roster, Ready, Results und basic League Info begrenzen.
- Training/Finance/Trades/Coaches nur zeigen, wenn synchronisiert oder explizit als "kommt spaeter" ausserhalb des Hauptflows.

Akzeptanz:

- Kein Spieler klickt im Firebase-Multiplayer auf eine Aktion, die "nicht synchronisiert" meldet.

### 6. Online-League-Service in MVP-relevante Services trennen

Ziel: Aenderungen am Week-Flow werden kontrollierbar.

Umsetzung:

- `fantasy-draft-domain.ts`
- `league-lifecycle-service.ts`
- `week-simulation-service.ts`
- `roster-contract-service.ts`
- `league-audit-service.ts`
- Bestehende Public APIs erst delegieren, dann Call-Sites schrittweise umstellen.

Akzeptanz:

- `online-league-service.ts` verliert mindestens 40% Umfang.
- Tests bleiben gruen.

### 7. Dashboard-Komponente weiter zerlegen

Ziel: Spielbarer First-Week-Flow wird lesbar und testbar.

Umsetzung:

- Hook `useOnlineLeagueDashboard`.
- Container fuer Load/Recovery/Draft/Dashboard.
- Presentational Sections fuer Ready, Results, Roster Summary.
- Firebase-MVP-View und Local/Expert-View trennen.

Akzeptanz:

- `online-league-placeholder.tsx` unter 800 Zeilen.
- Kein sichtbares Verhalten ausser besserem Fokus aendern.

### 8. Player Journey textlich und visuell schaerfen

Ziel: Spieler wissen jederzeit, was jetzt passiert.

Umsetzung:

- Hub: "1. Liga finden, 2. Team waehlen, 3. Draft, 4. Week spielen".
- Draft: Needs, beste verfuegbare Spieler pro Position, naechster eigener Pick.
- Dashboard: "Bereit setzen", "Warten auf Admin", "Ergebnis ansehen".

Akzeptanz:

- Neuer Spieler kann ohne Erklaerung den ersten Loop abschliessen.

### 9. Admin-Production-Haertung definieren

Ziel: Adminbereich ist sicher genug fuer Staging/kleine Closed Tests.

Umsetzung:

- Session-Ablauf einfuehren.
- Login Rate Limit.
- CSRF-Schutz fuer Admin Actions oder SameSite + Origin-Pruefung.
- Audit-Log im Admin sichtbar machen.

Akzeptanz:

- Admin-Action ohne Session, mit falschem Origin und nach Ablauf wird geblockt.

### 10. Release-Hygiene herstellen

Ziel: Eindeutige Signale fuer Entwickler und Deployment.

Umsetzung:

- Workspace-Root/Lockfile-Warnung beseitigen.
- `test:e2e:multiplayer` klar in local/legacy und firebase splitten.
- Staging Smoke-Check dokumentieren.
- Git-Status fuer Release-Baseline clean machen.

Akzeptanz:

- Ein Release-Engineer kann mit einer Befehlsliste eindeutig Gruen/Rot entscheiden.

## Empfohlene Reihenfolge

1. Simulation-QA rot klaeren.
2. Multiplayer-Week-Simulation echt anschliessen.
3. Ergebnisse/Reports im Spieler-Dashboard sichtbar machen.
4. Firebase-Draft-E2E komplettieren.
5. Unsynchronisierte Firebase-Aktionen aus MVP-Flow ausblenden.
6. Firestore-Draft-State entschlacken.
7. Service/UI-Zerlegung fortsetzen.
8. Admin-Sicherheit haerten.
9. Mobile Smoke pruefen.
10. Release-Hygiene finalisieren.

## Entscheidung

No-Go fuer "spielbare Multiplayer-Version".

Go fuer "technischer Multiplayer-Prototyp mit validiertem Join/Ready/Draft-Kern".

Die schnellste Route zur spielbaren Version ist nicht mehr Auth oder Draft, sondern der echte erste Week-Loop mit Ergebnissen und stabiler Simulation.
