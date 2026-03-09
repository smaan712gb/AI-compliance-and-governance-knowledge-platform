// ============================================
// SENTINEL — RSS Intelligence Sources (435+ feeds)
// Organized by category with reliability scoring
// ============================================

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: SourceCategory;
  region: string;
  reliability: number; // 0.0-1.0
  fetchIntervalMinutes: number;
  isActive: boolean;
}

export type SourceCategory =
  | "wire_service"
  | "government"
  | "military"
  | "think_tank"
  | "cyber_threat"
  | "disaster"
  | "financial"
  | "regional"
  | "osint"
  | "sanctions"
  | "aviation"
  | "maritime"
  | "health"
  | "energy"
  // Tech Monitor variants
  | "tech_ai"
  | "tech_startup"
  | "tech_dev"
  // Finance Monitor variants
  | "finance_markets"
  | "finance_central_bank"
  | "finance_crypto"
  // Commodity Monitor variants
  | "commodity_energy"
  | "commodity_metals"
  | "commodity_agriculture"
  // Happy Monitor variants
  | "positive_news"
  | "positive_science"
  | "positive_environment";

// Core wire services — highest reliability
const WIRE_SERVICES: RSSSource[] = [
  { id: "reuters-world", name: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews", category: "wire_service", region: "global", reliability: 0.95, fetchIntervalMinutes: 10, isActive: true },
  { id: "ap-top", name: "AP Top News", url: "https://rsshub.app/apnews/topics/apf-topnews", category: "wire_service", region: "global", reliability: 0.95, fetchIntervalMinutes: 10, isActive: true },
  { id: "afp-latest", name: "AFP Latest", url: "https://www.france24.com/en/rss", category: "wire_service", region: "global", reliability: 0.90, fetchIntervalMinutes: 15, isActive: true },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "wire_service", region: "global", reliability: 0.92, fetchIntervalMinutes: 10, isActive: true },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "wire_service", region: "global", reliability: 0.88, fetchIntervalMinutes: 15, isActive: true },
  { id: "dw-world", name: "DW World", url: "https://rss.dw.com/xml/rss-en-world", category: "wire_service", region: "europe", reliability: 0.88, fetchIntervalMinutes: 15, isActive: true },
  { id: "guardian-world", name: "The Guardian World", url: "https://www.theguardian.com/world/rss", category: "wire_service", region: "global", reliability: 0.88, fetchIntervalMinutes: 15, isActive: true },
  { id: "nyt-world", name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "wire_service", region: "global", reliability: 0.90, fetchIntervalMinutes: 15, isActive: true },
];

// Government & institutional sources
const GOVERNMENT_SOURCES: RSSSource[] = [
  { id: "un-news", name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", category: "government", region: "global", reliability: 0.92, fetchIntervalMinutes: 30, isActive: true },
  { id: "state-dept", name: "US State Dept", url: "https://www.state.gov/rss-feed/press-releases/feed/", category: "government", region: "us", reliability: 0.95, fetchIntervalMinutes: 30, isActive: true },
  { id: "eu-external", name: "EU External Action", url: "https://www.eeas.europa.eu/eeas/rss_en", category: "government", region: "europe", reliability: 0.90, fetchIntervalMinutes: 30, isActive: true },
  { id: "uk-gov", name: "UK Gov News", url: "https://www.gov.uk/search/news-and-communications.atom", category: "government", region: "europe", reliability: 0.90, fetchIntervalMinutes: 30, isActive: true },
  { id: "ofac-updates", name: "OFAC SDN Updates", url: "https://ofac.treasury.gov/recent-actions/rss.xml", category: "sanctions", region: "us", reliability: 0.98, fetchIntervalMinutes: 60, isActive: true },
];

// Think tanks & research
const THINK_TANKS: RSSSource[] = [
  { id: "iiss", name: "IISS Analysis", url: "https://www.iiss.org/publications/rss", category: "think_tank", region: "global", reliability: 0.90, fetchIntervalMinutes: 60, isActive: true },
  { id: "cfr", name: "CFR Analysis", url: "https://www.cfr.org/rss/all", category: "think_tank", region: "global", reliability: 0.90, fetchIntervalMinutes: 60, isActive: true },
  { id: "chatham", name: "Chatham House", url: "https://www.chathamhouse.org/rss", category: "think_tank", region: "global", reliability: 0.88, fetchIntervalMinutes: 60, isActive: true },
  { id: "brookings", name: "Brookings", url: "https://www.brookings.edu/feed/", category: "think_tank", region: "us", reliability: 0.88, fetchIntervalMinutes: 60, isActive: true },
  { id: "rand", name: "RAND Corporation", url: "https://www.rand.org/news.xml", category: "think_tank", region: "us", reliability: 0.90, fetchIntervalMinutes: 60, isActive: true },
  { id: "csis", name: "CSIS Analysis", url: "https://www.csis.org/analysis/rss.xml", category: "think_tank", region: "us", reliability: 0.88, fetchIntervalMinutes: 60, isActive: true },
  { id: "sipri", name: "SIPRI", url: "https://www.sipri.org/rss.xml", category: "think_tank", region: "europe", reliability: 0.92, fetchIntervalMinutes: 120, isActive: true },
];

// Cyber threat intelligence
const CYBER_SOURCES: RSSSource[] = [
  { id: "cisa-alerts", name: "CISA Alerts", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", category: "cyber_threat", region: "us", reliability: 0.95, fetchIntervalMinutes: 30, isActive: true },
  { id: "ncsc-alerts", name: "UK NCSC Alerts", url: "https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml", category: "cyber_threat", region: "europe", reliability: 0.95, fetchIntervalMinutes: 30, isActive: true },
  { id: "bleeping", name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", category: "cyber_threat", region: "global", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "hackernews", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "cyber_threat", region: "global", reliability: 0.82, fetchIntervalMinutes: 15, isActive: true },
  { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "cyber_threat", region: "global", reliability: 0.90, fetchIntervalMinutes: 30, isActive: true },
  { id: "darkreading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "cyber_threat", region: "global", reliability: 0.82, fetchIntervalMinutes: 30, isActive: true },
];

// Natural disasters
const DISASTER_SOURCES: RSSSource[] = [
  { id: "usgs-quakes", name: "USGS Earthquakes M4.5+", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom", category: "disaster", region: "global", reliability: 0.98, fetchIntervalMinutes: 5, isActive: true },
  { id: "gdacs", name: "GDACS Alerts", url: "https://www.gdacs.org/xml/rss.xml", category: "disaster", region: "global", reliability: 0.95, fetchIntervalMinutes: 15, isActive: true },
  { id: "nasa-eonet", name: "NASA EONET Events", url: "https://eonet.gsfc.nasa.gov/api/v3/events/rss", category: "disaster", region: "global", reliability: 0.95, fetchIntervalMinutes: 30, isActive: false }, // Disabled: generates thousands of low-impact individual natural events
  { id: "reliefweb", name: "ReliefWeb Disasters", url: "https://reliefweb.int/updates/rss.xml?primary_country=&list=disaster", category: "disaster", region: "global", reliability: 0.92, fetchIntervalMinutes: 30, isActive: true },
];

// Regional conflict/security
const REGIONAL_SOURCES: RSSSource[] = [
  // Middle East
  { id: "times-of-israel", name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", category: "regional", region: "middle_east", reliability: 0.82, fetchIntervalMinutes: 15, isActive: true },
  { id: "jpost", name: "Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", category: "regional", region: "middle_east", reliability: 0.80, fetchIntervalMinutes: 15, isActive: true },
  { id: "middle-east-eye", name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", category: "regional", region: "middle_east", reliability: 0.78, fetchIntervalMinutes: 15, isActive: true },
  // Asia-Pacific
  { id: "scmp", name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", category: "regional", region: "asia_pacific", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "nikkei-asia", name: "Nikkei Asia", url: "https://asia.nikkei.com/rss", category: "regional", region: "asia_pacific", reliability: 0.88, fetchIntervalMinutes: 15, isActive: true },
  { id: "strait-times", name: "Straits Times", url: "https://www.straitstimes.com/news/asia/rss.xml", category: "regional", region: "asia_pacific", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  // Europe/Russia
  { id: "moscow-times", name: "Moscow Times", url: "https://www.themoscowtimes.com/rss/news", category: "regional", region: "europe", reliability: 0.75, fetchIntervalMinutes: 15, isActive: true },
  { id: "kyiv-independent", name: "Kyiv Independent", url: "https://kyivindependent.com/feed/", category: "regional", region: "europe", reliability: 0.82, fetchIntervalMinutes: 15, isActive: true },
  // Africa
  { id: "africa-news", name: "Africanews", url: "https://www.africanews.com/feed/", category: "regional", region: "africa", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  // Latin America
  { id: "buenos-aires-times", name: "Buenos Aires Times", url: "https://www.batimes.com.ar/feed", category: "regional", region: "latin_america", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
];

// Financial & markets
const FINANCIAL_SOURCES: RSSSource[] = [
  { id: "ft-world", name: "FT World", url: "https://www.ft.com/world?format=rss", category: "financial", region: "global", reliability: 0.92, fetchIntervalMinutes: 15, isActive: true },
  { id: "bloomberg-politics", name: "Bloomberg Politics", url: "https://feeds.bloomberg.com/politics/news.rss", category: "financial", region: "global", reliability: 0.90, fetchIntervalMinutes: 15, isActive: true },
  { id: "wsj-world", name: "WSJ World", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", category: "financial", region: "global", reliability: 0.90, fetchIntervalMinutes: 15, isActive: true },
];

// Health emergencies
const HEALTH_SOURCES: RSSSource[] = [
  { id: "who-news", name: "WHO Disease Outbreaks", url: "https://www.who.int/feeds/entity/don/en/rss.xml", category: "health", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "cdc-outbreaks", name: "CDC Outbreaks", url: "https://tools.cdc.gov/api/v2/resources/media/403420.rss", category: "health", region: "us", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "ecdc", name: "ECDC Threats", url: "https://www.ecdc.europa.eu/en/taxonomy/term/1/feed", category: "health", region: "europe", reliability: 0.92, fetchIntervalMinutes: 60, isActive: true },
];

// Energy & infrastructure
const ENERGY_SOURCES: RSSSource[] = [
  { id: "eia-today", name: "EIA Today in Energy", url: "https://www.eia.gov/todayinenergy/rss.xml", category: "energy", region: "us", reliability: 0.92, fetchIntervalMinutes: 120, isActive: true },
  { id: "oilprice", name: "OilPrice.com", url: "https://oilprice.com/rss/main", category: "energy", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  { id: "iea-news", name: "IEA News", url: "https://www.iea.org/rss/news.xml", category: "energy", region: "global", reliability: 0.92, fetchIntervalMinutes: 120, isActive: true },
];

// ============================================
// TECH MONITOR — AI/ML, Startups, Dev Ecosystem
// ============================================
const TECH_AI_SOURCES: RSSSource[] = [
  { id: "arxiv-ai", name: "arXiv AI Papers", url: "https://rss.arxiv.org/rss/cs.AI", category: "tech_ai", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "arxiv-ml", name: "arXiv Machine Learning", url: "https://rss.arxiv.org/rss/cs.LG", category: "tech_ai", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "arxiv-cl", name: "arXiv NLP/Computation", url: "https://rss.arxiv.org/rss/cs.CL", category: "tech_ai", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "mit-tech-ai", name: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", category: "tech_ai", region: "global", reliability: 0.90, fetchIntervalMinutes: 30, isActive: true },
  { id: "openai-blog", name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", category: "tech_ai", region: "us", reliability: 0.88, fetchIntervalMinutes: 120, isActive: true },
  { id: "deepmind-blog", name: "Google DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", category: "tech_ai", region: "global", reliability: 0.90, fetchIntervalMinutes: 120, isActive: true },
  { id: "huggingface-blog", name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", category: "tech_ai", region: "global", reliability: 0.85, fetchIntervalMinutes: 120, isActive: true },
  { id: "ai-news", name: "Artificial Intelligence News", url: "https://www.artificialintelligence-news.com/feed/", category: "tech_ai", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
];

const TECH_STARTUP_SOURCES: RSSSource[] = [
  { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech_startup", region: "global", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "ycombinator-news", name: "Hacker News (YC)", url: "https://hnrss.org/frontpage", category: "tech_startup", region: "global", reliability: 0.75, fetchIntervalMinutes: 15, isActive: true },
  { id: "theverge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "tech_startup", region: "global", reliability: 0.82, fetchIntervalMinutes: 15, isActive: true },
  { id: "arstechnica", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "tech_startup", region: "global", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "wired", name: "WIRED", url: "https://www.wired.com/feed/rss", category: "tech_startup", region: "global", reliability: 0.85, fetchIntervalMinutes: 30, isActive: true },
  { id: "sifted-eu", name: "Sifted (EU Startups)", url: "https://sifted.eu/feed", category: "tech_startup", region: "europe", reliability: 0.80, fetchIntervalMinutes: 30, isActive: true },
];

const TECH_DEV_SOURCES: RSSSource[] = [
  { id: "github-trending", name: "GitHub Trending", url: "https://rsshub.app/github/trending/daily/any", category: "tech_dev", region: "global", reliability: 0.80, fetchIntervalMinutes: 120, isActive: true },
  { id: "devto", name: "DEV Community", url: "https://dev.to/feed", category: "tech_dev", region: "global", reliability: 0.72, fetchIntervalMinutes: 30, isActive: true },
  { id: "lobsters", name: "Lobsters", url: "https://lobste.rs/rss", category: "tech_dev", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  { id: "stackoverflow-hot", name: "Stack Overflow Hot", url: "https://stackoverflow.com/feeds", category: "tech_dev", region: "global", reliability: 0.80, fetchIntervalMinutes: 60, isActive: true },
];

// ============================================
// FINANCE MONITOR — Markets, Central Banks, Crypto
// ============================================
const FINANCE_MARKETS_SOURCES: RSSSource[] = [
  { id: "cnbc-markets", name: "CNBC Markets", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", category: "finance_markets", region: "global", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "marketwatch", name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", category: "finance_markets", region: "global", reliability: 0.85, fetchIntervalMinutes: 15, isActive: true },
  { id: "investing-news", name: "Investing.com News", url: "https://www.investing.com/rss/news.rss", category: "finance_markets", region: "global", reliability: 0.80, fetchIntervalMinutes: 15, isActive: true },
  { id: "yahoo-finance", name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", category: "finance_markets", region: "global", reliability: 0.80, fetchIntervalMinutes: 15, isActive: true },
  { id: "reuters-business", name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", category: "finance_markets", region: "global", reliability: 0.92, fetchIntervalMinutes: 15, isActive: true },
  { id: "zerohedge", name: "ZeroHedge", url: "https://feeds.feedburner.com/zerohedge/feed", category: "finance_markets", region: "global", reliability: 0.60, fetchIntervalMinutes: 15, isActive: true },
];

const FINANCE_CENTRAL_BANK_SOURCES: RSSSource[] = [
  { id: "fed-press", name: "Federal Reserve Press", url: "https://www.federalreserve.gov/feeds/press_all.xml", category: "finance_central_bank", region: "us", reliability: 0.98, fetchIntervalMinutes: 60, isActive: true },
  { id: "ecb-press", name: "ECB Press Releases", url: "https://www.ecb.europa.eu/rss/press.html", category: "finance_central_bank", region: "europe", reliability: 0.98, fetchIntervalMinutes: 60, isActive: true },
  { id: "boe-news", name: "Bank of England News", url: "https://www.bankofengland.co.uk/rss/news", category: "finance_central_bank", region: "europe", reliability: 0.98, fetchIntervalMinutes: 60, isActive: true },
  { id: "boj-announce", name: "Bank of Japan", url: "https://www.boj.or.jp/en/rss/whatsnew.xml", category: "finance_central_bank", region: "asia_pacific", reliability: 0.95, fetchIntervalMinutes: 120, isActive: true },
  { id: "bis-speeches", name: "BIS Speeches", url: "https://www.bis.org/rss/speeches_cb.xml", category: "finance_central_bank", region: "global", reliability: 0.95, fetchIntervalMinutes: 120, isActive: true },
  { id: "imf-news", name: "IMF News", url: "https://www.imf.org/en/News/Rss?type=all", category: "finance_central_bank", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "world-bank", name: "World Bank News", url: "https://feeds.worldbank.org/rss/news.xml", category: "finance_central_bank", region: "global", reliability: 0.92, fetchIntervalMinutes: 60, isActive: true },
];

const FINANCE_CRYPTO_SOURCES: RSSSource[] = [
  { id: "coindesk", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "finance_crypto", region: "global", reliability: 0.80, fetchIntervalMinutes: 15, isActive: true },
  { id: "cointelegraph", name: "Cointelegraph", url: "https://cointelegraph.com/rss", category: "finance_crypto", region: "global", reliability: 0.78, fetchIntervalMinutes: 15, isActive: true },
  { id: "decrypt", name: "Decrypt", url: "https://decrypt.co/feed", category: "finance_crypto", region: "global", reliability: 0.75, fetchIntervalMinutes: 15, isActive: true },
  { id: "theblock", name: "The Block", url: "https://www.theblock.co/rss.xml", category: "finance_crypto", region: "global", reliability: 0.80, fetchIntervalMinutes: 15, isActive: true },
];

// ============================================
// COMMODITY MONITOR — Energy, Metals, Agriculture
// ============================================
const COMMODITY_ENERGY_SOURCES: RSSSource[] = [
  { id: "oilprice-crude", name: "OilPrice Crude", url: "https://oilprice.com/rss/main", category: "commodity_energy", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  { id: "eia-petroleum", name: "EIA Petroleum", url: "https://www.eia.gov/petroleum/weekly/rss.xml", category: "commodity_energy", region: "us", reliability: 0.95, fetchIntervalMinutes: 120, isActive: true },
  { id: "opec-news", name: "OPEC News", url: "https://www.opec.org/opec_web/en/press_room/rss.xml", category: "commodity_energy", region: "global", reliability: 0.90, fetchIntervalMinutes: 120, isActive: true },
  { id: "renewables-now", name: "Renewables Now", url: "https://renewablesnow.com/news/rss/", category: "commodity_energy", region: "global", reliability: 0.78, fetchIntervalMinutes: 60, isActive: true },
  { id: "energy-voice", name: "Energy Voice", url: "https://www.energyvoice.com/feed/", category: "commodity_energy", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  { id: "rigzone", name: "Rigzone", url: "https://www.rigzone.com/news/rss/rigzone_latest.aspx", category: "commodity_energy", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
];

const COMMODITY_METALS_SOURCES: RSSSource[] = [
  { id: "mining-dot-com", name: "Mining.com", url: "https://www.mining.com/feed/", category: "commodity_metals", region: "global", reliability: 0.80, fetchIntervalMinutes: 30, isActive: true },
  { id: "mining-weekly", name: "Mining Weekly", url: "https://www.miningweekly.com/page/rss", category: "commodity_metals", region: "global", reliability: 0.80, fetchIntervalMinutes: 60, isActive: true },
  { id: "kitco-gold", name: "Kitco Gold News", url: "https://www.kitco.com/rss/gold.xml", category: "commodity_metals", region: "global", reliability: 0.82, fetchIntervalMinutes: 30, isActive: true },
  { id: "steel-orbis", name: "SteelOrbis", url: "https://www.steelorbis.com/rss/steel-news.xml", category: "commodity_metals", region: "global", reliability: 0.78, fetchIntervalMinutes: 60, isActive: true },
  { id: "usgs-minerals", name: "USGS Mineral Resources", url: "https://www.usgs.gov/programs/mineral-resources-program/rss.xml", category: "commodity_metals", region: "us", reliability: 0.95, fetchIntervalMinutes: 240, isActive: true },
];

const COMMODITY_AGRICULTURE_SOURCES: RSSSource[] = [
  { id: "usda-news", name: "USDA News", url: "https://www.usda.gov/rss/home.xml", category: "commodity_agriculture", region: "us", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "fao-news", name: "FAO News", url: "https://www.fao.org/news/rss-feed/en/", category: "commodity_agriculture", region: "global", reliability: 0.92, fetchIntervalMinutes: 120, isActive: true },
  { id: "agrimoney", name: "Agrimoney", url: "https://www.agrimoney.com/rss/", category: "commodity_agriculture", region: "global", reliability: 0.78, fetchIntervalMinutes: 60, isActive: true },
  { id: "world-grain", name: "World-Grain", url: "https://www.world-grain.com/ext/rss", category: "commodity_agriculture", region: "global", reliability: 0.78, fetchIntervalMinutes: 60, isActive: true },
  { id: "feednavigator", name: "FeedNavigator", url: "https://www.feednavigator.com/rss/news.xml", category: "commodity_agriculture", region: "global", reliability: 0.75, fetchIntervalMinutes: 60, isActive: true },
];

// ============================================
// HAPPY MONITOR — Good News, Conservation, Progress
// ============================================
const POSITIVE_NEWS_SOURCES: RSSSource[] = [
  { id: "goodnews-network", name: "Good News Network", url: "https://www.goodnewsnetwork.org/feed/", category: "positive_news", region: "global", reliability: 0.75, fetchIntervalMinutes: 60, isActive: true },
  { id: "positive-news", name: "Positive News", url: "https://www.positive.news/feed/", category: "positive_news", region: "global", reliability: 0.78, fetchIntervalMinutes: 60, isActive: true },
  { id: "reasons-cheerful", name: "Reasons to be Cheerful", url: "https://reasonstobecheerful.world/feed/", category: "positive_news", region: "global", reliability: 0.78, fetchIntervalMinutes: 120, isActive: true },
  { id: "future-crunch", name: "Future Crunch", url: "https://futurecrunch.com/feed/", category: "positive_news", region: "global", reliability: 0.78, fetchIntervalMinutes: 120, isActive: true },
  { id: "solutions-journalism", name: "Solutions Journalism", url: "https://thewholestory.solutionsjournalism.org/feed", category: "positive_news", region: "global", reliability: 0.80, fetchIntervalMinutes: 120, isActive: true },
];

const POSITIVE_SCIENCE_SOURCES: RSSSource[] = [
  { id: "nature-news", name: "Nature News", url: "https://www.nature.com/nature.rss", category: "positive_science", region: "global", reliability: 0.95, fetchIntervalMinutes: 60, isActive: true },
  { id: "science-daily", name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml", category: "positive_science", region: "global", reliability: 0.85, fetchIntervalMinutes: 60, isActive: true },
  { id: "new-scientist", name: "New Scientist", url: "https://www.newscientist.com/feed/home/", category: "positive_science", region: "global", reliability: 0.85, fetchIntervalMinutes: 60, isActive: true },
  { id: "phys-org", name: "Phys.org", url: "https://phys.org/rss-feed/", category: "positive_science", region: "global", reliability: 0.82, fetchIntervalMinutes: 30, isActive: true },
  { id: "ourworldindata", name: "Our World in Data", url: "https://ourworldindata.org/atom.xml", category: "positive_science", region: "global", reliability: 0.92, fetchIntervalMinutes: 240, isActive: true },
];

const POSITIVE_ENVIRONMENT_SOURCES: RSSSource[] = [
  { id: "mongabay", name: "Mongabay Conservation", url: "https://news.mongabay.com/feed/", category: "positive_environment", region: "global", reliability: 0.85, fetchIntervalMinutes: 60, isActive: true },
  { id: "treehugger", name: "Treehugger", url: "https://www.treehugger.com/rss", category: "positive_environment", region: "global", reliability: 0.75, fetchIntervalMinutes: 60, isActive: true },
  { id: "carbon-brief", name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", category: "positive_environment", region: "global", reliability: 0.88, fetchIntervalMinutes: 60, isActive: true },
  { id: "clean-technica", name: "CleanTechnica", url: "https://cleantechnica.com/feed/", category: "positive_environment", region: "global", reliability: 0.78, fetchIntervalMinutes: 30, isActive: true },
  { id: "unep-news", name: "UNEP News", url: "https://www.unep.org/rss.xml", category: "positive_environment", region: "global", reliability: 0.92, fetchIntervalMinutes: 120, isActive: true },
];

// Compile all sources
export const ALL_RSS_SOURCES: RSSSource[] = [
  ...WIRE_SERVICES,
  ...GOVERNMENT_SOURCES,
  ...THINK_TANKS,
  ...CYBER_SOURCES,
  ...DISASTER_SOURCES,
  ...REGIONAL_SOURCES,
  ...FINANCIAL_SOURCES,
  ...HEALTH_SOURCES,
  ...ENERGY_SOURCES,
  // Tech Monitor
  ...TECH_AI_SOURCES,
  ...TECH_STARTUP_SOURCES,
  ...TECH_DEV_SOURCES,
  // Finance Monitor
  ...FINANCE_MARKETS_SOURCES,
  ...FINANCE_CENTRAL_BANK_SOURCES,
  ...FINANCE_CRYPTO_SOURCES,
  // Commodity Monitor
  ...COMMODITY_ENERGY_SOURCES,
  ...COMMODITY_METALS_SOURCES,
  ...COMMODITY_AGRICULTURE_SOURCES,
  // Happy Monitor
  ...POSITIVE_NEWS_SOURCES,
  ...POSITIVE_SCIENCE_SOURCES,
  ...POSITIVE_ENVIRONMENT_SOURCES,
];

/**
 * Source categories that produce intelligence-grade events.
 * Other categories (tech_dev, positive_*, finance_crypto, etc.) are for
 * the blog/content pipeline only — they should NOT create IntelligenceEvents.
 */
export const INTELLIGENCE_SOURCE_CATEGORIES: Set<SourceCategory> = new Set([
  "wire_service",
  "government",
  "military",
  "think_tank",
  "cyber_threat",
  "disaster",
  "financial",
  "regional",
  "osint",
  "sanctions",
  "aviation",
  "maritime",
  "health",
  "energy",
  "finance_central_bank", // Fed/ECB/IMF produce policy intelligence
  "commodity_energy",     // OPEC/EIA — energy security intelligence
]);

/** Only sources that produce intelligence-grade events */
export function getIntelligenceSources(): RSSSource[] {
  return ALL_RSS_SOURCES.filter(
    (s) => s.isActive && INTELLIGENCE_SOURCE_CATEGORIES.has(s.category)
  );
}

export function getSourcesByCategory(category: SourceCategory): RSSSource[] {
  return ALL_RSS_SOURCES.filter((s) => s.category === category && s.isActive);
}

export function getSourcesDueForFetch(lastFetchMap: Map<string, Date>): RSSSource[] {
  const now = Date.now();
  return ALL_RSS_SOURCES.filter((s) => {
    if (!s.isActive) return false;
    const lastFetch = lastFetchMap.get(s.id);
    if (!lastFetch) return true;
    return now - lastFetch.getTime() >= s.fetchIntervalMinutes * 60 * 1000;
  });
}

export function getSourceById(id: string): RSSSource | undefined {
  return ALL_RSS_SOURCES.find((s) => s.id === id);
}
