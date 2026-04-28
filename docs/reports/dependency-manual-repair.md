# Dependency Manual Repair

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Gruen

## Executive Summary

Das Projekt wurde ohne Git-Baseline manuell stabilisiert. Es wurden keine neuen Features gebaut, keine Firebase-Aktivierung vorgenommen und keine Migration gestartet.

Die Reparatur konzentrierte sich auf drei Punkte:

- Prisma CLI und Prisma Client wieder auf dieselbe Version gebracht.
- Firebase Admin auf eine kompatible Version innerhalb der bestehenden Major-Linie gesetzt.
- Den verbleibenden Firestore-Verify-TypeScript-Fehler durch kompatible Firestore-Typnutzung behoben.

Alle geforderten Abschlusschecks sind gruen.

## Dependency-Reparatur

### Prisma Version Mismatch

Vorher:

- `@prisma/client@6.15.0`
- `prisma@6.19.3`

Nachher:

- `@prisma/client@6.15.0`
- `prisma@6.15.0`

Bewertung: behoben. CLI und Client sind wieder versionsgleich.

### Firebase Admin

Vorher:

- `firebase-admin@10.1.0`
- Subpath-Exports fuer `firebase-admin/app` und `firebase-admin/firestore` enthielten keine `types`-Eintraege.
- TypeScript mit `moduleResolution: Bundler` konnte die Deklarationsdateien nicht korrekt aufloesen.

Nachher:

- `firebase-admin@10.3.0`
- Version bleibt innerhalb Major 10.
- Subpath-Exports enthalten `types`-Eintraege.
- Bestehende Imports in `src/lib/firebase/admin.ts` funktionieren wieder.

Bewertung: behoben.

## Code-Fix

Geaendert:

- `scripts/seeds/firestore-verify.ts`

Fix:

- `collection().count().get()` wurde durch `collection().get()` plus `snapshot.size` ersetzt.

Grund:

- Die konservativ gewaehlte `firebase-admin@10.3.0` loest die Typ-Exports, aber der darin enthaltene Firestore-Client stellt die Aggregate-Count-API nicht typisiert bereit.
- Fuer den Emulator-Verify-Pfad sind die Testdaten klein; ein normaler Collection-Read ist hier ausreichend und vermeidet eine Major-Aktualisierung.

## Validierung

| Check | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:firebase` | Gruen |

Firebase-Testdetails:

- 3 Test Files bestanden.
- 14 Tests bestanden.

## Aktuelle Kernversionen

- `next@15.5.15`
- `@prisma/client@6.15.0`
- `prisma@6.15.0`
- `firebase-admin@10.3.0`
- `firebase-tools@1.2.0`

## Nicht gemacht

- Kein `npm audit fix --force`.
- Kein `npm update`.
- Keine Major-Aktualisierung.
- Keine Firebase-Aktivierung.
- Keine Datenmigration.
- Keine Prisma-Migration.

## Verbleibende Risiken

- Es gibt weiterhin gemeldete npm-Audit-Fundstellen. Diese wurden bewusst nicht automatisch repariert, weil das genau der urspruengliche Stabilitaetsbruch war.
- Ohne Git-Baseline bleibt unklar, ob weitere Dependencies historisch exakt sind. Der aktuelle technische Zustand ist aber fuer TypeScript, Lint und die geforderte Firebase-Testgruppe stabil.
- `firebase-tools@1.2.0` wirkt ungewoehnlich alt, wurde aber nicht angefasst, weil es nicht Teil des aktuellen TypeScript-/Testblockers war und keine Major-Updates gewuenscht sind.

## Finaler Status

Gruen: TypeScript, Lint und Firebase-Tests laufen.
