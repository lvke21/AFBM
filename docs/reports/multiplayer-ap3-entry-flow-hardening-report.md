# Multiplayer AP3 Entry Flow Hardening Report

Stand: 2026-04-30

## Ziel

AP3 stabilisiert den Multiplayer-Einstieg ohne neue Features, ohne Game-Engine-Aenderungen und ohne Datenmodellmigration. Der Fokus lag auf:

- Online Hub,
- Weiterspielen,
- Liga suchen,
- Liga beitreten,
- letzte Liga laden,
- fehlende oder ungueltige Liga,
- bereits belegtes Team,
- Reload waehrend Join/Load.

## Geaenderte Bereiche

### Weiterspielen

`OnlineContinueButton` nutzt weiter den Repository-Pfad als einzige Quelle, validiert den gespeicherten `lastLeagueId` jetzt aber vor dem Laden einer Liga.

Gehaertet:

- gespeicherte Liga-ID muss route-sicher sein,
- korrupte IDs werden vor `getLeagueById()` blockiert,
- fehlende Ligen loeschen den stale Continue-Zeiger,
- geladene Liga muss exakt zur gespeicherten ID passen,
- Ladebutton meldet seinen Busy-State mit `aria-busy`.

Damit fuehrt ein korrupter oder alter `afbm.online.lastLeagueId` nicht mehr zu kaputter Navigation.

### Liga Beitreten

`OnlineLeagueSearch` blockiert Join-Versuche jetzt synchron ueber eine `useRef`-Sperre. Dadurch koennen schnelle Doppel-Klicks im selben Render-Fenster keinen zweiten Join starten.

Gehaertet:

- ein Join zur selben Zeit,
- Join ohne vollstaendige Team-Identitaet wird lokal mit klarer Meldung blockiert,
- Repository-Resultate fuer `missing-league`, `full`, `invalid-team-identity` und `team-identity-taken` werden sichtbar angezeigt,
- Realtime-Suchfehler bleiben sichtbar und fallen nicht still auf eine leere Liste zurueck.

### Firebase Repository

`FirebaseOnlineLeagueRepository.joinLeague()` wirft fuer erwartbare Entry-Fehler nicht mehr roh in den Client-Flow.

Gehaertet:

- fehlende Liga gibt `missing-league` zurueck,
- nicht mehr joinbare Liga gibt `missing-league` mit konkreter Meldung zurueck,
- fehlende/ungueltige Team-Identitaet gibt `invalid-team-identity` zurueck,
- belegte Team-Identitaet gibt `team-identity-taken` zurueck,
- `lastLeagueId` wird nur bei `joined` oder `already-member` gesetzt.

Damit bleibt lokale Persistenz sauber, wenn ein Join wegen voller Liga, belegtem Team oder stale Lobby scheitert.

## Fehlerfaelle

Abgedeckt:

- keine letzte Liga gespeichert,
- ungueltige gespeicherte Liga-ID,
- gespeicherte Liga nicht mehr vorhanden,
- geladene Liga passt nicht zur gespeicherten ID,
- Join ohne Team-Auswahl,
- Liga voll,
- Team-Identitaet bereits belegt,
- Liga fehlt oder ist nicht mehr in der Lobby,
- schneller Doppel-Join im UI,
- Reload/erneutes Laden waehrend Continue.

Nicht geaendert:

- Game Engine,
- Balancing,
- Firestore-Datenmodell,
- Admin-Login,
- OAuth/Auth.js-Entfernung.

## Tests

Ergaenzt/aktualisiert:

- `src/components/online/online-continue-model.test.ts`

Relevanter Testlauf:

```text
npm test -- --run src/components/online/online-continue-model.test.ts src/components/online/online-league-search-model.test.ts src/lib/online/online-league-service.test.ts src/lib/online/repositories/online-league-repository.test.ts
```

Ergebnis:

```text
Test Files  4 passed (4)
Tests       50 passed (50)
```

## Bewertung

Der Multiplayer-Einstieg hat nun klarere Guardrails an drei Stellen:

- gespeicherter Continue-State wird vor Navigation validiert,
- UI laesst nur einen Join gleichzeitig zu,
- Firebase-Join-Fehler werden als erwartete Domain-Resultate behandelt.

Damit sind die bekannten kaputten Einstiegspfade reduziert, ohne die Engine oder das Datenmodell anzufassen.
