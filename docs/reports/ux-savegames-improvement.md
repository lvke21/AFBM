# Savegames UX Improvement Report

Stand: 2026-05-01

## Ziel

Der Savegames Screen soll als zentraler Einstiegspunkt sofort beantworten:

- Wo bin ich?
- Was kann ich jetzt tun?
- Was ist mein naechster sinnvoller Schritt?

## Neue UI-Struktur

### 1. Entscheidungshub oben

Der bisher dominante Story-Hero wurde durch einen kompakten Manager Hub ersetzt.

Primaere Optionen:

- `Fortsetzen` - springt zu vorhandenen Franchises.
- `Neue Karriere starten` - springt zum Offline-Erstellformular.
- `Online Spielen` - oeffnet den Online Hub, wenn Auth gueltig ist, oder fokussiert Login.

Der Account/Login-Zustand sitzt rechts im Kopfbereich und konkurriert nicht mehr als separater grosser Spielmodus mit Offline/Online.

### 2. Neues Spiel als eigener Abschnitt

Das Offline-Erstellformular steht in einem klar benannten Abschnitt `Neue Karriere starten`.

Wenn Offline-Erstellung deaktiviert ist, erscheint keine technische Firestore-/Backend-Erklaerung mehr im Screen, sondern:

> Neue Offline-Karrieren sind in dieser Umgebung gerade pausiert. Du kannst vorhandene Franchises fortsetzen oder online spielen.

### 3. Admin als Utility

Adminmodus wurde aus der Hauptentscheidung herausgenommen und in einen separaten Utility-Abschnitt verschoben. Dadurch wirkt Admin nicht mehr wie ein normaler Spielmodus.

### 4. Fortsetzen-Bereich

Die Franchise-Liste hat jetzt oben eine Resume-Card fuer die zuletzt aktualisierte Franchise:

- Franchise Name
- Liga/Saisonstatus
- Teams/Spieler
- Update-Datum
- primaerer Button `Fortsetzen`

Darunter bleibt die vollstaendige Liste aller Franchises mit Details und Loeschen.

### 5. Empty State

Wenn keine Franchise vorhanden ist, zeigt der Bereich jetzt:

- klare Ueberschrift `Noch keine Karriere vorhanden`
- kurze Erklaerung
- CTA `Neue Karriere starten`

## Geaenderte Komponenten

- `src/app/app/savegames/page.tsx`
- `src/components/savegames/savegames-list-section.tsx`

## Vorher

- Grosser erzählerischer Hero nahm viel Raum ein.
- Offline, Online Login, Online Spielen und Adminmodus standen visuell gleich stark nebeneinander.
- `Fortsetzen` war nur pro Franchise-Karte sichtbar, nicht als Hauptentscheidung.
- Empty State sagte nur, dass keine Offline-Franchise vorhanden ist.
- Deaktivierte Offline-Erstellung konnte technische Umgebungssprache anzeigen.

## Nachher

- Drei Hauptentscheidungen sind sofort sichtbar: `Fortsetzen`, `Neue Karriere starten`, `Online Spielen`.
- Account/Login ist klar als Status/Accountbereich platziert.
- Admin ist sekundär als Utility einsortiert.
- Vorhandene Franchises bekommen eine Resume-Card.
- Kein Save vorhanden fuehrt direkt zu `Neue Karriere starten`.
- Offline deaktiviert wird in normaler Spielersprache erklaert.

## Offene Punkte

- `Fortsetzen` im Top-Hub springt zum Franchise-Bereich, weil die Savegame-Anzahl clientseitig geladen wird.
- Ein spaeteres Resume-Panel koennte Offline- und Online-Aktivitaet zusammenfuehren.
- Auth ist weiterhin im bestehenden FirebaseEmailAuthPanel umgesetzt; eine vollstaendige Auth-Konsolidierung ist ein separates AP.
