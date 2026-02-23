/**
 * Seed script: Add jurisdiction-specific regulatory sources (Phase 4)
 *
 * Run with: npx tsx scripts/seed-jurisdiction-sources.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const sources = [
  // ── APAC ──
  { name: "Japan FSA News", url: "https://www.fsa.go.jp/en/news/index.html", type: "REGULATORY_BODY" as const, category: "fintech" },
  { name: "Singapore MAS Media", url: "https://www.mas.gov.sg/news/media-releases.rss", type: "RSS_FEED" as const, category: "fintech" },
  { name: "Australia OAIC News", url: "https://www.oaic.gov.au/updates/news-and-media.rss", type: "RSS_FEED" as const, category: "data-privacy" },
  { name: "India MeitY Updates", url: "https://www.meity.gov.in/rss-feeds", type: "RSS_FEED" as const, category: "ai-governance" },
  { name: "South Korea PIPC", url: "https://www.pipc.go.kr/np/cop/bbs/selectBoardList.do", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "HKMA Regulatory Updates", url: "https://www.hkma.gov.hk/eng/news-and-media/press-releases/rss.xml", type: "RSS_FEED" as const, category: "fintech" },
  { name: "Reserve Bank of India", url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx", type: "REGULATORY_BODY" as const, category: "fintech" },
  { name: "ASIC Media Releases", url: "https://asic.gov.au/about-asic/news-centre/find-a-media-release/rss-feed/", type: "RSS_FEED" as const, category: "fintech" },
  // ── MENA ──
  { name: "UAE ADGM Announcements", url: "https://www.adgm.com/media/announcements", type: "REGULATORY_BODY" as const, category: "fintech" },
  { name: "Saudi SDAIA News", url: "https://sdaia.gov.sa/en/MediaCenter/News", type: "REGULATORY_BODY" as const, category: "ai-governance" },
  { name: "ZATCA News (Saudi Tax)", url: "https://zatca.gov.sa/en/MediaCenter/News/Pages/default.aspx", type: "REGULATORY_BODY" as const, category: "e-invoicing" },
  { name: "South Africa Info Regulator", url: "https://inforegulator.org.za/media/", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "Central Bank of UAE", url: "https://www.centralbank.ae/en/media-center/", type: "REGULATORY_BODY" as const, category: "fintech" },
  // ── LATAM ──
  { name: "Brazil ANPD News", url: "https://www.gov.br/anpd/pt-br/noticias", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "Mexico INAI", url: "https://home.inai.org.mx/", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "Brazil Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias", type: "REGULATORY_BODY" as const, category: "tax-compliance" },
  { name: "Colombia SIC", url: "https://www.sic.gov.co/noticias", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "SAT Mexico (Tax)", url: "https://www.sat.gob.mx/home", type: "REGULATORY_BODY" as const, category: "e-invoicing" },
  // ── EU Member States ──
  { name: "BaFin News (Germany)", url: "https://www.bafin.de/SiteGlobals/Functions/RSSFeed/EN/RSSNewsfeed/Functions/RSSFeed/rss_en.xml", type: "RSS_FEED" as const, category: "fintech" },
  { name: "AMF News (France)", url: "https://www.amf-france.org/en/news-publications/rss", type: "RSS_FEED" as const, category: "fintech" },
  { name: "CONSOB News (Italy)", url: "https://www.consob.it/web/consob-and-its-activities/news-in-detail", type: "REGULATORY_BODY" as const, category: "fintech" },
  { name: "CNMV News (Spain)", url: "https://www.cnmv.es/portal/AlDia/Comunicados.aspx?lang=en", type: "REGULATORY_BODY" as const, category: "fintech" },
  { name: "AFM News (Netherlands)", url: "https://www.afm.nl/en/sector/actueel/rss", type: "RSS_FEED" as const, category: "fintech" },
  { name: "CNIL News (France Privacy)", url: "https://www.cnil.fr/en/feed/rss/all", type: "RSS_FEED" as const, category: "data-privacy" },
  { name: "Garante Privacy (Italy)", url: "https://www.garanteprivacy.it/home/feed/rss", type: "RSS_FEED" as const, category: "data-privacy" },
  { name: "AEPD News (Spain Privacy)", url: "https://www.aepd.es/en/feed/rss/all", type: "RSS_FEED" as const, category: "data-privacy" },
  { name: "Datatilsynet (Norway DPA)", url: "https://www.datatilsynet.no/aktuelt/nyheter/", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "Polish DPA (UODO)", url: "https://uodo.gov.pl/en/news", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  // ── International Bodies ──
  { name: "Basel Committee Publications", url: "https://www.bis.org/bcbs/publ_atom.xml", type: "RSS_FEED" as const, category: "fintech" },
  { name: "ISSB Updates (IFRS)", url: "https://www.ifrs.org/news-and-events/news/rss/", type: "RSS_FEED" as const, category: "esg" },
  { name: "GRI Standards News", url: "https://www.globalreporting.org/news/", type: "REGULATORY_BODY" as const, category: "esg" },
  { name: "OECD Tax Policy", url: "https://www.oecd.org/ctp/rss/taxpolicy.xml", type: "RSS_FEED" as const, category: "tax-compliance" },
  { name: "FATF Publications", url: "https://www.fatf-gafi.org/en/rss.xml", type: "RSS_FEED" as const, category: "fintech" },
  { name: "UN-CEFACT Updates", url: "https://unece.org/trade/uncefact/rss.xml", type: "RSS_FEED" as const, category: "e-invoicing" },
  // ── Peppol & E-Invoicing Bodies ──
  { name: "OpenPeppol News", url: "https://peppol.org/news/", type: "REGULATORY_BODY" as const, category: "e-invoicing" },
  { name: "EESPA News", url: "https://eespa.eu/news/", type: "REGULATORY_BODY" as const, category: "e-invoicing" },
  // ── Africa ──
  { name: "Nigeria NITDA", url: "https://nitda.gov.ng/category/news/", type: "REGULATORY_BODY" as const, category: "ai-governance" },
  { name: "Kenya ODPC", url: "https://www.odpc.go.ke/news/", type: "REGULATORY_BODY" as const, category: "data-privacy" },
  { name: "SARS (South Africa Tax)", url: "https://www.sars.gov.za/media/", type: "REGULATORY_BODY" as const, category: "tax-compliance" },
];

async function main() {
  console.log(`Seeding ${sources.length} jurisdiction-specific sources...`);

  let created = 0;
  let skipped = 0;

  for (const source of sources) {
    const existing = await db.agentSource.findFirst({
      where: { url: source.url },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.agentSource.create({
      data: {
        name: source.name,
        url: source.url,
        type: source.type,
        category: source.category,
        isActive: true,
        fetchIntervalHours: 48, // Less frequent for jurisdiction-specific sources
        reliability: 0.7,
      },
    });

    created++;
  }

  const total = await db.agentSource.count();
  console.log(`Done: ${created} created, ${skipped} skipped (already exist). Total sources: ${total}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
