# Auth And Onboarding Flow

Stand: 2026-05-02

## Ziel des Users

Ein neuer oder wiederkehrender User will verstehen, ob er eingeloggt ist, mit welchem Account er spielt, welche Rolle er hat und welche Modi verfuegbar sind.

## Flow-Diagramm First-Time

```text
/app/savegames
  -> Account Panel
    -> Firebase Login wird geprueft
      -> nicht eingeloggt
        -> Email + Passwort eingeben
        -> Einloggen oder Registrieren
        -> Account Status: Eingeloggt
        -> Online spielen oder Neue Karriere starten
```

## Flow-Diagramm Returning

```text
/app/savegames
  -> Auth State restored
  -> Franchises laden
  -> Fortsetzen oder Online spielen
```

## Notwendige Schritte

1. Firebase Auth State laden.
2. Bei fehlendem Login: Formular zeigen.
3. Login/Register ausfuehren.
4. Rolle anzeigen:
   - GM
   - Admin + GM
5. Online/Admin Buttons entsprechend freigeben oder erklaeren.

## Tatsaechliche Implementierung

| Element | Datei | Bewertung |
|---|---|---|
| Auth Provider | `firebase-auth-provider.tsx` | OK |
| Login/Register Panel | `firebase-email-auth-panel.tsx` | OK |
| Logout | `firebase-email-auth-panel.tsx` | OK |
| Rolle anzeigen | `FirebaseEmailAuthPanel` mit Admin Access | OK |
| Online Link | `SavegamesOnlineLink` | OK |
| Admin Link | `SavegamesAdminLink` | OK |
| Online Auth Gate | `OnlineAuthGate` | OK |
| Admin Auth Gate | `AdminAuthGate` | OK |

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| Offline braucht Login | "Offline" wirkt nicht wirklich offline | Mittel |
| Auth Debug sichtbar bei Fehler | Technisch, kann verunsichern | Niedrig/Mittel |
| Adminrecht nach Login/Token Refresh | Admin kann kurz als nicht berechtigt wirken | Mittel |
| Local Testmodus vs Firebase | Unterschiedliche Realitaeten je Environment | Mittel |
| Mehrere Entry CTAs gleichzeitig | First-Time User muss entscheiden | Mittel |

## Unklare States

- "GM" ist eine Rolle, aber fuer neue User nicht erklaert.
- "Admin + GM" ist technisch korrekt, aber vermischt Spieler- und Tooling-Rolle.
- "Lokaler Testmodus" ist fuer Entwickler gut, fuer Spieler verwirrend.

## Blockierende Bugs

Keine statisch bestaetigten Auth-Blocker. Bekannte externe Risiken:

- Firebase Auth Custom Claim/UID-Allowlist muss im Zielprojekt stimmen.
- ID Token Refresh kann Adminstatus verzoegern.
- Staging-/Production-Projektkonfiguration muss sauber sein.

## Verbesserungsvorschlaege

1. First-Time Zustand staerker fuehren: Login zuerst, danach genau ein primaerer CTA.
2. "Offline" sprachlich zu "Karriere" oder "Lokale Karriere im Account" klaeren.
3. Admin nur als Utility-Link fuer berechtigte User zeigen.
4. Debug Details hinter "Technische Details" verstecken.
5. Rolle erklaeren: "GM = du verwaltest ein Team".

## Minimale Version fuer spielbaren MVP

```text
Nicht eingeloggt:
  Account erstellen / Einloggen

Eingeloggt:
  Name/Email sichtbar
  Rolle sichtbar
  Online spielen aktiv
  Admin nur aktiv, wenn erlaubt
  Logout funktioniert
```
