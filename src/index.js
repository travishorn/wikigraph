import { db } from "./db.js";
import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { chunk } from "lodash-es";

const batchInsertOnConflictIgnore = async (table, rows) => {
  const chunkedRows = chunk(rows, 10);
  const insertedRows = [];
  await db.transaction(async (trx) => {
    for (const chunk of chunkedRows) {
      insertedRows.push(
        await trx(table)
          .insert(chunk)
          .onConflict()
          .ignore()
      );
    }
  });
  return insertedRows;
};

const browser = await puppeteer.launch();
const page = await browser.newPage();
let consecutiveErrors = 0;

await db("Site").insert({
  id: process.env.SITE_ID,
  baseUrl: process.env.BASE_URL
}).onConflict().ignore();

await db("Page").insert({
  siteId: process.env.SITE_ID,
  id: process.env.MAIN_PAGE_ID
}).onConflict().ignore();

async function crawlNext() {
  const pageId = (await db("Page").select("id").where({ html: null }).limit(1))[0]?.id;
  
  if (pageId) {
    console.log(`Scraping \`${pageId}\`.`);
    let html;

    try {
      await page.goto(`${process.env.BASE_URL}${pageId}`, { waitUntil: "networkidle2" });
      html = await page.content();
      consecutiveErrors = 0;
    } catch(err) {
      console.log('Error. Skipping.');
      html = err.message;
      consecutiveErrors += 1;
    }

    await db("Page").where({ id: pageId }).update({ html });

    const $ = cheerio.load(html);
    let edges = [];

    $(`main a[href^="/wiki/"]`).each((index, element) => {
      const parsedUrl = new URL($(element).attr("href"), process.env.BASE_URL);
      parsedUrl.search = "";
      parsedUrl.hash = "";
      const edgePageId = parsedUrl
        .toString()
        .slice(process.env.BASE_URL.length)
        .split("/")[0];

      if (!edgePageId.includes(":")) {
        edges.push(edgePageId);
      }
    });

    edges = [...new Set(edges)].map((edge) => {
      return {
        siteId: process.env.SITE_ID,
        fromPageId: pageId,
        toPageId: edge,
      };
    });

    const pages = edges.map((edge) => {
      return {
        siteId: process.env.SITE_ID,
        id: edge.toPageId
      };
    });

    await batchInsertOnConflictIgnore("Edge", edges);
    await batchInsertOnConflictIgnore("Page", pages);

    if (consecutiveErrors >= 3) {
      console.log('Too many consecutive errors. Stopping.');
      await browser.close();
      db.destroy();
      process.exit(1);
    } else {
      setTimeout(async () => {
        await crawlNext();
      }, Number(process.env.RATE_LIMIT));
    }
  } else {
    console.log("No unscraped pages.");
    await browser.close();
    db.destroy();
    process.exit(0);
  }
}

await crawlNext();
