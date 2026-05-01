# Multiplayer Seed Workflow

Dieser Workflow baut die lokale Multiplayer-Testliga reproduzierbar im Firestore-Emulator auf.

## Voraussetzungen

- Nur Demo-/Entwicklungsumgebung verwenden.
- Firestore-Emulator muss laufen: `127.0.0.1:8080`.
- Projekt-ID muss mit `demo-` beginnen, z. B. `demo-afbm`.
- Niemals gegen Production ausfuehren.

## Komplett neu aufbauen

```bash
npm run seed:multiplayer:reset
```

Reihenfolge:

1. Markierte Multiplayer-Testliga loeschen.
2. Liga und 8 Teams seeden.
3. Spielerpool seeden.
4. Draft-State vorbereiten.
5. Validierung ausfuehren.

## Einzelne Schritte

Nur Liga und Teams:

```bash
npm run seed:multiplayer:league
```

Nur Spielerpool:

```bash
npm run seed:multiplayer:players
```

Nur Draft-State vorbereiten:

```bash
npm run seed:multiplayer:draft
```

Nur validieren:

```bash
npm run seed:multiplayer:validate
```

Nur markierte Testliga loeschen:

```bash
npm run seed:multiplayer:reset-only
```

## Sicherheitsregeln

Der Reset loescht nur `leagues/afbm-multiplayer-test-league` und bekannte Subcollections.
Er verweigert die Ausfuehrung, wenn:

- `NODE_ENV=production` oder `AFBM_DEPLOY_ENV=production` gesetzt ist.
- kein Firestore-Emulator konfiguriert ist.
- die Firebase-Projekt-ID nicht mit `demo-` beginnt.
- die Liga nicht die erwarteten Marker traegt:
  - `seedKey = afbm-multiplayer-foundation-v1`
  - `testData = true`
  - `leagueSlug = afbm-multiplayer-test-league`
  - `createdBySeed = true`

Auth-User werden nicht geloescht.

## Bekannte Einschraenkungen

- Der Workflow ist Firestore-Emulator-orientiert.
- Es wird keine produktive Cloud-Seed-Freigabe gebaut.
- Alte nicht markierte Dokumente werden nicht geloescht.
- Positionslimits im Draft werden aktuell nicht separat validiert; das bestehende Online-Modell nutzt das Gesamt-Roster-Limit.
