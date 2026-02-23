/**
 * Seed script: Add 80+ compliance RSS sources across all domains.
 *
 * Usage:
 *   npx tsx scripts/seed-compliance-sources.ts
 *
 * This script is idempotent — it skips sources whose URL already exists.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SourceDef {
  name: string;
  url: string;
  type: "RSS_FEED" | "WEBSITE" | "REGULATORY_BODY" | "RESEARCH_PAPER" | "INDUSTRY_REPORT";
  category: string;
  fetchIntervalHours?: number;
  reliability?: number;
}

const complianceSources: SourceDef[] = [
  // ============================================
  // E-INVOICING & DIGITAL TAX
  // ============================================
  { name: "Sovos Blog", url: "https://sovos.com/blog/feed/", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Avalara Blog", url: "https://www.avalara.com/blog/en/north-america.xml", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Vertex Tax Blog", url: "https://www.vertexinc.com/resources/resource-library/feed", type: "RSS_FEED", category: "tax-compliance" },
  { name: "Comarch E-Invoicing Blog", url: "https://www.comarch.com/e-invoicing/blog/feed/", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Pagero Blog", url: "https://www.pagero.com/blog/rss.xml", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Tungsten Network Blog", url: "https://www.tungsten-network.com/blog/feed/", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Fonoa Blog", url: "https://www.fonoa.com/blog/rss.xml", type: "RSS_FEED", category: "tax-compliance" },
  { name: "Tax Foundation", url: "https://taxfoundation.org/feed/", type: "RSS_FEED", category: "tax-compliance" },
  { name: "OECD Tax News", url: "https://www.oecd.org/tax/rss/tax-news.xml", type: "REGULATORY_BODY", category: "tax-compliance", fetchIntervalHours: 12 },
  { name: "IRS Newsroom", url: "https://www.irs.gov/newsroom/feeds", type: "REGULATORY_BODY", category: "tax-compliance", fetchIntervalHours: 12 },
  { name: "HMRC News", url: "https://www.gov.uk/government/organisations/hm-revenue-customs.atom", type: "REGULATORY_BODY", category: "tax-compliance", fetchIntervalHours: 12 },
  { name: "EU Tax Policy News", url: "https://taxation-customs.ec.europa.eu/news_en?f%5B0%5D=oe_content_content_type%3Aoe_news", type: "REGULATORY_BODY", category: "tax-compliance", fetchIntervalHours: 24 },
  { name: "Peppol Community", url: "https://peppol.org/feed/", type: "INDUSTRY_REPORT", category: "e-invoicing" },
  { name: "Seeburger Blog", url: "https://blog.seeburger.com/feed/", type: "RSS_FEED", category: "e-invoicing" },
  { name: "Unifiedpost Blog", url: "https://www.unifiedpost.com/blog/feed/", type: "RSS_FEED", category: "e-invoicing" },

  // ============================================
  // CYBERSECURITY & SOC 2
  // ============================================
  { name: "NIST Computer Security", url: "https://csrc.nist.gov/csrc/feeds/news", type: "REGULATORY_BODY", category: "cybersecurity", fetchIntervalHours: 12, reliability: 0.95 },
  { name: "CISA Alerts", url: "https://www.cisa.gov/news.xml", type: "REGULATORY_BODY", category: "cybersecurity", fetchIntervalHours: 6, reliability: 0.95 },
  { name: "SecurityWeek", url: "https://www.securityweek.com/feed/", type: "RSS_FEED", category: "cybersecurity" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", type: "RSS_FEED", category: "cybersecurity" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", type: "RSS_FEED", category: "cybersecurity", reliability: 0.9 },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", type: "RSS_FEED", category: "cybersecurity" },
  { name: "The Record by Recorded Future", url: "https://therecord.media/feed", type: "RSS_FEED", category: "cybersecurity" },
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", type: "RSS_FEED", category: "cybersecurity" },
  { name: "Vanta Blog", url: "https://www.vanta.com/blog/rss.xml", type: "RSS_FEED", category: "soc2" },
  { name: "Drata Blog", url: "https://drata.com/blog/rss.xml", type: "RSS_FEED", category: "soc2" },
  { name: "Secureframe Blog", url: "https://secureframe.com/blog/rss.xml", type: "RSS_FEED", category: "soc2" },
  { name: "ENISA News", url: "https://www.enisa.europa.eu/rss.xml", type: "REGULATORY_BODY", category: "cybersecurity", fetchIntervalHours: 12 },
  { name: "ISO News", url: "https://www.iso.org/iso/feed.rss", type: "REGULATORY_BODY", category: "cybersecurity" },

  // ============================================
  // DATA PRIVACY
  // ============================================
  { name: "EDPB News", url: "https://www.edpb.europa.eu/rss_en", type: "REGULATORY_BODY", category: "data-privacy", fetchIntervalHours: 12, reliability: 0.95 },
  { name: "CNIL News (France DPA)", url: "https://www.cnil.fr/en/rss.xml", type: "REGULATORY_BODY", category: "data-privacy", fetchIntervalHours: 12 },
  { name: "ICO Enforcement (UK)", url: "https://ico.org.uk/about-the-ico/media-centre/rss-feeds/", type: "REGULATORY_BODY", category: "data-privacy", fetchIntervalHours: 12 },
  { name: "DataGuidance News", url: "https://www.dataguidance.com/rss.xml", type: "INDUSTRY_REPORT", category: "data-privacy" },
  { name: "OneTrust Blog", url: "https://www.onetrust.com/blog/feed/", type: "RSS_FEED", category: "data-privacy" },
  { name: "BigID Blog", url: "https://bigid.com/blog/feed/", type: "RSS_FEED", category: "data-privacy" },
  { name: "Securiti Blog", url: "https://securiti.ai/blog/feed/", type: "RSS_FEED", category: "data-privacy" },
  { name: "Future of Privacy Forum", url: "https://fpf.org/feed/", type: "RESEARCH_PAPER", category: "data-privacy" },
  { name: "Privacy Matters (Fieldfisher)", url: "https://privacymatters.dlapiper.com/feed/", type: "RSS_FEED", category: "data-privacy" },
  { name: "NOYB News", url: "https://noyb.eu/en/rss.xml", type: "RSS_FEED", category: "data-privacy" },

  // ============================================
  // ESG & SUSTAINABILITY
  // ============================================
  { name: "EFRAG Updates", url: "https://www.efrag.org/rss", type: "REGULATORY_BODY", category: "esg", fetchIntervalHours: 12, reliability: 0.95 },
  { name: "ISSB / IFRS News", url: "https://www.ifrs.org/news-and-events/rss/", type: "REGULATORY_BODY", category: "esg", fetchIntervalHours: 12 },
  { name: "GRI News", url: "https://www.globalreporting.org/about-gri/news-center/rss/", type: "REGULATORY_BODY", category: "esg" },
  { name: "SEC Climate/ESG", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=climate&dateb=&owner=include&count=40&search_text=&action=getcompany", type: "REGULATORY_BODY", category: "esg", fetchIntervalHours: 24 },
  { name: "ESG Today", url: "https://www.esgtoday.com/feed/", type: "RSS_FEED", category: "esg" },
  { name: "GreenBiz", url: "https://www.greenbiz.com/rss.xml", type: "RSS_FEED", category: "esg" },
  { name: "Responsible Investor", url: "https://www.responsible-investor.com/feed/", type: "RSS_FEED", category: "esg" },
  { name: "CDP News", url: "https://www.cdp.net/en/articles/rss", type: "REGULATORY_BODY", category: "esg" },
  { name: "Watershed Blog", url: "https://watershed.com/blog/rss.xml", type: "RSS_FEED", category: "esg" },
  { name: "Persefoni Blog", url: "https://persefoni.com/blog/rss.xml", type: "RSS_FEED", category: "esg" },

  // ============================================
  // FINTECH & AML
  // ============================================
  { name: "EBA Updates", url: "https://www.eba.europa.eu/rss.xml", type: "REGULATORY_BODY", category: "fintech", fetchIntervalHours: 12 },
  { name: "FinCEN News", url: "https://www.fincen.gov/news/rss.xml", type: "REGULATORY_BODY", category: "fintech", fetchIntervalHours: 12, reliability: 0.95 },
  { name: "FCA News (UK)", url: "https://www.fca.org.uk/news/rss.xml", type: "REGULATORY_BODY", category: "fintech", fetchIntervalHours: 12 },
  { name: "FATF Publications", url: "https://www.fatf-gafi.org/rss/", type: "REGULATORY_BODY", category: "fintech", fetchIntervalHours: 24 },
  { name: "Finextra", url: "https://www.finextra.com/rss/headlines.aspx", type: "RSS_FEED", category: "fintech" },
  { name: "PaymentsJournal", url: "https://www.paymentsjournal.com/feed/", type: "RSS_FEED", category: "fintech" },
  { name: "ESMA News", url: "https://www.esma.europa.eu/rss.xml", type: "REGULATORY_BODY", category: "fintech", fetchIntervalHours: 12 },
  { name: "Chainalysis Blog", url: "https://blog.chainalysis.com/feed/", type: "RSS_FEED", category: "fintech" },
  { name: "ComplyAdvantage Blog", url: "https://complyadvantage.com/blog/feed/", type: "RSS_FEED", category: "fintech" },
  { name: "CoinDesk Regulation", url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml&_website=coindesk", type: "RSS_FEED", category: "fintech" },

  // ============================================
  // HR & EMPLOYMENT LAW
  // ============================================
  { name: "SHRM News", url: "https://www.shrm.org/rss/pages/RSS.aspx", type: "RSS_FEED", category: "hr-compliance" },
  { name: "EEOC Newsroom", url: "https://www.eeoc.gov/newsroom/rss.xml", type: "REGULATORY_BODY", category: "hr-compliance", fetchIntervalHours: 12 },
  { name: "DOL Regulatory Updates", url: "https://www.dol.gov/rss/releases.xml", type: "REGULATORY_BODY", category: "hr-compliance", fetchIntervalHours: 12 },
  { name: "HR Dive", url: "https://www.hrdive.com/feeds/news/", type: "RSS_FEED", category: "hr-compliance" },
  { name: "Littler Mendelson Blog", url: "https://www.littler.com/rss.xml", type: "RSS_FEED", category: "hr-compliance" },
  { name: "Fisher Phillips Blog", url: "https://www.fisherphillips.com/rss.xml", type: "RSS_FEED", category: "hr-compliance" },
  { name: "Deel Blog", url: "https://www.deel.com/blog/rss.xml", type: "RSS_FEED", category: "hr-compliance" },
  { name: "Remote Blog", url: "https://remote.com/blog/rss.xml", type: "RSS_FEED", category: "hr-compliance" },
  { name: "Syndio Blog", url: "https://synd.io/blog/feed/", type: "RSS_FEED", category: "hr-compliance" },
  { name: "People Management", url: "https://www.peoplemanagement.co.uk/rss", type: "RSS_FEED", category: "hr-compliance" },

  // ============================================
  // GENERAL REGULATORY & GRC
  // ============================================
  { name: "Federal Register", url: "https://www.federalregister.gov/documents/search.rss", type: "REGULATORY_BODY", category: "regulation", fetchIntervalHours: 6, reliability: 0.95 },
  { name: "EU Official Journal", url: "https://eur-lex.europa.eu/rss/OJOL.xml", type: "REGULATORY_BODY", category: "regulation", fetchIntervalHours: 12, reliability: 0.95 },
  { name: "UK Parliament Bills", url: "https://bills.parliament.uk/rss/allbills.rss", type: "REGULATORY_BODY", category: "regulation", fetchIntervalHours: 12 },
  { name: "CFPB Newsroom", url: "https://www.consumerfinance.gov/about-us/newsroom/feed/", type: "REGULATORY_BODY", category: "regulation", fetchIntervalHours: 12 },
  { name: "SEC Regulatory Actions", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=rule&dateb=&owner=include&count=40&action=getcompany", type: "REGULATORY_BODY", category: "regulation", fetchIntervalHours: 12 },
  { name: "Thomson Reuters Regulatory Intelligence", url: "https://legal.thomsonreuters.com/blog/feed/", type: "RSS_FEED", category: "general-compliance" },
  { name: "JD Supra Compliance", url: "https://www.jdsupra.com/topics/compliance/feed/", type: "RSS_FEED", category: "general-compliance" },
  { name: "Compliance Week", url: "https://www.complianceweek.com/rss", type: "RSS_FEED", category: "general-compliance" },
  { name: "RegTech Analyst", url: "https://member.fintech.global/feed/", type: "RSS_FEED", category: "general-compliance" },
];

async function main() {
  console.log("Seeding compliance sources...\n");

  let added = 0;
  let skipped = 0;

  for (const source of complianceSources) {
    // Check if URL already exists
    const existing = await prisma.agentSource.findFirst({
      where: { url: source.url },
    });

    if (existing) {
      console.log(`  SKIP: ${source.name} (URL already exists)`);
      skipped++;
      continue;
    }

    await prisma.agentSource.create({
      data: {
        name: source.name,
        url: source.url,
        type: source.type,
        category: source.category,
        isActive: true,
        fetchIntervalHours: source.fetchIntervalHours ?? 24,
        reliability: source.reliability ?? 0.8,
      },
    });

    console.log(`  ADD:  ${source.name} [${source.category}]`);
    added++;
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}, Total sources defined: ${complianceSources.length}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
