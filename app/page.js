 "use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Chart from "chart.js/auto";

const QUICK_PICKS = ["QDVE", "XYZ", "XPEV", "BABA", "PYPL", "OCGN"];

const LOADING_STEPS = [
  "Kursverlauf wird geladen...",
  "Fundamentaldaten werden abgerufen...",
  "Schwungpunkte werden erkannt...",
  "Claude ordnet die Wellenstruktur ein...",
  "Fast fertig..."
];

function RatingBadge({ rating }) {
  return <span className={`badge ${rating}`}>{rating}</span>;
}

function scoreColor(score) {
  if (score >= 4) return "#1e7a34";
  if (score <= -4) return "#a33333";
  return "#b8860b";
}

function tendency(score) {
  if (score >= 6) return { label: "Tendenz: deutlich positiv", color: "#1e7a34", bg: "#e6f4ea" };
  if (score >= 2) return { label: "Tendenz: eher positiv", color: "#1e7a34", bg: "#e6f4ea" };
  if (score <= -6) return { label: "Tendenz: deutlich vorsichtig", color: "#a33333", bg: "#fbeaea" };
  if (score <= -2) return { label: "Tendenz: eher vorsichtig", color: "#a33333", bg: "#fbeaea" };
  return { label: "Tendenz: neutral / gemischtes Bild", color: "#8a6d1f", bg: "#faf3e3" };
}

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const debounceRef = useRef(null);
  const stepIntervalRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const runAnalysis = useCallback(async (symbol) => {
    if (!symbol) return;
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setResult(null);
    setShowSuggestions(false);

    stepIntervalRef.current = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1800);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fehler bei der Analyse.");
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(stepIntervalRef.current);
      setLoading(false);
    }
  }, []);

  function handleSelectSuggestion(s) {
    setTicker(s.symbol);
    setQuery(`${s.symbol} \u2014 ${s.name}`);
    runAnalysis(s.symbol);
  }

  function handleQuickPick(symbol) {
    setTicker(symbol);
    setQuery(symbol);
    runAnalysis(symbol);
  }

  function handleManualSubmit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    const looksLikeTicker = /^[A-Za-z0-9.\-]{1,6}$/.test(trimmed);
    runAnalysis(looksLikeTicker ? trimmed.toUpperCase() : ticker || trimmed);
  }

  useEffect(() => {
    if (!result || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const labels = result.priceHistory.map((p) => p.date);
    const closes = result.priceHistory.map((p) => p.close);
    const swingDates = new Set(result.swings.map((s) => s.date));
    const swingPoints = result.priceHistory.map((p) => (swingDates.has(p.date) ? p.close : null));

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Schlusskurs", data: closes, borderColor: "#1a1a1a", borderWidth: 1.5, pointRadius: 0, tension: 0.1 },
          { label: "Schwungpunkte", data: swingPoints, borderColor: "transparent", backgroundColor: "#d85a30", pointRadius: 5, showLine: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { ticks: { callback: (v) => v } } }
      }
    });
  }, [result]);

  const tend = result ? tendency(result.analysis.confluenceScore) : null;

  return (
    <div className="container">
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>
        Elliott-Wellen & Fundamentaldaten Dashboard
      </h1>
      <p style={{ fontSize: "14px", color: "#6b6b68", marginTop: 0, marginBottom: "1.25rem" }}>
        Firmenname oder Ticker eingeben. Kursverlauf, Fundamentaldaten und die Wellen-Einordnung
        werden automatisch geladen.
      </p>

      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div className="search-row" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="z.B. Alibaba, Apple, PayPal oder AAPL"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
          />
          <button onClick={handleManualSubmit} disabled={loading}>
            {loading ? "Analysiere..." : "Analysieren"}
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-box">
            {suggestions.map((s) => (
              <div key={s.symbol} className="suggestion-item" onClick={() => handleSelectSuggestion(s)}>
                <span style={{ fontWeight: 500 }}>{s.symbol}</span>
                <span style={{ color: "#6b6b68", marginLeft: "8px", fontSize: "13px" }}>
                  {s.name} {s.exchange ? `\u00b7 ${s.exchange}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "12.5px", color: "#8a8a86", marginRight: "4px", alignSelf: "center" }}>
          Schnellauswahl:
        </span>
        {QUICK_PICKS.map((t) => (
          <button
            key={t}
            onClick={() => handleQuickPick(t)}
            disabled={loading}
            style={{
              padding: "4px 12px",
              fontSize: "13px",
              background: "#fff",
              color: "#1a1a1a",
              border: "1px solid #d0d0cd"
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="spinner"></div>
          <span style={{ fontSize: "14px", color: "#3a3a38" }}>{LOADING_STEPS[loadingStep]}</span>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="card">
            <p className="label">Unternehmen</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
              <div>
                <span style={{ fontSize: "18px", fontWeight: 500 }}>{result.profile.name}</span>
                <span style={{ fontSize: "13px", color: "#6b6b68", marginLeft: "8px" }}>
                  {result.ticker} &middot; {result.profile.sector}
                </span>
              </div>
              <span style={{ fontSize: "18px", fontWeight: 500 }}>
                {result.profile.price} {result.profile.currency}
              </span>
            </div>
          </div>

          <div
            className="card"
            style={{ background: tend.bg, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}
          >
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: tend.color, margin: 0 }}>{tend.label}</p>
              <p style={{ fontSize: "12.5px", color: "#5a5a56", margin: "4px 0 0" }}>
                Abgeleitet aus dem Konfluenz-Score unten &mdash; keine Kauf-, Halte- oder Verkaufsempfehlung.
              </p>
            </div>
            <span style={{ fontSize: "22px", fontWeight: 600, color: tend.color }}>
              {result.analysis.confluenceScore > 0 ? "+" : ""}
              {result.analysis.confluenceScore}
            </span>
          </div>

          <div className="card">
            <p className="label">Kursverlauf mit erkannten Schwungpunkten</p>
            <div style={{ position: "relative", height: "260px" }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="card">
            <p className="label">Elliott-Wellen-Einordnung (Konfidenz: {result.analysis.waveConfidence})</p>
            <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 8px" }}>{result.analysis.wavePhaseLabel}</p>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#3a3a38", margin: 0 }}>
              {result.analysis.waveReasoning}
            </p>
          </div>

          <div className="card">
            <p className="label">Fundamentaldaten-Scorecard</p>
            {Object.entries(result.analysis.fundamentals).map(([key, val]) => (
              <div className="rating-row" key={key}>
                <div>
                  <div style={{ fontSize: "14px" }}>{key}</div>
                  <div style={{ fontSize: "12.5px", color: "#8a8a86" }}>{val.note}</div>
                </div>
                <RatingBadge rating={val.rating} />
              </div>
            ))}
          </div>

          <div className="card">
            <p className="label">Konfluenz-Score im Detail</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "24px", fontWeight: 500 }}>
                {result.analysis.confluenceScore > 0 ? "+" : ""}
                {result.analysis.confluenceScore}
              </span>
              <span style={{ fontSize: "13px", color: "#8a8a86" }}>von -10 bis +10</span>
            </div>
            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{
                  width: `${((result.analysis.confluenceScore + 10) / 20) * 100}%`,
                  background: scoreColor(result.analysis.confluenceScore)
                }}
              ></div>
            </div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#3a3a38", marginTop: "12px" }}>
              {result.analysis.confluenceSummary}
            </p>
          </div>

          <div className="card">
            <p className="label">Zentrale Risikofaktoren</p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "14px", lineHeight: 1.7 }}>
              {result.analysis.keyRisks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <p className="label">Aktuelle Nachrichten (nur Titel)</p>
            {result.newsUnavailable && (
              <p style={{ fontSize: "13px", color: "#8a8a86", margin: "0 0 8px" }}>
                News-Daten sind im aktuellen FMP-Plan nicht verfuegbar. Die Einordnung basiert auf
                Kursverlauf und Fundamentaldaten.
              </p>
            )}
            {!result.newsUnavailable && result.news.length === 0 && (
              <p style={{ fontSize: "13px", color: "#8a8a86", margin: 0 }}>Keine aktuellen News gefunden.</p>
            )}
            {result.news.map((n, i) => (
              <div className="news-item" key={i}>
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  {n.title}
                </a>
                <div style={{ fontSize: "12px", color: "#8a8a86" }}>
                  {n.source} &middot; {n.date}
                </div>
              </div>
            ))}
          </div>

          <div className="disclaimer">{result.analysis.disclaimer}</div>
        </>
      )}
    </div>
  );
}
