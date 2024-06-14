import { db } from "./db.js";
import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { chunk } from "lodash-es";

const siteId = "Star Wars";
const baseUrl = "https://starwars.fandom.com/wiki/";
const mainPageId = "Main_Page";

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

await db("Site").insert({
  id: siteId,
  baseUrl
}).onConflict().ignore();

await db("Page").insert({
  siteId,
  id: mainPageId
}).onConflict().ignore();

async function crawlNext() {
  const pageId = (await db("Page").select("id").where({ html: null }).limit(1))[0]?.id;
  
  if (pageId) {
    console.log(`Scraping \`${pageId}\`.`);
    await page.goto(`${baseUrl}${pageId}`, { waitUntil: "networkidle2" });
    const html = await page.content();
    await db("Page").where({ id: pageId }).update({ html });

    const $ = cheerio.load(html);
    let edges = [];

    $(`main a[href^="/wiki/"]`).each((index, element) => {
      const parsedUrl = new URL($(element).attr("href"), baseUrl);
      parsedUrl.search = "";
      parsedUrl.hash = "";
      const edgePageId = parsedUrl
        .toString()
        .slice(baseUrl.length)
        .split("/")[0];

      if (!edgePageId.includes(":")) {
        edges.push(edgePageId);
      }
    });

    edges = [...new Set(edges)].map((edge) => {
      return {
        siteId,
        fromPageId: pageId,
        toPageId: edge,
      };
    });

    const pages = edges.map((edge) => {
      return {
        siteId,
        id: edge.toPageId
      };
    });

    await batchInsertOnConflictIgnore("Edge", edges);
    await batchInsertOnConflictIgnore("Page", pages);

    setTimeout(async () => {
      await crawlNext();
    }, 5000);
  } else {
    console.log("No unscraped pages.");
    await browser.close();
    db.destroy();
  }
}

await crawlNext();
