// @ts-check
const fetch = require("node-fetch");
const { parse } = require("node-html-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { access, mkdir, writeFile } = require("fs").promises;
const { join } = require("path");

const DEBUG = false;

const pages = [
  "ndxl",
  "ndxlAB",
  "ndxlAK",
  "ndxlAL",
  "ndxlAR",
  "ndxlAZ",
  "ndxlBC",
  "ndxlCA",
  "ndxlCO",
  "ndxlCT",
  "ndxlDC",
  "ndxlDE",
  "ndxlFL",
  "ndxlGA",
  "ndxlHI",
  "ndxlIA",
  "ndxlID",
  "ndxlIL",
  "ndxlIN",
  "ndxlKS",
  "ndxlKY",
  "ndxlLA",
  "ndxlM0",
  "ndxlMA",
  "ndxlMB",
  "ndxlMD",
  "ndxlME",
  "ndxlMI",
  "ndxlMN",
  "ndxlMO",
  "ndxlMS",
  "ndxlMT",
  "ndxlNB",
  "ndxlNC",
  "ndxlND",
  "ndxlNE",
  "ndxlNF",
  "ndxlNH",
  "ndxlNJ",
  "ndxlNM",
  "ndxlNS",
  "ndxlNT",
  "ndxlNV",
  "ndxlNY",
  "ndxlOH",
  "ndxlOK",
  "ndxlON",
  "ndxlOR",
  "ndxlPA",
  "ndxlPE",
  "ndxlPR",
  "ndxlQB",
  "ndxlQC",
  "ndxlRI",
  "ndxlSA",
  "ndxlSC",
  "ndxlSD",
  "ndxlSK",
  "ndxlTN",
  "ndxlTX",
  "ndxlUT",
  "ndxlVA",
  "ndxlVT",
  "ndxlWA",
  "ndxlWI",
  "ndxlWV",
  "ndxlWY",
  "ndxlYT",
];

const outputDir = "../data";

async function getDataSet() {
  if (!(await exists(outputDir))) {
    await mkdir(outputDir);
  }

  let nrOfDataPoints = 0;

  for (const page of pages) {
    const path = join(outputDir, page + ".csv");
    if ((await exists(path)) && !DEBUG) {
      console.log("skipping", page);
      continue;
    }
    console.log("downloading", page);

    // @ts-ignore
    const request = await fetch("http://www.nuforc.org/webreports/" + page + ".html");
    /** @type {string} */
    let html = await request.text();

    // remove strange unclosed html tags the parser does not like
    html = html.replace(/<TD.+><A HREF=.+>/gm, "").replace(/<FONT style=FONT-SIZE:11pt FACE="Calibri" COLOR=#000000>/gm, "");
    await writeFile("./debug.html", html);

    // parse html
    const document = parse(html, { lowerCaseTagName: true });

    // get table headers
    const ths = document.querySelectorAll("th");
    const header = ths.map((row) => row.innerText);

    const csvWriter = createCsvWriter({
      path,
      header: header.map((h, id) => ({ id: "data" + id, title: h })),
    });

    // transform data
    const trs = document.querySelectorAll("tr").slice(1);
    const records = trs.map((row) => {
      const record = {};
      row.childNodes
        .map((n) => n.innerText)
        .filter((t) => t.replace(/\r\n/g, "").length > 0)
        .forEach((text, id) => (record["data" + id] = text));

      return record;
    });
    csvWriter.writeRecords(records);
    nrOfDataPoints += records.length;
  }

  DEBUG && console.log("downloaded", nrOfDataPoints, "datapoints.");
  console.log();
  console.log("------------------------");
  console.log("------- all done -------");
  console.log("------------------------");
  console.log();
}

function exists(path) {
  return access(path)
    .then(() => true)
    .catch(() => false);
}

getDataSet();
