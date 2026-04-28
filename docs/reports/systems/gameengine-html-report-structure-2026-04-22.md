# Struktur & Aufbau des HTML-Reports

Datum: 2026-04-22  
Rolle: Technical Writer, UX Documentation Designer  
Status: Gruen

## Ziel

Dieser Blueprint definiert die Struktur des spaeteren HTML-Reports zur Gameplay-Engine. Er basiert vollstaendig auf der Bestandsanalyse aus Prompt 1 und legt fest:

- Kapitelstruktur
- Inhaltsverzeichnis
- Leserfuehrung
- Tabellen- und Komponentenlogik
- semantisches HTML-Grundgeruest

Der Report soll zwei Ziele gleichzeitig erfuellen:

- fachlich korrekt fuer technische Leser
- verstaendlich fuer Anwender und Projektbeteiligte ohne tiefen Codekontext

## 1. Leitprinzipien fuer den Report

### Verstaendlichkeit

- zuerst erklaeren, was das System tut
- danach zeigen, wie es aufgebaut ist
- technische Details nur dort vertiefen, wo sie den Spielablauf oder die Datenbasis erklaeren

### Leserfuehrung

- vom grossen Bild zum Detail
- vom Ablauf zur Datenbasis
- von der statischen Struktur zur Entscheidungs- und Outcome-Logik

### Transparenz

- Ist-Zustand klar von moeglichen spaeteren Ausbaustufen trennen
- keine impliziten Annahmen ueber produktive Nutzung machen
- sichtbar markieren, wo das Modul schon angeschlossen ist und wo noch nicht

### HTML-Tauglichkeit

- jede Hauptsektion muss eigenstaendig als HTML-Section funktionieren
- Tabellen, Karten und Callouts sollen modular wiederverwendbar sein
- Inhaltsverzeichnis soll direkt auf Section-IDs verlinken koennen

## 2. Finale Kapitelstruktur

Der spaetere HTML-Report soll diese Hauptkapitel haben:

1. Ueberblick Engine
2. Spielablauf
3. Formationen
4. Play Library
5. Entscheidungslogik
6. Spieler-Einfluss
7. Outcome Engine
8. Beispiele
9. Zusammenfassung

## 3. Inhaltsverzeichnis

Empfohlenes Inhaltsverzeichnis fuer den HTML-Report:

1. `#overview-engine` - Ueberblick Engine
2. `#play-flow` - Spielablauf
3. `#formations` - Formationen
4. `#play-library` - Play Library
5. `#decision-logic` - Entscheidungslogik
6. `#player-influence` - Spieler-Einfluss
7. `#outcome-engine` - Outcome Engine
8. `#examples` - Beispiele
9. `#summary` - Zusammenfassung

Optionale Unteranker:

- `#engine-scope`
- `#rules-and-situations`
- `#personnel-packages`
- `#offense-formations`
- `#defense-formations`
- `#offense-play-families`
- `#defense-play-families`
- `#selection-inputs`
- `#selection-modifiers`
- `#matchup-ratings`
- `#outcome-families`
- `#example-snap`

## 4. Abschnittslogik

### 1. Ueberblick Engine

Ziel:

- Leser schnell einordnen lassen, was das Modul ist
- Scope, Hauptsysteme und aktueller Projektstand sofort sichtbar machen

Inhalte:

- drei Kernsysteme
- kurzer Architekturueberblick
- aktueller Integrationsstand im Projekt
- Rulesets und Situationsmodell in Kurzform

Darstellungsform:

- Einleitungstext
- Uebersichtskarten fuer die drei Engines
- kleine Systemtabelle
- Hinweis-Callout zum aktuellen Ist-Stand

### 2. Spielablauf

Ziel:

- erklaeren, wie ein einzelner Snap logisch durch das System laeuft

Inhalte:

- Eingang: Situation + Datenkatalog
- Play Selection
- Pre-Snap Legality
- Outcome Resolution
- optionaler State-Value-/Kalibrierungsbezug

Darstellungsform:

- nummerierter Ablauf
- horizontales Flow-Diagramm oder Prozessleiste
- kleine Tabelle mit Eingaben und Ausgaben pro Schritt

### 3. Formationen

Ziel:

- statische Pre-Snap-Basis erklaeren

Inhalte:

- Personnel Packages
- Offense Formation Families
- Defense Formation Families
- Zusammenhang zwischen Formation und Personnel

Darstellungsform:

- Einfuehrungstext
- separate Tabellen fuer Personnel, Offense-Formationen und Defense-Formationen
- kompakte Labels statt langer Freitexterklaerungen

### 4. Play Library

Ziel:

- die aktive Bibliothek nachvollziehbar und systematisch darstellen

Inhalte:

- Gesamtgroesse des Katalogs
- Offense- und Defense-Familien
- Play-Counts pro Family
- wichtige Unterstrukturen wie Concept, Coverage, Pressure, Front, Motion, Protection

Darstellungsform:

- KPI-Block mit Counts
- Family-Uebersichtstabellen
- zwei Haupttabellen fuer Offense und Defense
- ergaenzende Katalogtabellen fuer Supporting Data

### 5. Entscheidungslogik

Ziel:

- zeigen, nach welchen Signalen die Selection Engine entscheidet

Inhalte:

- Playbooks und Policies
- Situation Classification
- Strategy Profiles
- Modifiers
- Usage Memory / Self-Scout
- Personnel Fit

Darstellungsform:

- Erklaertext
- Signaltabelle mit Ursache und Wirkung
- kompakte Liste der wichtigsten Modifier-Klassen

### 6. Spieler-Einfluss

Ziel:

- klar trennen, wo Spieler aktuell Einfluss haben und wo noch nicht

Inhalte:

- kein direkter Spieler-Rating-Einfluss in der Selection Engine
- struktureller Einfluss in der Legality Engine
- abstrakte Matchup-Ratings in der Outcome Engine
- vorhandene Player Composite Ratings im Projekt
- aktueller Integrationsgap zwischen Player-Ratings und Gameplay-Engine

Darstellungsform:

- Wahr/Falsch- oder Heute/Nicht-Heute-Matrix
- Mapping-Tabelle von Gameplay-Matchups zu vorhandenen Player-Ratings
- Hinweis-Callout fuer den aktuellen Projektstand

### 7. Outcome Engine

Ziel:

- den Ergebnisteil des Systems fachlich greifbar machen

Inhalte:

- Run- und Pass-Pfade
- Outcome Families
- Matchup-Profile
- Modellparameter
- State-Value-Bezug

Darstellungsform:

- kurze Logikbeschreibung
- Outcome-Familien-Tabelle
- Matchup-Attribute-Tabelle
- kompakte Parameteruebersicht auf Familienebene

### 8. Beispiele

Ziel:

- abstrakte Logik in anschauliche Beispiele uebersetzen

Inhalte:

- Beispiel-Snap von Input bis Output
- Beispiel fuer situative Play-Auswahl
- Beispiel fuer Unterschied Run vs Pass
- Beispiel fuer Legality-Fall oder Red-Zone-Fall

Darstellungsform:

- Story-Block mit 4 bis 6 Schritten
- kleine Vorher/Nachher-Tabelle
- ggf. eine Beispielkarte fuer ein Play

### 9. Zusammenfassung

Ziel:

- den Report sauber schliessen
- Kernbefunde und Einordnung wiederholen

Inhalte:

- wichtigste Aussagen in kurzer Form
- Stärken der aktuellen Engine
- aktuelle Grenzen
- ggf. Ausblick auf spaetere Ausbaustufen

Darstellungsform:

- kurzer Text
- 3 bis 5 Key Takeaways

## 5. Empfohlene Leserfuehrung

Der Leserfluss soll so aufgebaut sein:

1. Was ist diese Engine?
2. Wie laeuft ein Snap durch das System?
3. Welche statischen Daten gibt es?
4. Welche Plays und Families existieren?
5. Wie wird entschieden?
6. Wo wirken Spieler?
7. Wie entsteht ein Ergebnis?
8. Wie sieht das in Beispielen aus?
9. Was ist das Gesamtfazit?

Dadurch entsteht eine klare Logik:

- erst Orientierung
- dann Ablauf
- dann Daten
- dann Entscheidungs- und Wirklogik
- am Ende konkrete Beispiele und Einordnung

## 6. Tabellenstruktur

### Tabelle A - Systemuebersicht

Zweck:

- schneller Ueberblick ueber die drei Kernsysteme

Spalten:

- System
- Hauptaufgabe
- wichtigste Eingaben
- wichtigste Ausgaben
- Hauptdatei

### Tabelle B - Rulesets

Zweck:

- Unterschiede NFL vs College kurz zeigen

Spalten:

- Thema
- NFL_PRO
- COLLEGE

### Tabelle C - Personnel Packages

Zweck:

- personelle Grundpakete erklaeren

Spalten:

- ID
- Seite
- Label
- Positionsverteilung
- Gesamtspieler

### Tabelle D - Offense Formationen

Spalten:

- Formation ID
- Label
- Personnel
- typische Nutzung
- Hinweis

### Tabelle E - Defense Formationen

Spalten:

- Formation ID
- Label
- Personnel
- Front-/Coverage-Typ
- Hinweis

### Tabelle F - Offense Play Families

Spalten:

- Family
- Bucket
- Anzahl Plays
- typische Formationen
- typische Situationstags

### Tabelle G - Defense Play Families

Spalten:

- Family
- Bucket
- Anzahl Plays
- typische Formationen
- typische Situationstags

### Tabelle H - Aktive Plays Offense

Spalten:

- Play ID
- Label
- Family
- Formation
- Personnel
- Situationstags

### Tabelle I - Aktive Plays Defense

Spalten:

- Play ID
- Label
- Family
- Formation
- Personnel
- Situationstags

### Tabelle J - Entscheidungsfaktoren

Spalten:

- Faktor
- Engine
- Wirkung auf die Entscheidung
- Beispiel

### Tabelle K - Matchup-Attribute

Spalten:

- Profil
- Attribute
- Nutzung im Outcome
- heutige Datenquelle

### Tabelle L - Outcome Families

Spalten:

- Outcome Family
- Pfad
- typische Bedeutung
- zentrale Einflussgroessen

### Tabelle M - Beispiel-Snap

Spalten:

- Schritt
- Eingabe
- Verarbeitung
- Ergebnis

## 7. HTML-Struktur-Konzept

### Seitenaufbau

Der spaetere HTML-Report soll semantisch so aufgebaut werden:

```html
<body>
  <main class="report-shell">
    <header class="report-header">
      <h1>Gameengine Report</h1>
      <p class="lede">Kurzbeschreibung des Reports.</p>
      <div class="meta-badges"></div>
    </header>

    <nav class="report-toc" aria-label="Inhaltsverzeichnis">
      <ol>
        <li><a href="#overview-engine">Ueberblick Engine</a></li>
        <li><a href="#play-flow">Spielablauf</a></li>
        <li><a href="#formations">Formationen</a></li>
        <li><a href="#play-library">Play Library</a></li>
        <li><a href="#decision-logic">Entscheidungslogik</a></li>
        <li><a href="#player-influence">Spieler-Einfluss</a></li>
        <li><a href="#outcome-engine">Outcome Engine</a></li>
        <li><a href="#examples">Beispiele</a></li>
        <li><a href="#summary">Zusammenfassung</a></li>
      </ol>
    </nav>

    <section id="overview-engine"></section>
    <section id="play-flow"></section>
    <section id="formations"></section>
    <section id="play-library"></section>
    <section id="decision-logic"></section>
    <section id="player-influence"></section>
    <section id="outcome-engine"></section>
    <section id="examples"></section>
    <section id="summary"></section>
  </main>
</body>
```

### Empfohlene HTML-Komponenten

- `header.report-header`
- `nav.report-toc`
- `section.report-section`
- `div.kpi-grid`
- `article.engine-card`
- `div.callout`
- `table.matrix-table`
- `div.flow-strip`
- `article.example-card`

### Komponentenlogik pro Kapitel

- Ueberblick Engine:
  - Header
  - KPI-Grid
  - Engine-Cards
  - kurze Systemtabelle

- Spielablauf:
  - Flow-Strip
  - Schritt-fuer-Schritt-Tabelle

- Formationen:
  - Tabellensektionen
  - optionale Gruppierung per Kartenblock

- Play Library:
  - KPI-Grid
  - Family-Tabellen
  - grosse Play-Tabellen

- Entscheidungslogik:
  - Signaltabelle
  - Callouts fuer wichtige Regeln

- Spieler-Einfluss:
  - Matrix-Tabelle
  - Hinweisbox zum aktuellen Integrationsstand

- Outcome Engine:
  - Outcome-Tabelle
  - Attribut-Mapping-Tabelle

- Beispiele:
  - Example-Cards
  - Vorher/Nachher-Tabellen

## 8. Sprach- und UX-Konzept

### Sprachstil

- kurze Saetze
- wenig Jargon pro Absatz
- Begriffe zuerst fachlich erklaeren, dann technisch benennen
- Dateinamen und Codebegriffe nur punktuell einsetzen

### Leserfreundliche Reihenfolge

- pro Abschnitt zuerst die Frage beantworten
- danach die Daten oder Logik zeigen
- Tabellen nie ohne kurze Einleitung stehen lassen

### Visuelle Hilfen

- KPI-Boxen fuer Zaehler und Kataloggroessen
- Callouts fuer wichtige Ist-Zustands-Hinweise
- Tabellen fuer Vollstaendigkeit
- Beispiele fuer Verstaendnis

### Wichtige UX-Regel

Der Report soll konsequent zwischen diesen drei Ebenen unterscheiden:

- Was das System fachlich macht
- Welche Daten dafuer vorliegen
- Wie die aktuelle technische Implementierung aussieht

## 9. Abdeckung der Inhalte aus Prompt 1

Alle Inhalte aus Prompt 1 sind in der Struktur beruecksichtigt:

- Systeme: Kapitel 1, 2, 5, 7
- Formationen: Kapitel 3
- Personnel Packages: Kapitel 3
- Play Library: Kapitel 4
- Play-Familien und Strukturmodell: Kapitel 4
- Regeln und Situationstaxonomie: Kapitel 1 und 2
- Entscheidungslogik: Kapitel 5
- verwendete Attribute / Ratings: Kapitel 6 und 7
- aktueller Integrationsstand im Projekt: Kapitel 1 und 6
- dokumentationsrelevante Dateien: im spaeteren Report als Quellenhinweise in den passenden Kapiteln

## 10. Empfohlene Umsetzung im naechsten Schritt

Fuer PROMPT 3 bietet sich folgende Arbeitsreihenfolge an:

1. statisches HTML-Grundgeruest anlegen
2. Inhaltsverzeichnis und Kapitelcontainer aufbauen
3. Kapitel 1 bis 4 zuerst fuellen
4. danach Entscheidungslogik, Spieler-Einfluss und Outcome
5. Beispiele und Zusammenfassung zuletzt ergaenzen

## Statuspruefung

- Struktur vollstaendig? `Ja`
- Fuer Anwender verstaendlich aufgebaut? `Ja`
- Alle Inhalte aus Prompt 1 beruecksichtigt? `Ja`

## Abschlussstatus

Status: Gruen

PROMPT 3 kann gestartet werden.
