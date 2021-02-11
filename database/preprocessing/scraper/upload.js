const PG = require('pg');
const Progress = require('cli-progress');
const { readFile } = require('fs').promises

run();

async function run() {
    const chuckSize = 1000;
    const sql = (await readFile('../data.sql')).toString();
    const queries = sql.split('\n');
    const chunks = new Array(Math.ceil(queries.length / chuckSize)).fill(null).map((_, i) => queries.slice(i * chuckSize, (i + 1) * chuckSize));
    const bar = new Progress.SingleBar({}, Progress.Presets.shades_classic);
    bar.start(queries.length, 0);
    
    const client_insertion = new PG.Client("postgres://gis_user:gis_pass@localhost:25432/gis_db");
    await client_insertion.connect();
    
    for (const chunk of chunks) {
        await client_insertion.query(chunk.join('\n'))
            .catch(e => {
                console.error(e.stack);
                process.exit(1);
            });

        bar.increment(chunk.length);
    }
    bar.stop();
}