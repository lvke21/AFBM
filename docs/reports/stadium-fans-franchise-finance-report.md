# Stadium, Fans & Franchise Finance Implementation Report

## Datenmodelle

Der lokale Online-MVP erweitert `OnlineLeagueUser` rückwärtskompatibel um optionale Franchise-Profile:

- `StadiumProfile`: Stadion-ID, Team-ID, Name, Stadt, Kapazität, Zustand, Komfort, Atmosphäre, Ticketpreis-Level, Parking-, Concessions- und Luxury-Suite-Level.
- `FanbaseProfile`: Marktgröße, Fan-Loyalty, FanMood, Erwartungen, Geduld, Bandwagon-Faktor, Media Pressure, Season-Ticket-Basis, Merch-Interesse und Rivalry-Intensität.
- `StadiumAttendance`: Heimspiel-Auslastung, Ticket-, Concessions-, Parking-, Merch- und Gesamtumsatz inklusive FanMood vorher/nachher.
- `MerchandiseFinancials`: wöchentliche Merch-Basis, Performance-, FanMood-, Market- und Playoff-Multiplikatoren.
- `FranchiseFinanceProfile`: kumulierte Revenue- und Expense-Felder, Weekly/Season Profit-Loss, CashBalance und OwnerInvestment.
- `OnlineFinanceRules`: Ligaweite Schalter für Stadium Finance, FanPressure, MerchRevenue, Revenue Sharing, Owner Bailout und Cash Floor.

Bestehende lokale Ligen ohne diese Felder werden beim Laden normalisiert. Alte `leagueSettings` ohne `financeRules` bleiben gültig und erhalten Defaults.

## Attendance-Formel

Die Attendance-Rate wird defensiv zwischen 25% und 100% begrenzt.

Einflussfaktoren:

- aktueller Win-Rate-Anteil
- FanMood und FanLoyalty
- Stadion-Atmosphäre und Komfort
- Ticketpreis-Abzug ab hohem Preis-Level
- Losing- und Winning-Streaks
- Rivalry- und Playoff-Bonus
- Playoff-Chancen und Heimspielattraktivität

Hohe Ticketpreise können die Auslastung senken. Rivalry- und Playoff-Spiele erhöhen die Nachfrage.

## FanMood-Formel

FanMood ist ein Wert von 0-100 und wird in Stufen übersetzt:

- 90-100: `ecstatic`
- 75-89: `excited`
- 60-74: `positive`
- 45-59: `neutral`
- 30-44: `frustrated`
- 15-29: `angry`
- 0-14: `hostile`

Siege erhöhen FanMood, Niederlagen senken FanMood. Hohe FanLoyalty puffert Verluste. Winning- und Losing-Streaks, Rivalry Games und Playoff Games verstärken den Effekt. Placeholder-Week-Simulationen ohne echtes Ergebnis verändern FanMood nicht.

## FanPressure-Logik

`FanPressureSnapshot` kombiniert:

- FanMood
- Attendance-Trend
- Merchandise-Trend
- Media Pressure
- Erwartungen vs. Ergebnis
- Rivalry Failures
- Playoff Drought
- FanLoyalty als Puffer

Der bestehende GM Job Security Flow berücksichtigt FanPressure bei Saisonbewertungen. Der Effekt wird als `jobSecurityDeltaFromFans` in der Performance-History gespeichert und erzeugt Events wie `owner_confidence_changed_by_fans` und `fan_pressure_changed`.

## MerchRevenue-Logik

Merchandise-Revenue wird pro Woche berechnet aus:

- Base Merch Revenue nach Marktgröße
- Performance-Multiplikator nach Win-Rate
- FanMood-Multiplikator
- Market-Size-Multiplikator
- Playoff-Multiplikator
- Matchday-Merch-Anteil aus Attendance und Fan-Interesse

Erfolgreiche Teams und Playoff-Kontext erzeugen dadurch höhere Merch-Umsätze.

## FinanceRules

Default:

- `enableStadiumFinance: true`
- `enableFanPressure: true`
- `enableMerchRevenue: true`
- `equalMediaRevenue: true`
- `revenueSharingEnabled: true`
- `revenueSharingPercentage: 20`
- `ownerBailoutEnabled: true`
- `minCashFloor: 0`
- `maxTicketPriceLevel: 100`
- `allowStadiumUpgrades: false`

Revenue Sharing verteilt einen prozentualen Pool aus Franchise-Revenue auf alle Ligamitglieder und schreibt einen Audit/Event-Eintrag.

## UI-Änderungen

GM UI:

- Neuer Franchise-Abschnitt im Online Liga Dashboard.
- Anzeige von Stadionname, Kapazität, letzter Auslastung, Saison-Auslastung, FanMood, FanPressure, MerchTrend, TicketRevenue, MerchandiseRevenue, Season P/L und Owner-Confidence-Einfluss.

Admin UI:

- Neue Finanz- und Franchise-Übersicht in der Admin-Ligadetailseite.
- Sortierung nach Revenue, Attendance, FanMood, FanPressure und Cash.
- Warnungen für kritische FanMood, kritische CashBalance, gefallene Attendance und GM-Druck.
- Admin kann Revenue Sharing manuell anwenden.

## Events / Logs

Neu erzeugte Events:

- `stadium_attendance_updated`
- `fan_mood_changed`
- `fan_pressure_changed`
- `merchandise_revenue_generated`
- `matchday_revenue_generated`
- `franchise_finance_updated`
- `owner_confidence_changed_by_fans`
- `financial_warning`

## Tests

Neue Tests in `src/lib/online/stadium-fans-finance.test.ts` validieren:

- Siegerteam erhält höhere FanMood als Verlierer.
- Losing Streak senkt Attendance.
- Hohe FanLoyalty puffert FanMood-Verlust.
- Hohe Ticketpreise senken Attendance.
- Rivalry Games erhöhen Attendance.
- Merch steigt bei erfolgreicher Saison.
- FanPressure beeinflusst JobSecurity.
- Revenue Sharing verteilt korrekt.
- Finanzwerte bleiben nicht-negativ.
- Legacy-Ligen ohne Stadium/Fan/Finance-Profile erhalten Defaults.

## Offene Punkte

- Keine echte Stadium-Upgrade-Mechanik.
- Keine dynamische Ticketpreis-Optimierung.
- Keine echte Game-Engine-Auswertung der Match-Ergebnisse.
- Keine echten Sponsorship-, Media- oder Travel-Systeme.
- Revenue Sharing ist lokal und nicht transaktional, bis ein Backend/Firebase-State eingeführt wird.
