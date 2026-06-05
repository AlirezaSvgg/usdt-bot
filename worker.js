export default {
  async fetch(request) {

    const url = new URL(request.url);
    const investment = Number(url.searchParams.get("investment") || 20000000);

    const fetchJSON = async (u) => {
      try {
        const r = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        return await r.json();
      } catch {
        return null;
      }
    };

    // ================= FEES =================
    const FEES = {
      Nobitex: { IRT: 0.0025 },
      Wallex: { IRT: 0.003 },
      Bitpin: { IRT: 0.004 },
      OMPFinex: { IRT: 0.0035 },
      Abantether: { IRT: 0.003 }
    };

    // ================= EXCHANGES =================

    const nobitex = async () => {
      const r = await fetchJSON("https://apiv2.nobitex.ir/v3/orderbook/USDTIRT");
      if (!r || r.status !== "ok") return null;

      return {
        bid: Number(r.bids[0][0]) / 10,
        ask: Number(r.asks[0][0]) / 10
      };
    };

    const wallex = async () => {
      const r = await fetchJSON("https://api.wallex.ir/v1/depth?symbol=USDTTMN");
      if (!r) return null;

      return {
        bid: Number(r.result.bid[0].price),
        ask: Number(r.result.ask[0].price)
      };
    };

    const bitpin = async () => {
      const r = await fetchJSON("https://api.bitpin.ir/api/v1/mth/orderbook/USDT_IRT/");
      if (!r) return null;

      return {
        bid: Number(r.bids[0][0]),
        ask: Number(r.asks[0][0])
      };
    };

    const ompfinex = async () => {
      const r = await fetchJSON("https://api.ompfinex.com/v1/orderbook");
      if (!r || r.status !== "OK") return null;

      const d = r.data["USDTIRR"];
      if (!d) return null;

      const asks = d.asks.sort((a,b)=>Number(a.price)-Number(b.price));
      const bids = d.bids.sort((a,b)=>Number(a.price)-Number(b.price)).reverse();

      return {
        bid: Number(bids[0].price) / 10,
        ask: Number(asks[0].price) / 10
      };
    };

    const abantether = async () => {
      const r = await fetchJSON("https://api.abantether.com/api/v1/manager/otc/ticker");
      if (!r) return null;

      const m = r.data?.markets?.USDTIRT;
      if (!m) return null;

      return {
        bid: Number(m.sell_price),
        ask: Number(m.buy_price)
      };
    };

    const [n, w, b, o, a] = await Promise.all([
      nobitex(),
      wallex(),
      bitpin(),
      ompfinex(),
      abantether()
    ]);

    const exchanges = {
      Nobitex: n,
      Wallex: w,
      Bitpin: b,
      OMPFinex: o,
      Abantether: a
    };

    const valid = Object.entries(exchanges).filter(e => e[1]);

    if (valid.length < 2) {
      return Response.json({ error: "Not enough data" });
    }

    // ================= BEST BUY / SELL =================
    const bestBuy = valid.reduce((min, cur) =>
      cur[1].ask < min[1].ask ? cur : min
    );

    const bestSell = valid.reduce((max, cur) =>
      cur[1].bid > max[1].bid ? cur : max
    );

    const buyExchange = bestBuy[0];
    const sellExchange = bestSell[0];

    const buyPrice = bestBuy[1].ask;
    const sellPrice = bestSell[1].bid;

    const buyFee = FEES[buyExchange].IRT;
    const sellFee = FEES[sellExchange].IRT;

    // ================= EXACT PERSIAN MODEL =================
    const tomanAfterBuyFee = investment * (1 - buyFee);
    const usdt = tomanAfterBuyFee / buyPrice;

    const sellToman = usdt * sellPrice;

    const grossProfit = sellToman - investment;

    const totalFee =
      investment * buyFee +
      sellToman * sellFee;

    const netProfit = grossProfit - totalFee;

    const netPercent = (netProfit / investment) * 100;

    return Response.json({
      investment,

      exchanges,

      bestBuy: {
        exchange: buyExchange,
        price: buyPrice,
        fee: buyFee
      },

      bestSell: {
        exchange: sellExchange,
        price: sellPrice,
        fee: sellFee
      },

      profit: {
        gross: grossProfit,
        fees: totalFee,
        net: netProfit,
        netPercent
      }
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};