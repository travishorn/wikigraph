import { db } from "./db.js";
import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { pRateLimit } from "p-ratelimit";

const site = {
  id: "Star Wars",
  baseUrl: "https://starwars.fandom.com/wiki/",
};

const limit = pRateLimit({
  interval: 5000,
  rate: 1,
  concurrency: 1,
});

await db("Site").insert(site).onConflict().ignore();

const browser = await puppeteer.launch();
const page = await browser.newPage();

async function crawl(pageId) {
  console.log(`Crawling \`${pageId}\`.`);
  let html = (await db("Page").select("html").where({ id: pageId }).limit(1))[0]
    ?.html;

  if (!html) {
    console.log(`No cache for \`${pageId}\`. Fetching...`);
    await page.goto(`${site.baseUrl}${pageId}`, { waitUntil: "networkidle2" });
    html = await page.content();

    await db("Page").insert({
      siteId: site.id,
      id: pageId,
      html,
    });
  } else {
    console.log(`Using cache for \`${pageId}\`.`);
  }

  const crawled =
    (await db("Edge").count().where({ fromPageId: pageId }))[0]["count(*)"] > 0;

  if (!crawled) {
    console.log(`Crawling edges for \`${pageId}\`.`);
    const $ = cheerio.load(html);
    let edges = [];

    $(`main a[href^="/wiki/"]`).each((index, element) => {
      const parsedUrl = new URL($(element).attr("href"), site.baseUrl);
      parsedUrl.search = "";
      parsedUrl.hash = "";
      const edgePageId = parsedUrl
        .toString()
        .slice(site.baseUrl.length)
        .split("/")[0];

      if (!edgePageId.includes(":")) {
        edges.push(edgePageId);
      }
    });

    edges = [...new Set(edges)].map((edge) => {
      return {
        siteId: site.id,
        fromPageId: pageId,
        toPageId: edge,
      };
    });

    console.log(`Storing ${edges.length} edges for \`${pageId}\`.`);
    await db("Edge").insert(edges).onConflict().ignore();

    edges.forEach(async (edge) => {
      await limit(async () => {
        await crawl(edge.toPageId);
      });
    });
  } else {
    console.log(`Edges already stored for \`${pageId}\`.`);
  }
}

await crawl("Main_Page");

//await browser.close();
//db.destroy();
