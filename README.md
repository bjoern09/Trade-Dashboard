# Elliott-Wellen & Fundamentaldaten Dashboard

Edukatives Analyse-Tool. Du gibst einen Ticker ein, die App zieht automatisch:
- Kursverlauf (letzte ~12 Monate) + erkannte Schwungpunkte (Zickzack-Algorithmus)
- Fundamentalkennzahlen (KGV, Marge, Verschuldung, Eigenkapitalrendite, ...)
- Aktuelle News-Ueberschriften

...und laesst Claude daraus eine edukative Elliott-Wellen-Einordnung plus eine
Fundamentaldaten-Scorecard mit Konfluenz-Score erstellen. Das Tool gibt **keine
Kauf-/Verkaufsempfehlung**, sondern ordnet die Methodik illustrativ ein.

## Wichtiger Hinweis

Dies ist ein Lern-/Analyse-Werkzeug fuer den Eigengebrauch. Bevor du es anderen
Personen gegen Geld zur Verfuegung stellst, sprich mit einem Anwalt fuer
Kapitalmarktrecht (WpHG/BaFin-Thematik bei automatisierten, ticker-bezogenen
Einordnungen fuer Dritte).

## Deployment OHNE lokale Installation (Firmenlaptop-tauglich)

Du brauchst nichts herunterzuladen oder zu installieren. Alles laeuft ueber den
Browser.

### Schritt 1: Kostenlose API-Keys holen

1. **Financial Modeling Prep** (Kurs-/Fundamentaldaten, News):
   - Gehe zu https://site.financialmodelingprep.com/pricing-plans
   - "Free Plan" waehlen, mit E-Mail registrieren (keine Kreditkarte noetig)
   - Den API-Key aus dem Dashboard kopieren (250 Anfragen/Tag reichen locker)

2. **Anthropic API-Key** (fuer die Claude-Analyse):
   - Gehe zu https://console.anthropic.com/settings/keys
   - Neuen Key erstellen und kopieren
   - Hinweis: Die API ist nutzungsbasiert kostenpflichtig (Cent-Betraege pro
     Analyse bei Sonnet), aber es gibt kein Abo, du zahlst nur was du nutzt

### Schritt 2: Code auf GitHub hochladen (nur Browser)

1. Account erstellen auf https://github.com (falls noch nicht vorhanden)
2. Neues Repository anlegen: "New repository" -> Name vergeben (z.B.
   `elliott-dashboard`) -> "Create repository"
3. Auf der leeren Repo-Seite auf "uploading an existing file" klicken
4. **Alle Dateien und Ordner aus diesem Projekt** per Drag & Drop in das
   Browser-Fenster ziehen (die komplette Ordnerstruktur beibehalten)
5. Unten "Commit changes" klicken

Kein Terminal, kein Git-Kommandozeilen-Tool noetig.

### Schritt 3: Bei Vercel deployen (nur Browser)

1. Account erstellen auf https://vercel.com (Login funktioniert direkt mit
   deinem GitHub-Account)
2. "Add New..." -> "Project"
3. Dein gerade hochgeladenes GitHub-Repo auswaehlen -> "Import"
4. Bei "Environment Variables" die beiden Keys eintragen:
   - `FMP_API_KEY` = dein FMP-Key
   - `ANTHROPIC_API_KEY` = dein Anthropic-Key
5. "Deploy" klicken

Vercel baut die App auf ihren Servern (nicht auf deinem Laptop) und gibt dir
danach eine Live-URL wie `https://elliott-dashboard.vercel.app`.

### Schritt 4: Nutzen

Einfach die URL im Browser oeffnen, Ticker eingeben (z.B. `AAPL`, `XPEV`,
`BABA`), auf "Analysieren" klicken.

## Spaeter aktualisieren

Wenn du Code-Aenderungen brauchst: neue Version der Datei(en) im GitHub-Repo
ueber "Edit" oder erneuten Upload ersetzen -> Vercel deployed automatisch neu.

## Technischer Aufbau

```
app/page.js              -> Frontend (Eingabe, Chart, Dashboard-Anzeige)
app/api/analyze/route.js -> Backend-Route: holt Daten, ruft Claude auf
lib/financialData.js     -> FMP-Datenabruf + Zickzack-Schwungpunkt-Erkennung
lib/claudeAnalysis.js    -> Prompt-Bau + Anthropic API Aufruf
```

## Bekannte Grenzen

- FMP Free Plan: 250 Anfragen/Tag, US- und viele internationale Ticker
  abgedeckt, aber nicht jede Nebenwerte-Aktie
- Die Elliott-Wellen-Zaehlung ist ein vereinfachtes, automatisiertes Modell auf
  Basis eines Zickzack-Schwellenwerts (5%) - keine professionelle Chartanalyse
- Claude-Ausgabe ist bewusst auf edukative, nicht-empfehlende Sprache trainiert
  (siehe System-Prompt in `lib/claudeAnalysis.js`)
