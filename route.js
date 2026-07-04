import {
  getCompanyProfile,
  getHistoricalPrices,
  getKeyMetrics,
  getFinancialRatios,
  getStockNews,
  detectSwingPoints
} from "../../../lib/financialData";
import { runAnalysis } from "../../../lib/claudeAnalysis";

export async function POST(request) {
  try {
    const { ticker } = await request.json();

    if (!ticker || typeof ticker !== "string") {
      return Response.json({ error: "Bitte einen gueltigen Ticker angeben." }, { status: 400 });
    }

    const cleanTicker = ticker.trim().toUpperCase();

    const [profile, prices, keyMetrics, ratios, news] = await Promise.all([
      getCompanyProfile(cleanTicker),
      getHistoricalPrices(cleanTicker),
      getKeyMetrics(cleanTicker),
      getFinancialRatios(cleanTicker),
      getStockNews(cleanTicker)
    ]);

    const swings = detectSwingPoints(prices, 0.05);
    // nur die letzten 12 Schwungpunkte an Claude schicken, sonst wird der Prompt zu lang
    const recentSwings = swings.slice(-12);

    const analysis = await runAnalysis({
      ticker: cleanTicker,
      profile,
      swings: recentSwings,
      keyMetrics,
      ratios,
      news
    });

    return Response.json({
      ticker: cleanTicker,
      profile,
      priceHistory: prices,
      swings: recentSwings,
      news,
      analysis
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message || "Unbekannter Fehler bei der Analyse." }, { status: 500 });
  }
}
