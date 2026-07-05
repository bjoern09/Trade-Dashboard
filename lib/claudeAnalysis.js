const SYSTEM_PROMPT = `Du bist ein Lehrassistent fuer eine Finanzbildungs-Anwendung. Deine Aufgabe ist es, anhand bereitgestellter Kursverlaufs-Schwungpunkte, Fundamentaldaten und Nachrichtenueberschriften eine rein edukative Einordnung im Rahmen der Elliott-Wellen-Theorie und einer fundamentalen Scorecard zu erstellen.

Strikte Regeln:
- Du gibst KEINE Kauf-, Verkaufs- oder Halte-Empfehlung. Keine Formulierungen wie "sollte gekauft werden" oder "guter Einstiegspunkt".
- Du machst deutlich, dass die Elliott-Wellen-Zaehlung grundsaetzlich mehrdeutig ist und mehrere gueltige Zaehlungen existieren koennen.
- Du sprichst in Wahrscheinlichkeiten und Moeglichkeiten, nicht in Gewissheiten ("deutet moeglicherweise auf... hin", nicht "ist").
- Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, ohne Markdown-Codeblock, ohne Praeambel, ohne Erklaerungen davor oder danach.

Das JSON muss exakt dieses Schema haben:
{
  "wavePhaseLabel": string (z.B. "Moeglicherweise Welle 3 einer Impulsbewegung"),
  "waveConfidence": "niedrig" | "mittel" | "hoch",
  "waveReasoning": string (2-3 Saetze, Bezug auf die Schwungpunkte),
  "fundamentals": {
    "revenueGrowth": { "rating": "positiv" | "neutral" | "negativ", "note": string },
    "margin": { "rating": "positiv" | "neutral" | "negativ", "note": string },
    "valuation": { "rating": "positiv" | "neutral" | "negativ", "note": string },
    "balanceSheet": { "rating": "positiv" | "neutral" | "negativ", "note": string },
    "newsSentiment": { "rating": "positiv" | "neutral" | "negativ", "note": string }
  },
  "confluenceScore": number (-10 bis 10, negative Werte = Wellenbild und Fundamentaldaten widersprechen sich bzw. sind beide schwach, positive Werte = beide Ebenen stuetzen sich),
  "confluenceSummary": string (2-3 Saetze, edukativer Ton, keine Handlungsaufforderung),
  "keyRisks": [string, string, string] (3 konkrete Risikofaktoren aus den Daten),
  "disclaimer": "Diese Einordnung ist eine automatisiert erstellte, edukative Illustration der Elliott-Wellen- und Fundamentalanalyse-Methodik auf Basis oeffentlich verfuegbarer Daten. Sie stellt keine Anlageberatung, Kauf- oder Verkaufsempfehlung dar und ersetzt keine eigene Recherche oder professionelle Beratung."
}`;

export async function runAnalysis({ ticker, profile, swings, keyMetrics, ratios, news }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY fehlt in den Umgebungsvariablen.");
  }

  const latestMetrics = keyMetrics[0] || {};
  const latestRatios = ratios[0] || {};

  const userPrompt = `Ticker: ${ticker}
Unternehmen: ${profile.name} (${profile.sector}, ${profile.industry})
Aktueller Kurs: ${profile.price} ${profile.currency}
Marktkapitalisierung: ${profile.marketCap}

Schwungpunkte der letzten ca. 12 Monate (chronologisch, Typ high/low):
${swings.map((s) => `${s.date}: ${s.close} (${s.type})`).join("\n")}

Fundamentale Kennzahlen (neuestes Geschaeftsjahr):
- KGV (P/E): ${latestMetrics.peRatio ?? "n/v"}
- EV/EBITDA: ${latestMetrics.enterpriseValueOverEBITDA ?? "n/v"}
- Nettomarge: ${latestRatios.netProfitMargin ?? "n/v"}
- Verschuldungsgrad (Debt/Equity): ${latestRatios.debtEquityRatio ?? "n/v"}
- Current Ratio: ${latestRatios.currentRatio ?? "n/v"}
- Return on Equity: ${latestRatios.returnOnEquity ?? "n/v"}

Aktuelle Nachrichten-Ueberschriften (nur Titel, letzte Tage):
${news.map((n) => `- ${n.title} (${n.source}, ${n.date})`).join("\n")}

Erstelle die edukative Einordnung gemaess Systemvorgabe.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API Fehler (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock) {
    throw new Error("Claude hat keine Textantwort geliefert.");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Claude-Antwort konnte nicht als JSON geparst werden: " + cleaned.slice(0, 300));
  }
}
