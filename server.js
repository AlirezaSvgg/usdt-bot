const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const TIMEOUT = 10000;

// ==================== FEES ====================
const EXCHANGE_FEES = {
  Nobitex: { IRT: 0.0025 },
  Wallex: { IRT: 0.003 },
  Bitpin: { IRT: 0.004 },
  OMPFinex: { IRT: 0.0035 },
  Abantether: { IRT: 0.003 },
};

// ==================== HELPERS ====================
async function safeGet(url) {
  try {
    const r = await axios.get(url, { timeout: TIMEOUT });
    return r.data;
  } catch (e) {
    return null;
  }
}

// ==================== EXCHANGES ====================

// Nobitex
app.get("/nobitex", async (req, res) => {
  const d = await safeGet("https://apiv2.nobitex.ir/v3/orderbook/USDTIRT");
  if (!d || d.status !== "ok") return res.json(null);

  const bids = d.bids.map(x => Number(x[0]) / 10);
  const asks = d.asks.map(x => Number(x[0]) / 10);

  res.json({ best_bid: bids[0], best_ask: asks[0] });
});

// Wallex
app.get("/wallex", async (req, res) => {
  const d = await safeGet("https://api.wallex.ir/v1/depth?symbol=USDTTMN");
  if (!d) return res.json(null);

  const r = d.result;
  const bids = r.bid.map(x => Number(x.price));
  const asks = r.ask.map(x => Number(x.price));

  res.json({ best_bid: bids[0], best_ask: asks[0] });
});

// Bitpin
app.get("/bitpin", async (req, res) => {
  const d = await safeGet("https://api.bitpin.ir/api/v1/mth/orderbook/USDT_IRT/");
  if (!d) return res.json(null);

  res.json({
    best_bid: d.bids[0][0],
    best_ask: d.asks[0][0],
  });
});

// OMPFinex (simplified)
app.get("/ompfinex", async (req, res) => {
  const d = await safeGet("https://api.ompfinex.com/v1/orderbook");
  if (!d) return res.json(null);

  const ob = d.data["USDTIRR"];
  const bids = ob.bids.map(x => Number(x.price) / 10);
  const asks = ob.asks.map(x => Number(x.price) / 10);

  res.json({
    best_bid: Math.max(...bids),
    best_ask: Math.min(...asks),
  });
});

// Abantether
app.get("/abantether", async (req, res) => {
  const d = await safeGet("https://api.abantether.com/api/v1/manager/otc/ticker");
  if (!d) return res.json(null);

  const m = d.data.markets.USDTIRT;
  if (!m || !m.active) return res.json(null);

  res.json({
    best_bid: Number(m.sell_price),
    best_ask: Number(m.buy_price),
  });
});

// ==================== AGGREGATE ====================
app.get("/all", async (req, res) => {
  const results = {};

  const apis = {
    Nobitex: "/nobitex",
    Wallex: "/wallex",
    Bitpin: "/bitpin",
    OMPFinex: "/ompfinex",
    Abantether: "/abantether",
  };

  for (const [name, path] of Object.entries(apis)) {
    const d = await safeGet(`http://localhost:3000${path}`);
    if (d) results[name] = d;
  }

  res.json(results);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});