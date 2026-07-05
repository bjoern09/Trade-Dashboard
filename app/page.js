"use client";

import { useState, useRef, useEffect } from "react";
import Chart from "chart.js/auto";

function RatingBadge({ rating }) {
  return <span className={`badge ${rating}`}>{rating}</span>;
}

function scoreColor(score) {
  if (score >= 4) return "#1e7a34";
  if (score <= -4) return "#a33333";
  return "#b8860b";
}

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  async function handleAnalyze() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fehler bei der Analyse.");
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!result || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = result.priceHistory.map((p) => p.date);
    const closes = result.priceHistory.map((p) => p.close);

    const swingDates = new Set(result.swings.map((s) => s.date));
    const swingPoints = result.priceHistory.map((p) =>
      swingDates.has(p.date) ? p.close : null
    );

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Schlusskurs",
            data: closes,
            borderColor: "#1a1a1a",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: "Schwungpunkte",
            data: swingPoints,
            borderColor: "transparent",
            backgroundColor: "#d85a30",
            pointRadius: 5,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } },
          y: { ticks: { callback: (v) => v } }
        }
      }
    });
  }, [result]);

  return (
    <div className="container">
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>
        Elliott-Wellen & Fundamentaldaten Dashboard
      </h1>
      <p style={{ fontSize: "14px", color: "#6b6b68", marginTop: 0, marginBottom: "1.5rem" }}>
        Edukatives Analyse-Tool. Ticker eingeben, Kursverlauf, Fundamentaldaten und aktuelle News
        werden automatisch geladen und von Claude eingeordnet.
      </p>

      <div className="search-row">
        <input
          type="text"
          placeholder="z.B. AAPL, XPEV, BABA, PYPL"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
        />
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analysiere..." : "Analysieren"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <>
          <div className="card">
            <p className="label">Unternehmen</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
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

          <div className="card">
            <p className="label">Kursverlauf mit erkannten Schwungpunkten</p>
            <div style={{ position: "relative", height: "260px" }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>

          <div className="card">
            <p className="label">Elliott-Wellen-Einordnung (Konfidenz: {result.analysis.waveConfidence})</p>
            <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 8px" }}>
              {result.analysis.wavePhaseLabel}
            </p>
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
            <p className="label">Konfluenz-Score</p>
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
