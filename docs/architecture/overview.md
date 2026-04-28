# Architekturuebersicht

Diese Datei ist die kurze Uebersicht. Die vollstaendige und fuehrende Dokumentation liegt unter [docs/README.md](../README.md).

## Kurzfassung

AFBM Manager ist eine modulare Next.js-Web-Anwendung ohne separates Backend-Projekt. Die serverseitige Logik laeuft innerhalb derselben Anwendung ueber:

- App-Router-Seiten in `src/app`
- API-Routen in `src/app/api`
- Server Actions in `src/app/app/savegames/actions.ts` und `src/app/app/savegames/[savegameId]/seasons/[seasonId]/actions.ts`
- Application Services in `src/modules/*/application`

Die Datenhaltung basiert auf PostgreSQL und Prisma. Das Schema trennt:

- Auth-Daten
- Referenzdaten
- savegame-spezifischen Laufzeitzustand

Wichtige Vertiefungen:

- Gesamtarchitektur: [architecture.md](./architecture.md)
- Module: [modules.md](./modules.md)
- Datenfluesse: [data-flow.md](./data-flow.md)
- Datenmodell: [data/entities.md](./data/entities.md)
- Readmodelle und API-Responses: [data/enums-and-read-models.md](./data/enums-and-read-models.md)
