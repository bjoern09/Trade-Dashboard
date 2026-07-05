const FMP_BASE = "https://financialmodelingprep.com/stable";

async function fmpGet(path) {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error("FMP_API_KEY fehlt in den Umgebungsvariablen.");
  }
  const separator = path.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${path}${separator}apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FMP Anfrage fehlgeschlagen (${res.status}) fuer ${path}. ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function getCompanyProfile(ticker) {
  const data = await fmpGet(`/profile?symbol=${ticker}`);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Kein Profil gefunden fuer Ticker "${ticker}". Bitte Schreibweise pruefen (z.B. AAPL, XPEV, BABA, PYPL).`);
  }
  const p = data[0];
  return {
    name: p.companyName,
    sector: p.sector,
    industry: p.industry,
    price: p.price,
    currency: p.currency,
    marketCap: p.marketCap ?? p.mktCap,
    description: p.description
  };
}

export async function getHistoricalPrices(ticker, days = 260) {
  const data = await fmpGet(`/historical-price-eod/full?symbol=${ticker}`);
  const rows = Array.isArray(data) ? data : data?.historical;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Keine historischen Kursdaten gefunden fuer "${ticker}".`);
  }
  return rows
    .slice(0, days)
    .map((d) => ({ date: d.date, close: d.close }))
    .reverse();
}

export async function getKeyMetrics(ticker) {
  const data = await fmpGet(`/key-metrics?symbol=${ticker}&period=annual&limit=5`);
  return Array.isArray(data) ? data : [];
}

export async function getFinancialRatios(ticker) {
  const data = await fmpGet(`/ratios?symbol=${ticker}&period=annual&limit=5`);
  return Array.isArray(data) ? data : [];
}

export async function getStockNews(ticker, limit = 8) {
  const data = await fmpGet(`/news/stock?symbols=${ticker}&limit=${limit}`);
  if (!Array.isArray(data)) return [];
  return data.map((n) => ({
    title: n.title,
    source: n.site ?? n.publisher ?? n.source,
    date: n.publishedDate ?? n.date,
    url: n.url
  }));
}

export async function searchCompanies(query) {
  const [byName, bySymbol] = await Promise.all([
    fmpGet(`/search-name?query=${encodeURIComponent(query)}&limit=8`).catch(() => []),
    fmpGet(`/search-symbol?query=${encodeURIComponent(query)}&limit=8`).catch(() => [])
  ]);

  const merged = [...(byName || []), ...(bySymbol || [])];
  const seen = new Set();
  const deduped = [];
  for (const item of merged) {
    if (!item.symbol || seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    deduped.push({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchangeShortName ?? item.stockExchange ?? item.exchange ?? ""
    });
  }
  return deduped.slice(0, 8);
}

export function detectSwingPoints(prices, threshold = 0.05) {
  if (prices.length < 3) return [];

  const swings = [];
  let lastExtreme = prices[0];
  let direction = null;

  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i].close - lastExtreme.close) / lastExtreme.close;

    if (direction === null) {
      if (Math.abs(change) >= threshold) {
        direction = change > 0 ? "up" : "down";
        swings.push({ ...lastExtreme, type: direction === "up" ? "low" : "high" });
        lastExtreme = prices[i];
      }
      continue;
    }

    if (direction === "up") {
      if (prices[i].close > lastExtreme.close) {
        lastExtreme = prices[i];
      } else if ((lastExtreme.close - prices[i].close) / lastExtreme.close >= threshold) {
        swings.push({ ...lastExtreme, type: "high" });
        direction = "down";
        lastExtreme = prices[i];
      }
    } else {
      if (prices[i].close < lastExtreme.close) {
        lastExtreme = prices[i];
      } else if ((prices[i].close - lastExtreme.close) / lastExtreme.close >= threshold) {
        swings.push({ ...lastExtreme, type: "low" });
        direction = "up";
        lastExtreme = prices[i];
      }
    }
  }

  swings.push({ ...lastExtreme, type: direction === "up" ? "high" : "low" });
  return swings;
}
