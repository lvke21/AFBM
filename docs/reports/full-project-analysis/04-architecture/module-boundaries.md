# Module Boundaries

Stand: 2026-05-02

## Ziel der Analyse

Bewertung der Modulgrenzen zwischen UI, State, Domain, Application Services, Persistence, Firebase und Game Engine.

## Untersuchte Dateien/Bereiche

- `src/app/*`
- `src/components/*`
- `src/modules/*`
- `src/lib/*`
- `src/server/repositories/*`

## Aktuelle Modulgrenzen

| Bereich | Rolle | Bewertung |
|---|---|---|
| `src/app` | Routing, Server Components, Server Actions, API Routes | Grundsaetzlich passend |
| `src/components` | UI, Client State, View Models | Teilweise zu viel Fachlogik und Service-Orchestrierung |
| `src/modules` | Singleplayer Domain/Application/Infrastructure | Beste Architekturgrenze im Projekt |
| `src/lib/online` | Multiplayer Domain, Use-Cases, Storage, Repository, Legacy Local Mode | Zu breit, gewachsen |
| `src/lib/admin` | Admin Guard, Admin API Client, Admin Actions | Funktional, aber Action-Modul zu gross |
| `src/lib/firebase` | Firebase Client/Admin Bootstrap | Gut getrennt, muss strikt bleiben |
| `src/server/repositories` | Serverseitige Firestore/Prisma Adapter | Sinnvolle Persistence-Grenze |

## Soll-Grenzen

```text
components -> view models -> application/use-cases -> domain -> repository interface -> adapter

Erlaubt:
  components -> modules/application fuer Server Pages
  components -> lib/online/use-cases fuer Client Online Actions
  admin routes -> admin guard -> admin command handlers

Nicht erlaubt:
  application service -> components
  client component -> firebase-admin
  domain module -> persistence adapter
  engine -> UI copy/components
```

## Gefundene Boundary-Verletzungen

### Application Services importieren UI-Modelle

Gefunden:

- `src/modules/teams/application/team-roster.service.ts` importiert `buildPlayerValue` aus `src/components/player/player-value-model`.
- `src/modules/teams/application/team-trade.service.ts` importiert aus `src/components/trades/trade-model`.
- `src/lib/actions/decision-effects.ts` importiert `PlayerValueLabel` aus `src/components/player/player-value-model`.

Bewertung: **Architektonisch falsch, mittleres Risiko.**

Warum: Application Services sollten nicht von UI/View-Model-Schichten abhaengen. Diese Richtung erschwert Tests, Bundle-Schnitte und spaetere Server-/Client-Trennung.

Empfehlung: Gemeinsame reine Bewertungslogik nach `src/modules/players/domain` oder `src/modules/teams/domain` verschieben, Komponenten importieren dann ebenfalls von dort.

### Online Service als Domain- und Application-Barrel

`src/lib/online/online-league-service.ts` exportiert Typen, Konstanten, Draft, Week, Metrics und viele mutierende Actions. Dadurch importieren Komponenten, Admin Actions, Tests und Repositories aus derselben Datei, obwohl sie oft nur Typen oder kleine Helper brauchen.

Bewertung: **Hoches Kopplungsrisiko.**

Empfehlung: Keine sofortige API-Entfernung. Neue Imports sollten direkt aus Fachmodulen kommen:

- `online-league-types.ts`
- `online-league-draft-service.ts`
- `online-league-week-service.ts`
- `online-league-week-simulation.ts`
- `online-league-metrics.ts`
- `online-league-schedule.ts`

### Firebase Client Repository besitzt zu viele Grenzen

`firebase-online-league-repository.ts` enthaelt:

- Firestore Query-Building
- Snapshot-Subscription
- DTO Mapping
- Join/Rejoin Transaction
- Draft Transaction
- Ready-State Writes
- Membership Repair
- Browser Storage Recovery

Bewertung: **Zu breit.**

Empfehlung: erst read-only Mapper/Normalizers extrahieren, danach Subscriptions nach Datenbereich trennen.

## Gute Grenzen

- `src/lib/firebase/admin.ts` und `src/lib/firebase/client.ts` sind klar getrennt.
- `src/components/admin/admin-auth-gate.tsx` importiert client-safe Admin-UID-Logik statt Firebase Admin.
- Singleplayer-Routes nutzen Application Services statt direkt Prisma/Firestore.
- `src/server/repositories/*` trennt Prisma und Firestore Adapter sichtbar.
- `src/modules/shared/domain/enums` ist breit genutzt, aber fachlich ein stabiler Shared-Kern.

## Risiken

- Neue Entwickler koennen schwer erkennen, welche Online-Funktion aus welchem Modul importiert werden soll.
- Der lokale Online-Modus und Firebase-Modus teilen eine API, aber nicht immer dieselben technischen Constraints.
- UI-Komponenten mit Service Calls koennen schwer serverseitig getestet werden.
- Boundary-Verletzungen von Services zu Components koennen unbemerkt Client-Code in Server-Pfade ziehen.

## Empfehlungen

1. Einen kurzen Boundary-Guide in `src/lib/online` oder Docs festhalten.
2. Application-zu-Component-Imports als erste konkrete Architekturkorrektur entfernen.
3. Online-Typimporte weiter vom `online-league-service` Barrel wegziehen.
4. Repository-Interfaces pro Use Case schaerfen: LeagueRead, LeagueMembership, LeagueDraft, LeagueWeek.
5. Components duerfen View Models haben, aber keine Persistence Ownership.

## Offene Fragen

- Soll `src/lib/online` langfristig in `src/modules/online` migriert werden?
- Welche alten Local-Mode-Funktionen sind noch Produktcode und welche nur Test-Helfer?
- Wird Admin langfristig eigener Bounded Context oder bleibt es Tooling um Online herum?

## Naechste Arbeitspakete

- AP-MB1: `buildPlayerValue` und Trade-Bewertungslogik aus Components in Domain verschieben.
- AP-MB2: Import-Lint-Regel oder Architekturtest fuer `src/modules/**` darf nicht `src/components/**` importieren.
- AP-MB3: Online-Barrel-Importe weiter durch Fachmodul-Importe ersetzen.
- AP-MB4: Firebase Repository Mapper in eigenes Modul extrahieren.
