# Team Identity Selection Implementation Report

## Datenstruktur

Die auswählbare Team-Identität liegt in `src/lib/online/team-identity-options.ts`.

### Cities

Jede Stadt nutzt:

```ts
type TeamIdentityCity = {
  id: string
  name: string
  country: string
  cityGroups: ("usa_sports" | "switzerland" | "dach" | "europe_capital")[]
}
```

Die City-Liste kombiniert NFL/NBA-Städte, eine erweiterte Schweiz-Liste, große
DACH-Städte und europäische Hauptstädte. Schreibweisen wie `Munich`/`München`,
`Zurich`/`Zürich`, `Geneva`/`Genève`, `Vienna`/`Wien` und `Cologne`/`Köln`
werden normalisiert und im UI nur einmal angezeigt.

### Teamnamen

Jeder Teamname nutzt:

```ts
type TeamIdentityTeamName = {
  id: string
  name: string
  category:
    | "identity_city"
    | "aggressive_competitive"
    | "modern_sports"
    | "classic_sports"
}
```

Die gewählte Kombination wird beim Join als Membership-Daten gespeichert:

```ts
{
  cityId: "zurich",
  cityName: "Zürich",
  teamNameId: "forge",
  teamName: "Forge",
  teamCategory: "identity_city",
  teamDisplayName: "Zürich Forge"
}
```

## Anzahl Datenpunkte

- Städte nach Deduplizierung: 178
- Teamnamen gesamt: 120
- `identity_city`: 40
- `aggressive_competitive`: 40
- `modern_sports`: 20
- `classic_sports`: 20

## UI Flow

Die Auswahl ist in `OnlineLeagueSearch` eingebettet und erscheint nach
`Liga suchen` über den gefundenen Ligen.

1. Stadt auswählen
2. Kategorie wählen
3. Teamnamen wählen
4. Live-Vorschau prüfen

Der Join-Button bleibt deaktiviert, bis eine gültige Kombination existiert.
Die Vorschau zeigt dann das finale Format `{City} {TeamName}`.

## Validierung

Validierung findet zentral über `resolveTeamIdentitySelection()` statt:

- `cityId` muss existieren
- `teamNameId` muss existieren
- `category` muss eine der vier erlaubten Kategorien sein
- Teamname muss zur gewählten Kategorie gehören
- leere Werte werden abgelehnt
- Stadt-Slugs werden dedupliziert
- Teamnamen-Slugs sind eindeutig

Zusätzlich blockiert `joinOnlineLeague()`:

- Join ohne gültige Auswahl
- doppelte Team-Identität innerhalb derselben Liga
- volle Liga

Bereits beigetretene Nutzer behalten ihre bestehende Team-Identität.

## Geänderte Bereiche

- Datenbasis und Validierung: `src/lib/online/team-identity-options.ts`
- Join-Speicherung: `src/lib/online/online-league-service.ts`
- Auswahl-UX: `src/components/online/online-league-search.tsx`
- Dashboard-Anzeige: `src/components/online/online-league-detail-model.ts`
- Admin-Anzeige: `src/components/admin/admin-league-detail.tsx`
- Tests: Online-Service, Team-Identity-Optionen, League-Detail-Model

## Offene Punkte

- Die Auswahl ist weiterhin lokaler MVP-State in `localStorage`.
- Es gibt noch keine serverseitige Reservierung oder Transaktion.
- Es gibt keine Logo-Generierung und keine Branding-Assets.
- Es gibt keine Umbenennen-Funktion nach dem Join.
- Für echten Multiplayer muss die Team-Identität später backendseitig eindeutig
  reserviert werden.
