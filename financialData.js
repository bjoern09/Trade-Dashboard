const FMP_BASE = "https://financialmodelingprep.com/api/v3";

async function fmpGet(path) {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error("FMP_API_KEY fehlt in den Umgebungsvariablen.");
  }
  const separator = path.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${path}${separator}apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FMP Anfrage fehlgeschlagen (${res.status}) fuer ${path}`);
  }
  return res.json();
}

export async function getCompanyProfile(ticker) {
  const data = await fmpGet(`/profile/${ticker}`);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Kein Profil gefunden fuer Ticker "${ticker}". Bitte Schreibweise pruefen (z.B. AAPL, XPEV, BABA).`);
  }
  const p = data[0];
  return {
    name: p.companyName,
    sector: p.sector,
    industry: p.industry,
    price: p.price,
    currency: p.currency,
    marketCap: p.mktCap,
    description: p.description
  };
}

export async function getHistoricalPrices(ticker, days = 260) {
  const data = await fmpGet(`/historical-price-full/${ticker}?timeseries=${days}`);
  if (!data || !Array.isArray(data.historical)) {
    throw new Error(`Keine historischen Kursdaten gefunden fuer "${ticker}".`);
  }
  // FMP liefert neueste zuerst -> chronologisch sortieren
  return data.historical
    .map((d) => ({ date: d.date, close: d.close }))
    .reverse();
}

export async function getKeyMetrics(ticker) {
  const data = await fmpGet(`/key-metrics/${ticker}?period=annual&limit=5`);
  return Array.isArray(data) ? data : [];
}

export async function getFinancialRatios(ticker) {
  const data = await fmpGet(`/ratios/${ticker}?period=annual&limit=5`);
  return Array.isArray(data) ? data : [];
}

export async function getStockNews(ticker, limit = 8) {
  const data = await fmpGet(`/stock_news?tickers=${ticker}&limit=${limit}`);
  if (!Array.isArray(data)) return [];
  // Nur Titel/Quelle/Datum/Link uebernehmen, keine Volltexte -> Urheberrecht
  return data.map((n) => ({
    title: n.title,
    source: n.site,
    date: n.publishedDate,
    url: n.url
  }));
}

// Einfache Zickzack-Erkennung fuer Schwungpunkte (Elliott-Wellen-Rohmaterial)
// threshold = Mindestbewegung in Prozent, um als neuer Schwungpunkt zu gelten
export function detectSwingPoints(prices, threshold = 0.05) {
  if (prices.length < 3) return [];

  const swings = [];
  let lastExtreme = prices[0];
  let lastExtremeIndex = 0;
  let direction = null; // 'up' | 'down'

  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i].close - lastExtreme.close) / lastExtreme.close;

    if (direction === null) {
      if (Math.abs(change) >= threshold) {
        direction = change > 0 ? "up" : "down";
        swings.push({ ...lastExtreme, type: direction === "up" ? "low" : "high" });
        lastExtreme = prices[i];
        lastExtremeIndex = i;
      }
      continue;
    }

    if (direction === "up") {
      if (prices[i].close > lastExtreme.close) {
        lastExtreme = prices[i];
        lastExtremeIndex = i;
      } else if ((lastExtreme.close - prices[i].close) / lastExtreme.close >= threshold) {
        swings.push({ ...lastExtreme, type: "high" });
        direction = "down";
        lastExtreme = prices[i];
        lastExtremeIndex = i;
      }
    } else {
      if (prices[i].close < lastExtreme.close) {
        lastExtreme = prices[i];
        lastExtremeIndex = i;
      } else if ((prices[i].close - lastExtreme.close) / lastExtreme.close >= threshold) {
        swings.push({ ...lastExtreme, type: "low" });
        direction = "up";
        lastExtreme = prices[i];
        lastExtremeIndex = i;
      }
    }
  }

  // letzten Extrempunkt noch anhaengen
  swings.push({ ...lastExtreme, type: direction === "up" ? "high" : "low" });
  return swings;
}
