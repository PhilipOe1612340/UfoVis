// @ts-check
const { group } = require("console");
const csv = require("csv-parser");
const { createReadStream, createWriteStream } = require("fs");
const { join } = require("path");

let counter = 0;
function convert(data) {
    // TODO: parse more patterns like:
    /*
     * 4+ hours
     * 00:01:40
     * 
     */
    // parse duration string
    let duration = 0;
    const seconds = parseDuration(data.Duration, "s");
    duration += seconds;
    const minutes = parseDuration(data.Duration, "min");
    duration += minutes * 60;
    const hours = parseDuration(data.Duration, "hour");
    duration += hours * 60 * 60;
    const days = parseDuration(data.Duration, "day");
    duration += days * 60 * 60 * 24;

    if (duration === 0) {
        counter++;
    }

    const [month, day, year] = data.Posted.split("/");
    return `INSERT INTO Report(id, shape, duration, description, date, point) VALUES(DEFAULT, ${str(data.Shape)}, ${duration === 0 ? "NULL" : duration}, ${str(data.Summary)}, '20${year}-${month}-${day}', 'SRID=4326;POINT(${data.Lng} ${data.Lat})');\n`;
}

const file = createWriteStream('../data.sql');

file.write("CREATE TABLE IF NOT EXISTS Report(id SERIAL, shape VARCHAR(20), duration INTEGER, description TEXT, date DATE NOT NULL, point GEOGRAPHY(POINT);");
file.write("\n")
file.write("TRUNCATE Report;");
file.write("\n")

createReadStream(join(__dirname, "../converted.csv"))
    .pipe(csv())
    .on("data", (line) => file.write(convert(line)))
    .on("end", () => {
        file.end();
        console.log("could not parse", counter, "duration strings")
    });


function parseDuration(dur, searchString) {
    const reg = new RegExp("(?<num>([0-9]*[.])?[0-9]+)\\s?" + searchString);
    const match = dur.toLowerCase().match(reg);
    if (match && match.groups && match.groups.num) {
        return parseFloat(match.groups.num);
    }
    return 0;
}

function str(string) {
    if (string === "") {
        return "NULL";
    }
    return `'${string.replace(/\'/g, "''")}'`
}