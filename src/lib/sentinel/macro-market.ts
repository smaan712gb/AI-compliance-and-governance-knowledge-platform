// ============================================
// SENTINEL — Macro Market Radar
// Real-time market signals for geopolitical risk
// Uses FMP stable API (financialmodelingprep.com/stable/)
// ============================================

// --- Types ---

export interface MarketSignal {
  indicator: string;
  value: number;
  change: number;
  changeDirection: "up" | "down" | "flat";
  significance: "critical" | "high" | "medium" | "low";
  geopoliticalContext: string;
}

export interface CommoditySnapshot {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  dayHigh: number;
  dayLow: number;
  geopoliticalRelevance: string;
}

export interface ForexSnapshot {
  pair: string;
  price: number;
  change: number;
  changesPercentage: number;
  stabilitySignal: "stable" | "volatile" | "crisis";
}

export interface SectorPerformance {
  sector: string;
  changesPercentage: number;
  geopoliticalExposure: "high" | "medium" | "low";
}

export interface TreasurySnapshot {
  date: string;
  month1: number;
  month6: number;
  year1: number;
  year2: number;
  year5: number;
  year10: number;
  year30: number;
  yieldCurveInverted: boolean;
}

export interface MacroMarketReport {
  timestamp: string;
  overallRiskLevel: "critical" | "elevated" | "moderate" | "low";
  riskScore: number;
  signals: MarketSignal[];
  commodities: CommoditySnapshot[];
  forex: ForexSnapshot[];
  sectors: SectorPerformance[];
  treasury: TreasurySnapshot | null;
  fearGreedIndicators: {
    vixLevel: number | null;
    goldOilRatio: number | null;
    yieldSpread: number | null;
  };
}

// --- Constants ---

export const GEOPOLITICAL_COMMODITIES: Record<string, string> = {
  CLUSD: "Energy supply disruption indicator — spikes during Gulf tensions, sanctions",
  GCUSD: "Safe-haven demand — rises during geopolitical uncertainty",
  WHEATUSD: "Food security indicator — disrupted by Black Sea conflicts",
  NGUSD: "European energy security — sensitive to Russia-EU tensions",
  SIUSD: "Industrial/safe-haven hybrid — tracks manufacturing + uncertainty",
  HGUSD: "Global industrial activity proxy — drops signal economic slowdown",
};

export const GEOPOLITICAL_FOREX_PAIRS: Record<string, string> = {
  EURUSD: "EU economic stability — drops during European crises",
  GBPUSD: "UK stability — sensitive to Brexit aftermath, trade policy",
  USDJPY: "Risk appetite proxy — JPY strengthens in risk-off moves",
  USDCNY: "US-China trade tension barometer",
  USDRUB: "Russia sanctions pressure — spikes during escalation",
  USDTRY: "Turkish economic/political fragility signal",
  USDBRL: "Latin American risk sentiment — tracks EM contagion",
  USDARS: "Argentine crisis indicator — hyperinflation/default risk",
};

/** Sector ETF symbols → sector name + geopolitical exposure */
const SECTOR_ETFS: Record<string, { sector: string; exposure: "high" | "medium" | "low" }> = {
  XLE: { sector: "Energy", exposure: "high" },
  XLB: { sector: "Basic Materials", exposure: "high" },
  XLU: { sector: "Utilities", exposure: "high" },
  XLI: { sector: "Industrials", exposure: "high" },
  XLF: { sector: "Financial Services", exposure: "medium" },
  XLK: { sector: "Technology", exposure: "medium" },
  XLV: { sector: "Healthcare", exposure: "medium" },
  XLP: { sector: "Consumer Defensive", exposure: "low" },
  XLRE: { sector: "Real Estate", exposure: "low" },
  XLC: { sector: "Communication Services", exposure: "low" },
  XLY: { sector: "Consumer Cyclical", exposure: "medium" },
};

export const SECTOR_GEO_EXPOSURE: Record<string, "high" | "medium" | "low"> = {
  Energy: "high",
  "Basic Materials": "high",
  Utilities: "high",
  Industrials: "high",
  "Financial Services": "medium",
  Technology: "medium",
  Healthcare: "medium",
  "Consumer Defensive": "low",
  "Real Estate": "low",
  "Communication Services": "low",
  "Consumer Cyclical": "medium",
  Financial: "medium",
};

// --- FMP Stable API Helpers ---

const FMP_BASE = "https://financialmodelingprep.com/stable";

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY not configured");
  return key;
}

async function fmpFetch<T>(endpoint: string): Promise<T> {
  const apiKey = getApiKey();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${FMP_BASE}${endpoint}${separator}apikey=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`FMP API timeout for ${endpoint}`);
    }
    throw error;
  }
}

// --- Raw FMP response types ---

interface FmpQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercentage: number;   // FMP stable API field name (no 's')
  dayHigh: number;
  dayLow: number;
}

interface FmpTreasuryRate {
  date: string;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  year1: number;
  year2: number;
  year3: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

// --- Data Fetchers (FMP Stable API) ---

/** Fetch a single symbol quote from /stable/quote?symbol=SYM */
async function fetchQuote(symbol: string): Promise<FmpQuote | null> {
  try {
    const data = await fmpFetch<FmpQuote[]>(`/quote?symbol=${encodeURIComponent(symbol)}`);
    return data && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

/** Fetch multiple quotes in parallel (stable API requires one request per symbol) */
async function fetchQuotes(symbols: string[]): Promise<FmpQuote[]> {
  const results = await Promise.allSettled(symbols.map(fetchQuote));
  const quotes: FmpQuote[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      quotes.push(r.value);
    }
  }
  return quotes;
}

/** Fetch geopolitically relevant commodity quotes */
export async function fetchCommodities(): Promise<CommoditySnapshot[]> {
  const symbols = Object.keys(GEOPOLITICAL_COMMODITIES);
  const quotes = await fetchQuotes(symbols);

  return quotes.map((q) => ({
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    changesPercentage: q.changePercentage,
    dayHigh: q.dayHigh,
    dayLow: q.dayLow,
    geopoliticalRelevance:
      GEOPOLITICAL_COMMODITIES[q.symbol] ?? "General commodity indicator",
  }));
}

/** Fetch forex pairs with stability classification */
export async function fetchForex(): Promise<ForexSnapshot[]> {
  const pairs = Object.keys(GEOPOLITICAL_FOREX_PAIRS);
  const quotes = await fetchQuotes(pairs);

  return quotes.map((q) => {
    const absChange = Math.abs(q.changePercentage);
    let stabilitySignal: ForexSnapshot["stabilitySignal"];
    if (absChange > 3) {
      stabilitySignal = "crisis";
    } else if (absChange > 1) {
      stabilitySignal = "volatile";
    } else {
      stabilitySignal = "stable";
    }

    return {
      pair: q.symbol,
      price: q.price,
      change: q.change,
      changesPercentage: q.changePercentage,
      stabilitySignal,
    };
  });
}

/** Fetch latest US Treasury rates from /stable/treasury-rates */
export async function fetchTreasury(): Promise<TreasurySnapshot | null> {
  const rates = await fmpFetch<FmpTreasuryRate[]>("/treasury-rates");

  if (!rates || rates.length === 0) return null;

  const latest = rates[0];

  return {
    date: latest.date,
    month1: latest.month1,
    month6: latest.month6,
    year1: latest.year1,
    year2: latest.year2,
    year5: latest.year5,
    year10: latest.year10,
    year30: latest.year30,
    yieldCurveInverted: latest.year2 > latest.year10,
  };
}

/** Fetch sector performance using sector ETF quotes as proxy */
export async function fetchSectorPerformance(): Promise<SectorPerformance[]> {
  const etfSymbols = Object.keys(SECTOR_ETFS);
  const quotes = await fetchQuotes(etfSymbols);

  return quotes.map((q) => {
    const etfInfo = SECTOR_ETFS[q.symbol];
    return {
      sector: etfInfo?.sector ?? q.symbol,
      changesPercentage: q.changePercentage,
      geopoliticalExposure: etfInfo?.exposure ?? "medium",
    };
  });
}

/** Fetch CBOE Volatility Index (VIX) */
export async function fetchVIX(): Promise<number | null> {
  const quote = await fetchQuote("^VIX");
  return quote?.price ?? null;
}

// --- Signal Generation ---

function classifyDirection(change: number): MarketSignal["changeDirection"] {
  if (change > 0.1) return "up";
  if (change < -0.1) return "down";
  return "flat";
}

export function generateMarketSignals(
  commodities: CommoditySnapshot[],
  forex: ForexSnapshot[],
  treasury: TreasurySnapshot | null,
  vix: number | null,
): MarketSignal[] {
  const signals: MarketSignal[] = [];

  // --- Commodity signals ---
  for (const c of commodities) {
    const absChange = Math.abs(c.changesPercentage);

    if ((c.symbol === "CLUSD" || c.symbol === "WHEATUSD") && absChange > 5) {
      signals.push({
        indicator: `${c.name} (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: classifyDirection(c.changesPercentage),
        significance: absChange > 10 ? "critical" : "high",
        geopoliticalContext:
          "Energy supply disruption — potential sanctions escalation or conflict near production zones",
      });
    } else if (c.symbol === "CLUSD" && absChange > 3) {
      signals.push({
        indicator: `Crude Oil (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: classifyDirection(c.changesPercentage),
        significance: "medium",
        geopoliticalContext:
          "Moderate oil price movement — monitoring for supply disruption signals",
      });
    }

    if (c.symbol === "GCUSD" && absChange > 3) {
      signals.push({
        indicator: `Gold (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: classifyDirection(c.changesPercentage),
        significance: absChange > 5 ? "critical" : "high",
        geopoliticalContext:
          "Flight to safety — investors hedging against geopolitical uncertainty",
      });
    }

    if (c.symbol === "WHEATUSD" && absChange > 5) {
      signals.push({
        indicator: `Wheat (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: classifyDirection(c.changesPercentage),
        significance: "high",
        geopoliticalContext:
          "Food security threat — potential Black Sea supply disruption or export restrictions",
      });
    }

    if (c.symbol === "NGUSD" && absChange > 5) {
      signals.push({
        indicator: `Natural Gas (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: classifyDirection(c.changesPercentage),
        significance: absChange > 10 ? "critical" : "high",
        geopoliticalContext:
          "European energy security stress — sensitive to Russia-EU pipeline politics",
      });
    }

    if (c.symbol === "HGUSD" && c.changesPercentage < -3) {
      signals.push({
        indicator: `Copper (${c.symbol})`,
        value: c.price,
        change: c.changesPercentage,
        changeDirection: "down",
        significance: "medium",
        geopoliticalContext:
          "Industrial slowdown signal — declining copper demand suggests global economic weakening",
      });
    }
  }

  // --- VIX signals ---
  if (vix !== null) {
    if (vix > 30) {
      signals.push({
        indicator: "CBOE VIX (Fear Index)",
        value: vix,
        change: 0,
        changeDirection: "up",
        significance: "critical",
        geopoliticalContext:
          "Extreme market fear — historically associated with geopolitical crises, pandemics, or systemic shocks",
      });
    } else if (vix > 20) {
      signals.push({
        indicator: "CBOE VIX (Fear Index)",
        value: vix,
        change: 0,
        changeDirection: "up",
        significance: "high",
        geopoliticalContext:
          "Elevated market uncertainty — risk-off sentiment building across asset classes",
      });
    }
  }

  // --- Treasury signals ---
  if (treasury) {
    if (treasury.yieldCurveInverted) {
      const spread = treasury.year10 - treasury.year2;
      signals.push({
        indicator: "US Yield Curve (2Y-10Y Spread)",
        value: spread,
        change: 0,
        changeDirection: "down",
        significance: "high",
        geopoliticalContext:
          "Yield curve inversion — recession risk signal, historically precedes economic downturns by 6-18 months",
      });
    }
  }

  // --- Forex signals ---
  const emPairs = ["USDRUB", "USDTRY", "USDARS", "USDBRL"];
  for (const fx of forex) {
    if (emPairs.includes(fx.pair) && fx.stabilitySignal === "crisis") {
      signals.push({
        indicator: `${fx.pair} Exchange Rate`,
        value: fx.price,
        change: fx.changesPercentage,
        changeDirection: classifyDirection(fx.changesPercentage),
        significance: "high",
        geopoliticalContext:
          `Emerging market currency stress — ${GEOPOLITICAL_FOREX_PAIRS[fx.pair] ?? "currency instability"}`,
      });
    } else if (emPairs.includes(fx.pair) && fx.stabilitySignal === "volatile") {
      signals.push({
        indicator: `${fx.pair} Exchange Rate`,
        value: fx.price,
        change: fx.changesPercentage,
        changeDirection: classifyDirection(fx.changesPercentage),
        significance: "medium",
        geopoliticalContext:
          `Emerging market volatility — ${GEOPOLITICAL_FOREX_PAIRS[fx.pair] ?? "monitoring for escalation"}`,
      });
    }

    if (!emPairs.includes(fx.pair) && fx.stabilitySignal === "crisis") {
      signals.push({
        indicator: `${fx.pair} Exchange Rate`,
        value: fx.price,
        change: fx.changesPercentage,
        changeDirection: classifyDirection(fx.changesPercentage),
        significance: "critical",
        geopoliticalContext:
          `Major currency crisis — ${GEOPOLITICAL_FOREX_PAIRS[fx.pair] ?? "significant FX dislocation"}`,
      });
    }
  }

  return signals;
}

// --- Risk Score ---

const SEVERITY_WEIGHTS: Record<MarketSignal["significance"], number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

export function calculateMarketRiskScore(signals: MarketSignal[]): number {
  if (signals.length === 0) return 0;
  let rawScore = 0;
  for (const s of signals) {
    rawScore += SEVERITY_WEIGHTS[s.significance];
  }
  return Math.min(100, rawScore);
}

export function scoreToRiskLevel(
  score: number,
): MacroMarketReport["overallRiskLevel"] {
  if (score >= 70) return "critical";
  if (score >= 45) return "elevated";
  if (score >= 20) return "moderate";
  return "low";
}

// --- Main Report Generator ---

export async function generateMacroMarketReport(): Promise<MacroMarketReport> {
  const [
    commoditiesResult,
    forexResult,
    treasuryResult,
    sectorsResult,
    vixResult,
  ] = await Promise.allSettled([
    fetchCommodities(),
    fetchForex(),
    fetchTreasury(),
    fetchSectorPerformance(),
    fetchVIX(),
  ]);

  const commodities =
    commoditiesResult.status === "fulfilled" ? commoditiesResult.value : [];
  const forex =
    forexResult.status === "fulfilled" ? forexResult.value : [];
  const treasury =
    treasuryResult.status === "fulfilled" ? treasuryResult.value : null;
  const sectors =
    sectorsResult.status === "fulfilled" ? sectorsResult.value : [];
  const vix =
    vixResult.status === "fulfilled" ? vixResult.value : null;

  const results = [
    { name: "commodities", result: commoditiesResult },
    { name: "forex", result: forexResult },
    { name: "treasury", result: treasuryResult },
    { name: "sectors", result: sectorsResult },
    { name: "vix", result: vixResult },
  ];
  for (const { name, result } of results) {
    if (result.status === "rejected") {
      console.error(`[Sentinel/MacroMarket] Failed to fetch ${name}:`, result.reason);
    }
  }

  const signals = generateMarketSignals(commodities, forex, treasury, vix);
  const riskScore = calculateMarketRiskScore(signals);

  const goldQuote = commodities.find((c) => c.symbol === "GCUSD");
  const oilQuote = commodities.find((c) => c.symbol === "CLUSD");
  const goldOilRatio =
    goldQuote && oilQuote && oilQuote.price > 0
      ? Math.round((goldQuote.price / oilQuote.price) * 100) / 100
      : null;

  const yieldSpread =
    treasury !== null
      ? Math.round((treasury.year10 - treasury.year2) * 1000) / 1000
      : null;

  return {
    timestamp: new Date().toISOString(),
    overallRiskLevel: scoreToRiskLevel(riskScore),
    riskScore,
    signals,
    commodities,
    forex,
    sectors,
    treasury,
    fearGreedIndicators: {
      vixLevel: vix,
      goldOilRatio,
      yieldSpread,
    },
  };
}
