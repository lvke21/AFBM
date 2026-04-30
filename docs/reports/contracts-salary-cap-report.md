# Contracts & Salary Cap Report

## Neue Datenmodelle

Der lokale Online-MVP erweitert den Multiplayer-GM-Mode um:

- `PlayerContract`
  - `salaryPerYear`
  - `yearsRemaining`
  - `totalValue`
  - `guaranteedMoney`
- `SalaryCap`
  - `capLimit`
  - `currentCapUsage`
  - `deadCap`
- `OnlineContractPlayer`
  - Spieler-ID, Name, Position, Alter, Overall, Vertrag und Status.
  - Status: `active`, `released`, `free_agent`.

Jede Online-Franchise erhält beim Join einen kleinen MVP-Contract-Roster. Bestehende lokale Ligen ohne Contract-Daten werden beim Laden automatisch mit Default-Roster und Salary Cap erweitert.

## Cap-Regeln

Die Cap-Nutzung wird berechnet aus:

```txt
currentCapUsage = Summe aktiver salaryPerYear + deadCap
```

Default:

```txt
capLimit = 225,000,000
deadCap = 0
```

Cap-Verstöße blockieren:

- Vertragsverlängerungen
- Free-Agent-Signings

Entlassungen sind erlaubt und erzeugen Dead Cap.

## Aktionen

### Vertrag verlängern

`extendOnlinePlayerContract()` ersetzt den bestehenden Vertrag eines aktiven Spielers. Danach wird der Cap neu berechnet. Wenn die neue Cap-Nutzung über `capLimit` liegt, wird die Verlängerung blockiert.

### Spieler entlassen

`releaseOnlinePlayer()` setzt den Spielerstatus auf `released`. Das aktive Gehalt fällt aus der Cap-Nutzung heraus, aber `guaranteedMoney` wird als Dead Cap verbucht.

### Free Agent verpflichten

`signOnlineFreeAgent()` verschiebt einen Spieler aus dem ligaweiten Free-Agent-Pool in den Team-Roster. Das Signing wird blockiert, wenn der neue Vertrag den Cap überschreiten würde.

### Verträge laufen jährlich aus

`advanceOnlineContractsOneYear()` reduziert `yearsRemaining` aktiver Verträge um ein Jahr. Spieler mit `0` verbleibenden Jahren verlassen den Roster und gehen in den Free-Agent-Pool. Der lokale Week-Placeholder triggert diesen Schritt nach jeder 18. simulierten Woche.

## UI

Im Online Liga Dashboard gibt es einen neuen Bereich `Contracts & Cap`:

- Cap Limit
- Cap Usage
- Cap Space
- Dead Cap
- Vertragsliste
- `+1 Jahr verlängern`
- `Entlassen`
- Free-Agent-Liste mit `Verpflichten`

Die UI nutzt bewusst einfache MVP-Aktionen. Detaillierte Vertragsverhandlungen, Bonusstrukturen und Holdouts sind nicht Teil dieses Arbeitspakets.

## Events / Logs

Neue Events:

- `contract_extended`
- `player_released`
- `free_agent_signed`
- `salary_cap_updated`

## Tests

Neue Tests in `src/lib/online/contracts-salary-cap.test.ts` validieren:

- Cap wird aus aktiven Verträgen korrekt berechnet.
- Vertragsverlängerung funktioniert bei gültigem Cap.
- Entlassung erzeugt Dead Cap.
- Signing wird bei Cap-Überschreitung blockiert.
- Free Agent Signing funktioniert bei Cap Space.
- Auslaufende Verträge wechseln in die Free Agency.

## Offene Punkte

- Kein echter Spielerpool aus der Singleplayer-Game-Engine.
- Keine Vertragsboni außer `guaranteedMoney`.
- Keine Trade-Cap-Logik.
- Keine Restrukturierungen.
- Keine komplexen Rookie-Contracts.
- Keine echten Verhandlungen mit Spielerwillen oder Agenten.
- Bei Firebase/Backend-Migration müssen Contract-Aktionen transaktional abgesichert werden.
