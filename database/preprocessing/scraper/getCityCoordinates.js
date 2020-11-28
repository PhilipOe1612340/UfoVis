// @ts-check
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const { readdir, writeFile } = require("fs").promises;
const { createReadStream, accessSync } = require("fs");
const { join } = require("path");

const DEBUG = false;

/** @type {{city: string, lat: string, lng: string, iso3:string}[]} */
const cities = [];
const inputDir = join(__dirname, "../ufodata");
const outputFile = join(__dirname, "../converted");
let notFound = 0;

console.log("reading cities");
createReadStream(join(__dirname, "worldcities.csv"))
  .pipe(csv())
  .on("data", (line) => cities.push({ ...line, city: line.city_ascii.toLocaleLowerCase() }))
  .on("end", () => {
    getLocation();
  });

async function getLocation() {
  const files = await readdir(inputDir);
  const converted = [];
  for (const file of files.filter((f) => f.endsWith("csv"))) {
    console.log("converting", file);
    await new Promise((res) => {
      createReadStream(join(inputDir, file))
        .pipe(csv())
        .on("data", (data) => {
          const p = convertDataPoint(data);
          if (p) {
            converted.push(p);
          }
        })
        .on("end", res);
    });
  }

  // write geojson sample
  const geoString = converted
    .filter(() => Math.random() > 0.95)
    .slice(0, 1000)
    .filter((c) => !!c.Shape)
    .map((c) => JSON.stringify(new Point(c)))
    .join(", ");

  const geojson = `{
    "name": "NewFeatureType",
    "type": "FeatureCollection",
    "features": [${geoString}]
  }`;

  await writeFile(outputFile + ".geo.json", geojson);

  // write csv
  console.log("found:", converted.length, "not found:", notFound, `(${~~((notFound / (converted.length + notFound)) * 100)}%)`);
  console.log("... saving");
  const csvWriter = createCsvWriter({ path: outputFile + '.csv', header: Object.keys(converted[0]).map((h, id) => ({ id: h, title: h })) });
  csvWriter.writeRecords(converted);
}

/**
 * @param {{'Date / Time': string, City: string, State: string, Shape: string, Duration: string, Summary: string, Posted: string, Lat: string, Lng: string}} data
 */
function convertDataPoint(data) {
  if (!data.City) {
    return;
  }
  const queryName = data.City.toLocaleLowerCase().replace(/\s*\(.*\)$/, "");

  const city = cities.find((c) => queryName === c.city);
  if (!city) {
    notFound++;
    DEBUG && console.log("could not find", data.City);
    return;
  }

  data.Lat = city.lat;
  data.Lng = city.lng;
  return data;
}

class Point {
  /**
   * @param {{'Date / Time': string, City: string, State: string, Shape: string, Duration: string, Summary: string, Posted: string, Lat: string, Lng: string,}} record
   */
  constructor(record) {
    this.type = "Feature";
    this.geometry = {
      type: "Point",
      coordinates: [record.Lng, record.Lat].map(parseFloat),
    };
    this.properties = {
      shape: record.Shape,
    };
  }
}
