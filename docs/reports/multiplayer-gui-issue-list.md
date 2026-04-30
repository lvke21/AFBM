# Multiplayer GUI Issue List

| Screen | Problem | Schweregrad | Änderung | Status |
|---|---|---:|---|---|
| `/online` | User-Status wirkte widersprüchlich durch "Nicht verbunden" trotz lokalem GM-Kontext. | Medium | Status zeigt jetzt Firebase-Verbindung oder lokalen Testmodus plus GM-Rolle. | Behoben |
| `/online` | Weiterspielen konnte bei ungültiger `lastLeagueId` nur melden, aber den stale Pointer nicht bereinigen. | High | Continue-Action löscht ungültige `lastLeagueId` und zeigt klare Meldung. | Behoben |
| `/online` | Weiterspielen hatte keinen Pending-State und keine technische Fehlerbehandlung. | Medium | Pending-State, try/catch und Nutzerfeedback ergänzt. | Behoben |
| `/online` | Liga-Suche hatte keinen dedizierten Error-State. | Medium | Error-State mit "Erneut suchen" ergänzt. | Behoben |
| `/online` | Join-Button war deaktiviert, wenn Team-Identität fehlte, ohne direkten Hinweis. | Low | Hinweis unter Liga-Card ergänzt. | Behoben |
| `/online` | Mehrfachklick auf Beitreten konnte parallele Join-Versuche starten. | High | Join-Pending-State blockiert doppelte Aktionen. | Behoben |
| `/online/league/:leagueId` | Ready-Aktion hatte kein sichtbares Ergebnis und keinen Fehlerzustand. | Medium | Pending-State, Erfolg und Warnfeedback ergänzt. | Behoben |
| `/online/league/:leagueId` | Ready-Button sagte fix "Woche 1". | Low | Button nutzt aktuelle Week-Anzeige. | Behoben |
| `/admin` | Reset einer Liga war riskant und nicht bestätigt. | High | Confirm Dialog und Pending-State ergänzt. | Behoben |
| `/admin` | Delete/Reset konnten Fehler nicht nutzerverständlich anzeigen. | Medium | Einheitliches Erfolg-/Warnfeedback ergänzt. | Behoben |
| `/admin` | Debug-Tools konnten im Firebase-Modus lokalen Legacy-State verändern. | High | Debug-Tools im Firebase-Modus deaktiviert und erklärt. | Behoben |
| `/admin` | Gefährliche globale Debug-Aktionen waren nicht bestätigt. | Medium | Confirm Dialog für Alle Ligen löschen und Online-State reset. | Behoben |
| `/admin/league/:leagueId` | Woche simulieren war nicht bestätigt und konnte doppelt geklickt werden. | High | Confirm Dialog, Pending-State und simulating-Disable ergänzt. | Behoben |
| `/admin/league/:leagueId` | Spieler entfernen, GM entfernen und Team vakant setzen waren nicht konsequent bestätigt. | High | Confirm Dialogs ergänzt. | Behoben |
| `/admin/league/:leagueId` | Admin-Aktionen hatten uneinheitliche Fehlerbehandlung. | Medium | Zentrale `runAdminAction()`-Hülle mit try/catch und Feedback ergänzt. | Behoben |
| Daten/Legacy | Defekte lokale Daten konnten ohne explizite Prüfung geladen werden. | High | `validateOnlineLeagueState()` und sichere Repair-Schicht ergänzt. | Behoben |
| E2E | Kein dediziertes Multiplayer-E2E-Script vorhanden. | Medium | Im Stabilitätsreport dokumentiert. | Offen |
| E2E | Allgemeiner E2E-Smoke blockiert an fehlender PostgreSQL-DB. | Medium | Im Stabilitätsreport dokumentiert. | Offen |
