# Architecture Overview

Stand: 2026-05-02

## Ziel der Analyse

Technische Gesamtkarte der AFBM-Architektur mit Fokus auf Ordnerstruktur, Verantwortlichkeiten, Datenfluss, Kopplung, Firebase-Integration, Game-Engine-Grenzen und Refactoring-Reihenfolge.

## Untersuchte Dateien/Bereiche

- `src/app/*`
- `src/components/*`
- `src/lib/online/*`
- `src/lib/admin/*`
- `src/lib/firebase/*`
- `src/server/repositories/*`
- `src/modules/*`
- bestehende Reports zu Refactor, Performance, Firebase, Multiplayer und UX

## Architektur-Karte

```text
Browser / Next.js App Router
  |
  +-- src/app
      |
      +-- Offline/Singleplayer Routes
      |   +-- Server Components / Server Actions
      |   +-- src/modules/* application services
      |   +-- src/server/repositories/*
      |   +-- Prisma oder Firestore Repository Adapter
      |
      +-- Online/Multiplayer Routes
      |   +-- Client Shell / Auth Gates
      |   +-- src/components/online/*
      |   +-- src/lib/online/repository-provider
      |   +-- local repository oder Firebase repository
      |
      +-- Admin Routes
          +-- Client AdminAuthGate
          +-- Admin API mit Bearer Token
          +-- src/lib/admin/*
          +-- Firebase Admin SDK

Domain / Engine
  |
  +-- src/modules/gameplay/*
  +-- src/modules/seasons/application/simulation/*
  +-- src/modules/players/*
  +-- src/modules/teams/*
  +-- src/modules/savegames/*

Persistence
  |
  +-- Prisma: src/lib/db/prisma.ts + repository.prisma.ts
  +-- Firebase Admin: src/lib/firebase/admin.ts + server repositories
  +-- Firebase Client: src/lib/firebase/client.ts + online firebase repository
```

## Wichtigste Findings

1. Es gibt zwei parallele Architekturmodelle: `src/modules/*` mit Domain/Application/Infrastructure fuer Singleplayer und `src/lib/online/*` als gewachsenes Multiplayer-Service-Layer.
2. Offline/Singleplayer ist vergleichsweise sauber geschichtet: Routes rufen Application Services auf, diese nutzen Domain und Repository-Abstraktionen.
3. Multiplayer/Firebase ist funktional, aber weniger sauber getrennt: UI, Route-State, Client Repository, Domain-Helpers und Legacy-local Storage sind eng gekoppelt.
4. `src/lib/online/online-league-service.ts` ist weiterhin der zentrale Online-Monolith und bleibt der groesste Architektur-Hotspot.
5. Admin-Actions sind serverseitig geschuetzt, aber `src/lib/admin/online-admin-actions.ts` ist ein grosses Command-Modul mit vielen semantisch verschiedenen Aktionen.
6. Firebase Admin und Firebase Client sind inzwischen getrennte Einstiegspunkte, was gut ist. Das Risiko liegt eher in falschen Imports ueber grosse Barrel-Dateien.
7. Game Engine und Match Simulation sind fachlich in `src/modules` isoliert, aber sehr grosse Engine-Dateien bleiben No-Go-Bereiche fuer ungetestete Refactors.
8. UI-Komponenten importieren Domain-/Application-Typen haeufig direkt. Das ist okay fuer View Models, aber erschwert spaetere Bundle-Schnitte.
9. Einzelne Application Services importieren aus `src/components/*`; das ist eine klare Boundary-Verletzung.
10. Firebase Repository, Admin Actions und Online Route-State bilden aktuell den kritischen Produktionspfad fuer Multiplayer.

## Top 10 Architekturprobleme

| Rang | Problem | Betroffene Dateien | Risiko |
|---:|---|---|---|
| 1 | Online-God-Service mit zu vielen Verantwortlichkeiten | `src/lib/online/online-league-service.ts` | Hoch |
| 2 | Firebase Repository liest/schreibt/normalisiert/subscribt in einem Modul | `src/lib/online/repositories/firebase-online-league-repository.ts` | Hoch |
| 3 | Admin Command-Modul vereint lokale und Firebase-Actions | `src/lib/admin/online-admin-actions.ts` | Hoch |
| 4 | Grosse Client-Orchestratoren mischen UI, State und Service Calls | `online-league-placeholder.tsx`, `admin-league-detail.tsx` | Hoch |
| 5 | `subscribeToLeague()` liefert mehr Daten als viele Views brauchen | Firebase repository, route state | Mittel/Hoch |
| 6 | Komponenten-Modelle werden von Application Services importiert | `team-roster.service.ts`, `team-trade.service.ts`, `decision-effects.ts` | Mittel |
| 7 | Singleplayer und Multiplayer nutzen unterschiedliche Architektursprachen | `src/modules/*` vs. `src/lib/online/*` | Mittel/Hoch |
| 8 | Engine-Dateien sind korrekt isoliert, aber intern sehr gross | `match-engine.ts`, `play-library.ts` | Hoch bei Refactor |
| 9 | Utility-/Barrel-Imports verschleiern Runtime-Kopplung | `online-league-service.ts` Re-Exports | Mittel |
| 10 | Seed/Admin/Staging-Skripte wiederholen Guards und Projektlogik | `scripts/seeds/*`, `scripts/staging*` | Mittel |

## Empfohlene Zielarchitektur

```text
src/app
  route composition only

src/components
  UI, View Models, local UI state, no persistence ownership

src/modules
  singleplayer/game domain, application services, engine

src/lib/online
  online domain types
  online use-cases
  online read models
  online repositories
  online firebase mappers

src/lib/admin
  admin API guards
  admin command handlers
  admin action DTOs

src/lib/firebase
  firebase client/admin bootstrap only

src/server/repositories
  server-side persistence adapters
```

Ziel ist keine neue Architektur neben der bestehenden, sondern eine Angleichung: Multiplayer sollte schrittweise die gleiche klare Sprache wie `src/modules/*` bekommen: Domain Types, Use Cases, Repository Adapter, UI View Models.

## Risiken

- Grosse Refactors am Online-Service koennen Join, Draft, Week Flow und Admin Simulation gleichzeitig brechen.
- Engine-Refactors ohne Golden-Master-Tests koennen Spielbalance und Determinismus veraendern.
- Zu aggressive Firebase-Subscription-Splits koennen Views mit fehlenden Daten erzeugen.
- Admin-Action-Splits koennen Security Guards versehentlich umgehen, wenn nicht konsequent zentralisiert.

## Empfehlungen

1. Importgrenzen zuerst korrigieren, bevor Logik verschoben wird.
2. Multiplayer schrittweise in fachliche Online-Use-Cases aufteilen.
3. Firebase-Mapping und Firestore-IO von Domain-Logik trennen.
4. Admin-Actions in Command Handler splitten, aber Guard und API Contract zentral halten.
5. Engine nur nach Determinismus-/Golden-Master-Absicherung anfassen.

## Offene Fragen

- Soll Multiplayer langfristig unter `src/modules/online` oder weiter unter `src/lib/online` leben?
- Bleibt der lokale Online-Modus als Produktfeature oder nur als Test-/Fallback-Adapter?
- Welche Online-Views brauchen Live-Subscriptions, welche reichen mit One-Shot Reads?
- Welche Admin-Actions sind dauerhaft Produktfeatures und welche bleiben Dev/Test-Tools?

## Naechste Arbeitspakete

- AP-ARCH1: Boundary-Verletzungen von Application Services zu `components` entfernen.
- AP-ARCH2: `online-league-service.ts` in read-only Fachmodule weiter schneiden.
- AP-ARCH3: Firebase Repository in Mapper, Queries, Commands und Subscriptions aufteilen.
- AP-ARCH4: Admin Action Handler pro Aktionsgruppe trennen.
- AP-ARCH5: Engine-Refactor nur vorbereiten: Golden-Master-Tests, keine Logikverschiebung.
