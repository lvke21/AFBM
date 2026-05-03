# Coupling and Dependencies

Stand: 2026-05-02

## Ziel der Analyse

Sichtbar machen, welche Dateien und Module die meiste Kopplung erzeugen, wo Import-Risiken liegen und welche Abhaengigkeiten Refactors besonders gefaehrlich machen.

## Untersuchte Dateien/Bereiche

- Import-Hotspots via statischer Import-Zaehlung
- `src/lib/online/*`
- `src/modules/*`
- `src/components/*`
- `src/server/repositories/*`

## Kopplungs-Hotspots

Statische Import-Zaehlung, Top-Auswahl:

| Importziel | Treffer | Einordnung |
|---|---:|---|
| `src/modules/teams/domain/team.types` | 54 | Zentraler Team-Domain-Typ |
| `src/modules/shared/domain/enums` | 43 | Stabiler Shared-Kern |
| `src/lib/utils/format` | 35 | Breite UI/Format-Abhaengigkeit |
| `src/components/ui/status-badge` | 32 | UI-Komponenten-Kern |
| `src/lib/auth/session` | 30 | Auth/sessionweit gekoppelt |
| `src/lib/online/online-league-types` | 26 | Online-Domain-Typen |
| `src/lib/random/seeded-rng` | 22 | Determinismus/Seed-Kern |
| `src/lib/firebase/admin` | 18 | Server-Firebase-Hotspot |
| `src/lib/online/online-league-service` relativ | 18 | Online-Barrel-Hotspot |
| `src/lib/online/online-league-repository-provider` | 11 | Online-Datenquelle |

## Stark gekoppelte Bereiche

### Online

```text
components/online
  -> online route state
  -> online repository provider
  -> online-league-service barrel
  -> online-league-types
  -> firebase/local repository
```

Risiko: UI-Aenderungen koennen Service-Abhaengigkeiten nachziehen; Service-Aenderungen koennen viele UI- und Testpfade betreffen.

### Admin

```text
components/admin
  -> admin-api-client
  -> app/api/admin/online/actions
  -> admin-action-guard
  -> online-admin-actions
  -> online-league-service + firebase admin
```

Risiko: Admin-Actions sind korrekt serverseitig, aber das zentrale Command-Modul ist ein Knotenpunkt fuer Security, Firestore Writes und Online-Domain.

### Singleplayer

```text
app/app/savegames/*
  -> modules/*/application
  -> modules/*/domain
  -> server/repositories/*
  -> prisma/firestore
```

Risiko: Besser geschichtet, aber breite Domain-Typen wie `TeamDetail` und `SeasonOverview` sind stark gekoppelt.

### Engine

```text
savegames/week-flow
  -> seasons simulation services
  -> match-engine
  -> gameplay application/domain
  -> players/teams domain
```

Risiko: Engine ist nicht ueber UI gekoppelt, aber intern sehr gross und schwer zu veraendern.

## Import-Zyklen

Es wurde keine dedizierte Cycle-Toolchain im Projekt gefunden. Eine vollstaendige Cycle-Garantie liegt daher nicht vor.

Indizien:

- Keine offensichtlichen fatalen Runtime-Zyklen, da Typecheck/Build in vorherigen Reports gruen waren.
- Potenzielle semantische Zyklen bestehen durch Application-Services, die Component-Modelle importieren.
- Online-Barrel-Re-Exports koennen Zyklen verschleiern, auch wenn sie aktuell nicht sichtbar brechen.

Empfehlung: Leichte Architekturtests einfuehren, bevor weitere Online-Splits umgesetzt werden:

- `src/modules/**` darf nicht aus `src/components/**` importieren.
- `src/components/**` darf nicht aus `src/lib/firebase/admin` importieren.
- `src/modules/**/domain` darf nicht aus `application` oder `infrastructure` importieren.

## Utility-Wildwuchs

`src/lib/utils/format` ist breit genutzt und unkritisch, solange es rein bleibt. Kritischer sind Utility-nahe Module mit fachlichem Inhalt:

- `online-league-service.ts` als Utility-Barrel und Use-Case-Sammlung
- `online-league-dashboard-utils.ts` mit UI Copy, Labels, Trainingspreview und Styling-Helfern
- `admin-league-action-config.ts` als Config fuer einfache Admin-Actions

Bewertung: Utilities sollten nicht zu versteckten Domain-Modulen werden. Fachlogik gehoert in Domain/Use-Case-Module, UI-Copy in View Models.

## Komponenten mit Businesslogik

Besonders relevant:

- `src/components/online/online-league-placeholder.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/online/online-league-search.tsx`
- `src/components/savegames/savegames-list-section.tsx`

Diese Komponenten enthalten nicht nur Renderlogik, sondern auch Action-Orchestrierung, Feedback-State, Berechtigungs-/MVP-Gates und teilweise Routing-Recovery.

## Services mit UI-Annahmen

- `team-roster.service.ts` nutzt UI-Player-Value-Modell.
- `team-trade.service.ts` nutzt Trade-UI-Modell.
- Admin Action Results enthalten User-facing `message` direkt im Service-Layer.
- Online Service gibt teils konkrete Feedback-/Action-Texte indirekt an UI-Pfade weiter.

Bewertung: Nicht akut kaputt, aber mittelfristig schlecht fuer Testbarkeit und alternative UIs.

## Risiken

- Online-Service-Aenderungen haben hohe Regression-Breite.
- Admin-Action-Aenderungen koennen Security und Firestore Writes zusammen betreffen.
- Engine-Aenderungen koennen Determinismus und Balance brechen.
- Import-Zyklen koennen durch Barrels erst bei Build/Bundle sichtbar werden.

## Empfehlungen

1. Architekturtests fuer verbotene Imports einfuehren.
2. Online-Service nicht weiter als Sammelimport verwenden.
3. Component-Modelle, die von Application Services gebraucht werden, in Domain verschieben.
4. Admin-Action-Result DTOs von UI-Copy entkoppeln: Code + optional message.
5. Import-Cycle-Tool nur leichtgewichtig einfuehren, wenn es nicht die Build-Toolchain belastet.

## Offene Fragen

- Soll die Online-Domain denselben DDD-Stil wie `src/modules` bekommen?
- Welche Admin-Result-Messages sind API Contract und welche reine UI Copy?
- Welche Barrels sind bewusst oeffentliche API und welche historische Bequemlichkeit?

## Naechste Arbeitspakete

- AP-CD1: Import-Policy-Test fuer drei kritische Regeln.
- AP-CD2: `online-league-service`-Importe in Client-Komponenten weiter abbauen.
- AP-CD3: UI-Model-Abhaengigkeiten aus Application Services entfernen.
- AP-CD4: `online-admin-actions.ts` nach Action-Gruppen inventarisieren.
