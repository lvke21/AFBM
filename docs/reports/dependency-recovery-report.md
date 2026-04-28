# Dependency Recovery Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Rot

## Executive Summary

Der Dependency-Zustand konnte nicht sicher auf den letzten funktionierenden Stand zurueckgesetzt werden, weil das Arbeitsverzeichnis kein Git-Repository enthaelt. Dadurch war der angeforderte Rollback per `git checkout -- package.json package-lock.json` nicht moeglich.

`node_modules` wurde entfernt und per `npm install` aus der vorhandenen `package-lock.json` neu aufgebaut. Die Installation, `npm run lint` und `npm run test:firebase` sind gruen. Der Typecheck ist jedoch rot und zeigt mehrere Fehler, darunter Firebase-Admin-Typauflosung und daraus folgende Firestore-Typfehler.

## Git- und Package-Status

- `git status --short`: fehlgeschlagen, weil kein `.git` Repository vorhanden ist.
- `git status --porcelain=v1 -- package.json package-lock.json`: fehlgeschlagen, weil kein `.git` Repository vorhanden ist.
- Es wurde kein `.git` Verzeichnis in den geprueften Elternpfaden gefunden.
- Es wurde keine lokale Sicherung von `package.json` oder `package-lock.json` gefunden.

Ergebnis: Es kann nicht belastbar festgestellt werden, ob `package.json` oder `package-lock.json` durch `npm audit fix --force` veraendert wurden. Ein Rollback war nicht durchfuehrbar.

## Durchgefuehrte Wiederherstellung

- `node_modules` wurde entfernt.
- `npm install` wurde ausgefuehrt.
- `npm cache clean --force` wurde nicht ausgefuehrt, weil `npm install` erfolgreich abgeschlossen wurde.
- Es wurde kein `npm audit fix --force`, kein `npm update` und keine Migration ausgefuehrt.

Aktuell installierte Kernversionen:

- `next@15.5.15`
- `@prisma/client@6.15.0`
- `prisma@6.19.3`
- `firebase-admin@10.1.0`
- `firebase-tools@1.2.0`

Hinweis: `package-lock.json` wurde durch `npm install` neu geschrieben oder mindestens zeitlich aktualisiert.

## Validierung

| Check | Ergebnis | Details |
| --- | --- | --- |
| `npm install` | Gruen | 722 Pakete installiert, Prisma Client generiert |
| `npx tsc --noEmit` | Rot | TypeScript Fehler in Firebase-/Firestore-Bereichen und Services |
| `npm run lint` | Gruen | ESLint ohne Fehler |
| `npm run test:firebase` | Gruen | 3 Test Files, 14 Tests bestanden |

## Wichtigste Fehler

Der Typecheck scheitert unter anderem an:

- `firebase-admin/app` und `firebase-admin/firestore`: TypeScript kann Deklarationsdateien wegen Package-Exports nicht korrekt aufloesen.
- Mehrere Firestore-Snapshots werden als `unknown` behandelt.
- Viele Callback-Parameter fallen auf implizites `any`.
- `saveGameRepository.firestore.ts` hat zusaetzlich Typfehler bei `wins`, `losses`, `ties`.

Das Muster passt zu einer instabilen oder inkonsistenten Dependency-Aufloesung nach unkontrollierten Updates.

## Rollback-Bewertung

Rollback erfolgreich: Nein.

Grund:

- Der geforderte Git-basierte Rollback war technisch nicht moeglich.
- Ohne bekannte Baseline duerfen die Package-Versionen nicht manuell geraten oder ersetzt werden.
- Die Neuinstallation reproduziert nur den aktuell vorhandenen Lockfile-Zustand, nicht zwingend den letzten funktionierenden Zustand.

## Verbleibende Risiken

- `package.json` und `package-lock.json` koennen weiterhin die durch `npm audit fix --force` veraenderten Versionen enthalten.
- TypeScript ist rot, daher ist der lokale Zustand nicht releasefaehig.
- Prisma CLI und Client sind aktuell nicht versionsgleich installiert (`prisma@6.19.3`, `@prisma/client@6.15.0`).
- Firebase-Admin-Typen sind aktuell nicht stabil aufloesbar.
- Ohne Git oder ein externes Backup ist eine sichere Rueckkehr zum letzten funktionierenden Zustand nicht belegbar.

## Empfehlung

1. Projekt aus dem Git-Repository oder aus einem Backup erneut mit funktionierendem `package.json` und `package-lock.json` bereitstellen.
2. Danach erneut ausfuehren:
   - `git checkout -- package.json package-lock.json`
   - `rm -rf node_modules`
   - `npm install`
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run test:firebase`
3. Bis dahin keine Firebase-Aktivierung, keine Migration und keine weiteren Dependency-Updates.

## Finaler Status

Rot: Projekt weiterhin instabil.
