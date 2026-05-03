# Frontend / Backend Separation

Stand: 2026-05-02

## Ziel der Analyse

Bewertung der Trennung zwischen Client Components, Server Components, Server Actions, API Routes, Admin Guards und Persistence.

## Untersuchte Dateien/Bereiche

- `src/app/online/*`
- `src/app/admin/*`
- `src/app/api/admin/*`
- `src/app/app/savegames/*`
- `src/components/auth/*`
- `src/components/online/*`
- `src/components/admin/*`
- `src/lib/admin/*`
- `src/lib/firebase/*`

## Aktuelle Trennung

### Offline/Singleplayer

```text
Server Page / Server Action
  -> auth/session
  -> modules/* application service
  -> repositories
  -> Prisma / Firestore
```

Bewertung: **gut bis solide.**

Die Offline-Routen sind haeufig serverseitig und rufen Application Services direkt. Das ist fuer Next.js passend und relativ gut testbar.

### Online/Multiplayer

```text
Client Page Shell
  -> OnlineAuthGate
  -> OnlineLeagueRouteState
  -> OnlineLeagueRepository
  -> Firebase Client SDK oder local storage
```

Bewertung: **funktional, aber clientlastig.**

Der Multiplayer-Flow ist stark auf Client Components und Firebase Client SDK ausgerichtet. Das ist fuer Live-Subscriptions nachvollziehbar, erzeugt aber grosse Client-Bundles und breite Re-Renders.

### Admin

```text
Client Admin UI
  -> Firebase ID Token
  -> Admin API Route
  -> Admin Action Guard
  -> Firebase Admin SDK
  -> Firestore
```

Bewertung: **security-seitig richtig.**

Admin-Mutationen laufen ueber API/Server-Guard. Client-seitig gibt es zwar AdminAuthGate, aber die entscheidende Pruefung liegt serverseitig.

## Gute Entscheidungen

- `firebase-admin` ist in server-only Modulen konzentriert.
- `AdminAuthGate` nutzt client-sichere UID-/Claim-Checks und importiert nicht direkt Firebase Admin.
- Admin API verlangt Bearer Token.
- Firestore Rules verhindern direkte Client-Schreibzugriffe auf kritische Online/Admin-Daten.
- Online-Firebase-Client ist ueber Repository-Interface abstrahiert.

## Problematische Entscheidungen

### Grosse Client Components

Viele zentrale Views sind `"use client"`:

- `online-league-placeholder.tsx`
- `online-fantasy-draft-room.tsx`
- `admin-control-center.tsx`
- `admin-league-detail.tsx`
- `admin-league-manager.tsx`
- `savegames-list-section.tsx`

Risiko: UI, State und Datenzugriff landen gemeinsam im Client-Bundle.

### Online-Dashboard liest breit live

`OnlineLeagueAppShell` + Route-State + Online Placeholder sind zwar verbessert, aber die League-Seite bleibt ein breiter Client-Flow. Fuer einige Unterseiten waeren kleinere read models ausreichend.

### Admin API und lokale Admin-Tools teilen Command-Layer

`online-admin-actions.ts` verarbeitet sowohl lokale als auch Firebase-bezogene Actions. Dadurch muss jede neue Admin-Aktion sehr bewusst zwischen UI-Testmodus, Local Mode und Firebase Mode unterscheiden.

### User-facing Fehlertexte im Backend

Mehrere Services liefern direkte `message`-Strings. Das ist praktisch, koppelt aber API/Service an deutsche UI-Copy.

## Empfohlene Zieltrennung

```text
Client:
  - Auth status
  - View state
  - Render
  - ID Token fuer Admin API
  - Firebase Client nur fuer erlaubte live reads/writes

Server:
  - Admin verification
  - mutierende Admin Actions
  - Week simulation
  - destructive operations
  - production-grade Firestore writes

Domain/Application:
  - pure validation
  - schedule/draft/week rules
  - result/standing reducers
  - no React, no Firebase SDK

Adapters:
  - Firebase Client Repository
  - Firebase Admin Repository/Commands
  - Local Test Repository
```

## Risiken

- Client-Bundle kann versehentlich groesser werden, wenn Service-Barrels weiter importiert werden.
- Firebase Admin darf nie ueber client-sichere Module transitiv importiert werden.
- Server Actions und API Routes koennen unterschiedliche Error Contracts entwickeln.
- Local Mode und Firebase Mode koennen auseinanderlaufen.

## Empfehlungen

1. Client-Komponenten nur mit read models und Use-Case-Hooks versorgen.
2. Mutierende Multiplayer-Operationen mittelfristig klar trennen: erlaubte GM Client Writes vs. Admin Server Writes.
3. Admin-API-DTOs typisieren und messages optional als UI-Layer-Mapping behandeln.
4. Route-spezifische Online-Read-Models einfuehren: dashboard, draft, roster, admin.
5. Import-Check: `src/components/**` darf kein `src/lib/firebase/admin` erreichen.

## Offene Fragen

- Welche GM-Actions duerfen langfristig direkt via Firebase Client laufen?
- Soll Week Simulation ausschliesslich Admin/API bleiben oder spaeter Commissioner-Flow werden?
- Braucht Online-Dashboard Server-Rendered Meta-Daten fuer schnelleren First Paint?

## Naechste Arbeitspakete

- AP-FB1: API Error Contract fuer Admin Actions dokumentieren.
- AP-FB2: Route-spezifische Online Read Models skizzieren.
- AP-FB3: Client Import Guard gegen Firebase Admin automatisieren.
- AP-FB4: Grosse Admin/Online Client Components weiter in Container + Display trennen.
