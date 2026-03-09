// ============================================
// SENTINEL — Global Crisis Index (CII) Calculator
// ============================================

import type {
  CrisisComponents,
  CrisisIndicators,
  CrisisIndexScore,
  CrisisLevel,
  CrisisTrend,
} from "./types";

// Country baselines (structural fragility scores)
const COUNTRY_BASELINES: Record<string, number> = {
  // Critical
  UA: 75, SY: 70, YE: 70, AF: 65, SD: 65, SS: 62, SO: 60,
  CD: 58, CF: 55, MM: 52, LY: 50,
  // High
  IL: 50, PS: 55, IQ: 50, ML: 48, BF: 47, NE: 45,
  HT: 45, NG: 42, PK: 40, ET: 40, MZ: 38,
  // Medium
  IR: 40, TW: 35, KR: 30, LB: 35, EG: 30,
  TH: 25, PH: 25, CO: 25, MX: 25,
  // Low
  US: 15, UK: 10, DE: 10, FR: 12, JP: 10,
  CA: 8, AU: 8, NZ: 6, CH: 5, SG: 5,
  // Default for unlisted countries
  DEFAULT: 20,
};

// Conflict zone centers (lat, lng, radius in km)
const CONFLICT_ZONES = [
  { name: "Ukraine-Russia", lat: 48.5, lng: 37.5, radius: 500 },
  { name: "Gaza-Israel", lat: 31.5, lng: 34.5, radius: 100 },
  { name: "Yemen", lat: 15.5, lng: 44.0, radius: 300 },
  { name: "Syria", lat: 35.0, lng: 38.0, radius: 400 },
  { name: "Sahel", lat: 15.0, lng: 2.0, radius: 800 },
  { name: "Myanmar", lat: 19.0, lng: 96.0, radius: 400 },
  { name: "Eastern DRC", lat: -2.0, lng: 29.0, radius: 300 },
  { name: "Somalia", lat: 5.0, lng: 46.0, radius: 400 },
  { name: "Sudan", lat: 15.5, lng: 32.5, radius: 500 },
  { name: "Taiwan Strait", lat: 24.0, lng: 120.0, radius: 300 },
];

export function getBaselineScore(countryCode: string): number {
  return COUNTRY_BASELINES[countryCode.toUpperCase()] ?? COUNTRY_BASELINES.DEFAULT;
}

export function calculateComponents(indicators: CrisisIndicators): CrisisComponents {
  // Deadliness: fatalities per incident (10+ fatalities → 100)
  const fatalityRate = indicators.conflictEvents > 0
    ? indicators.fatalities / indicators.conflictEvents
    : 0;
  const deadliness = Math.min(100, (fatalityRate / 10) * 100);

  // Civilian danger: proxy via protest events relative to conflict (50%+ → 100)
  const totalEvents = indicators.conflictEvents + indicators.protestEvents;
  const civilianRatio = totalEvents > 0
    ? indicators.protestEvents / totalEvents
    : 0;
  const civilianDanger = Math.min(100, (civilianRatio / 0.5) * 100);

  // Diffusion: geographic spread (20+ distinct locations → 100)
  const diffusion = Math.min(100, (indicators.conflictEvents / 20) * 100);

  // Fragmentation: number of distinct armed groups/actors (proxy via event diversity)
  const fragmentation = Math.min(100, (indicators.militaryActivity / 10) * 100);

  return {
    deadliness: Math.round(deadliness),
    civilianDanger: Math.round(civilianDanger),
    diffusion: Math.round(diffusion),
    fragmentation: Math.round(fragmentation),
  };
}

export function calculateEventScore(components: CrisisComponents): number {
  // Equal weighting across 4 components
  return (
    components.deadliness * 0.25 +
    components.civilianDanger * 0.25 +
    components.diffusion * 0.25 +
    components.fragmentation * 0.25
  );
}

export function calculateBoosts(indicators: CrisisIndicators): number {
  let boost = 0;

  // Internet outage boost (+5 each, max 20)
  boost += Math.min(20, indicators.internetOutages * 5);

  // News velocity surge (above 50 articles/day → boost)
  if (indicators.newsVelocity > 100) boost += 10;
  else if (indicators.newsVelocity > 50) boost += 5;

  // Military activity surge
  if (indicators.militaryActivity > 20) boost += 10;
  else if (indicators.militaryActivity > 10) boost += 5;

  // Protest surge
  if (indicators.protestEvents > 50) boost += 8;
  else if (indicators.protestEvents > 20) boost += 4;

  return Math.min(30, boost); // Cap total boosts at 30
}

export function calculateCrisisScore(
  countryCode: string,
  indicators: CrisisIndicators
): CrisisIndexScore {
  const baseline = getBaselineScore(countryCode);
  const components = calculateComponents(indicators);
  const eventScore = calculateEventScore(components);
  const boosts = calculateBoosts(indicators);

  // Final score: 40% baseline + 60% event score + boosts, capped at 100
  const rawScore = baseline * 0.4 + eventScore * 0.6 + boosts;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const level = scoreToLevel(score);
  const trend: CrisisTrend = "stable"; // Default — needs historical data for real trend

  return {
    countryCode: countryCode.toUpperCase(),
    countryName: getCountryName(countryCode),
    score,
    level,
    trend,
    components,
    indicators,
    lastUpdated: new Date().toISOString(),
  };
}

export function scoreToLevel(score: number): CrisisLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "severe";
  if (score >= 40) return "elevated";
  if (score >= 20) return "guarded";
  return "low";
}

export function calculateTrend(
  recentScores: number[],
  windowSize: number = 7
): CrisisTrend {
  if (recentScores.length < 2) return "stable";

  const window = recentScores.slice(-windowSize);
  const firstHalf = window.slice(0, Math.floor(window.length / 2));
  const secondHalf = window.slice(Math.floor(window.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;

  if (diff > 3) return "escalating";
  if (diff < -3) return "improving";
  return "stable";
}

export function getProximityToConflictZones(
  lat: number,
  lng: number
): { nearest: string; distanceKm: number } | null {
  let nearest: { nearest: string; distanceKm: number } | null = null;

  for (const zone of CONFLICT_ZONES) {
    const dist = haversineDistance(lat, lng, zone.lat, zone.lng);
    if (dist <= zone.radius && (!nearest || dist < nearest.distanceKm)) {
      nearest = { nearest: zone.name, distanceKm: Math.round(dist) };
    }
  }

  return nearest;
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ISO-2 to country name mapping (key countries)
const COUNTRY_NAMES: Record<string, string> = {
  UA: "Ukraine", SY: "Syria", YE: "Yemen", AF: "Afghanistan",
  SD: "Sudan", SS: "South Sudan", SO: "Somalia", CD: "DR Congo",
  CF: "Central African Republic", MM: "Myanmar", LY: "Libya",
  IL: "Israel", PS: "Palestine", IQ: "Iraq", ML: "Mali",
  BF: "Burkina Faso", NE: "Niger", HT: "Haiti", NG: "Nigeria",
  PK: "Pakistan", ET: "Ethiopia", MZ: "Mozambique", IR: "Iran",
  TW: "Taiwan", KR: "South Korea", LB: "Lebanon", EG: "Egypt",
  TH: "Thailand", PH: "Philippines", CO: "Colombia", MX: "Mexico",
  US: "United States", GB: "United Kingdom", DE: "Germany",
  FR: "France", JP: "Japan", CA: "Canada", AU: "Australia",
  NZ: "New Zealand", CH: "Switzerland", SG: "Singapore",
  RU: "Russia", CN: "China", IN: "India", BR: "Brazil",
  KP: "North Korea", CU: "Cuba", VE: "Venezuela", BY: "Belarus",
  ZW: "Zimbabwe", SA: "Saudi Arabia", AE: "UAE", QA: "Qatar",
  TR: "Turkey", KE: "Kenya", TZ: "Tanzania", UG: "Uganda",
  BD: "Bangladesh", ID: "Indonesia", VN: "Vietnam",
};

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

// Batch calculate for multiple countries
export function calculateBatchCrisisScores(
  countryData: { countryCode: string; indicators: CrisisIndicators }[]
): CrisisIndexScore[] {
  return countryData.map(({ countryCode, indicators }) =>
    calculateCrisisScore(countryCode, indicators)
  );
}
