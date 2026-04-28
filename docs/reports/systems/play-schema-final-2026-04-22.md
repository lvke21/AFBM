# Finales Play-Schema

Stand: 2026-04-22

## Ziel

Dieses Schema erweitert das bestehende Play-Datenmodell minimal und rueckwaertskompatibel.

Es bleibt:

- nicht breaking
- mit allen bestehenden Plays kompatibel
- direkt nutzbar fuer Phase 1
- vorbereitet fuer groessere Libraries und Phase-2-Taxonomie

## Kernbefund

Das bestehende Schema war bereits stark genug fuer:

- Formation
- Personnel
- Situation
- Trigger
- Reads
- Assignments
- Expected Metrics
- Legality

Ergaenzt wurden nur optionale Taxonomie-Felder:

- `variantGroupId`
- `packageTags`
- `structure.defensiveConceptTag`

## Finale Struktur

Referenz: [src/modules/gameplay/domain/play-library.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/play-library.ts:1)

### Gemeinsamer Play-Kern

```ts
type BasePlayCallDefinition = {
  id: string;
  side: "OFFENSE" | "DEFENSE";
  family: PlayCallFamily;
  label: string;
  variantGroupId?: string | null;
  packageTags?: string[];
  supportedRulesets: readonly CompetitionRuleset[];
  situationTags: PlaySituationTag[];
  triggers: PlayTrigger[];
  reads: PlayRead[];
  assignments: PlayAssignment[];
  expectedMetrics: ExpectedPlayMetrics;
  counters: PlayCounterReference[];
  audibles: PlayAudibleReference[];
  legalityTemplate: PlayLegalityTemplate;
};
```

### Offensive Struktur

```ts
type OffensivePlayStructure = {
  formationFamilyId: string;
  personnelPackageId: string;
  conceptFamilyId: string;
  motionFamilyIds: string[];
  protectionFamilyId: string | null;
};
```

### Defensive Struktur

```ts
type DefensivePlayStructure = {
  formationFamilyId: string;
  personnelPackageId: string;
  frontFamilyId: string;
  coverageFamilyId: string;
  pressureFamilyId: string | null;
  coverageShell: CoverageShell;
  pressurePresentation: PressurePresentation;
  defensiveConceptTag?: string | null;
};
```

## Bedeutung der neuen optionalen Felder

### `variantGroupId`

Zweck:

- gruppiert Schwester-Varianten eines Konzepts
- macht Canonical Play Cells ohne ID-Parsen erkennbar
- spaeter nutzbar fuer Reporting, Authoring, Self-Scout-Gruppierung oder Library-Tools

Beispiele:

- `zone-core`
- `duo-family`
- `palms-match`
- `sim-creeper`

### `packageTags`

Zweck:

- leichtgewichtige, nicht-breaking Taxonomie fuer Playbook-Pakete
- gruppiert Plays entlang von Identitaet, Paketlogik oder Menuezuordnung

Beispiele:

- `CONDENSED`
- `EMPTY`
- `HEAVY`
- `RUN_CORE`
- `SPLIT_SAFETY`
- `ANTI_RPO`
- `MATCHUP_SPECIALTY`

### `structure.defensiveConceptTag`

Zweck:

- defensiver Analogpunkt zum offensiven `conceptFamilyId`, aber bewusst leichtgewichtiger
- kein neues Kernschema, keine neue Pflichtreferenz, keine neue Catalog-Collection
- erlaubt defensive Untercluster wie:

Beispiele:

- `QUARTERS_POACH`
- `PALMS`
- `COVER_6`
- `BEAR_PLUG`
- `DROP_8_SPY`

## Validierungsstatus

Referenz: [src/modules/gameplay/application/play-library-service.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.ts:1)

Das finale Schema ist validierbar.

Geprueft wird jetzt zusaetzlich:

- `variantGroupId` muss non-empty string oder `null` sein
- `packageTags` muss ein String-Array sein
- `structure.defensiveConceptTag` muss non-empty string oder `null` sein

Neue Issue-Kategorie:

- `INVALID_OPTIONAL_METADATA`

## Rueckwaertskompatibilitaet

Bestehende Plays bleiben unveraendert gueltig, weil:

- alle neuen Felder optional sind
- keine bestehenden Pflichtfelder umbenannt oder entfernt wurden
- keine bestehende Engine-Schnittstelle gebrochen wurde
- keine bestehende Katalogstruktur umgebaut wurde

## Erweiterbarkeit

Das finale Schema traegt direkt:

- groessere Variantentiefe innerhalb bestehender Families
- sauberere Gruppierung von Play-Zellen
- defensive Unterkonzept-Taxonomie ohne `defensiveConceptFamily`-Migration

Das finale Schema bereitet indirekt vor:

- Reporting ueber Variantengruppen
- kuenftige Play-Authoring-Tools
- Self-Scout-/Usage-Auswertungen auf Gruppen- oder Package-Ebene

## Statuspruefung

### Schema vollstaendig?

Ja, fuer die geplante Expansion.

### Kompatibel?

Ja, rueckwaertskompatibel und ohne Breaking Changes.

### Erweiterbar?

Ja, insbesondere fuer 48-Play- und 72-Play-Zielbilder.

## Status

Gruen

PROMPT 5 kann gestartet werden.
