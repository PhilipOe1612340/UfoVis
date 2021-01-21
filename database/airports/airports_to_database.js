const PG = require('pg');
const AXIOS = require('axios');
const CSV = require('csv-string');
const PROGRESSBAR = require('progress');
const CONNECTION_STRING = "postgres://gis_user:gis_pass@localhost:25432/gis_db";
const INSERT_INTO_STRING = 'INSERT INTO airport (id, iata_code, name, coordinates, elevation_ft, country_code, type_size) VALUES (';
const CREATE_TABLE_STRING = 'DROP TABLE IF EXISTS airport;'
        + 'CREATE TABLE airport ('
        + 'id int NOT NULL PRIMARY KEY,'
        + 'iata_code varchar(10),'
        + 'name varchar(100) NOT NULL,'
        + 'elevation_ft int,'
        + 'type_size varchar(50),'
        + 'country_code varchar(5),'
        + 'coordinates geometry NOT NULL'
        + ');';
let url = '';
let progress_length = 0;
let index_to_key = [];

script_actions();

async function script_actions() {
    if (process.argv.length === 2 || process.argv[2] === '0') {
        url = 'https://www.abflug.info/resources/downloads/airports.csv';
        progress_length = 5;
        index_to_key = [0,1,3,8,9,10,11,-1];
    } else if (process.argv[2] === '1') {
        url = 'https://ourairports.com/data/airports.csv';
        index_to_key = [0,13,3,4,5,6,8,2];
        progress_length = 1;
    } else {
        console.log('---------------------------------------------------------------');
        console.log('---------------------------------------------------------------');
        console.log(`---Please give 'no' value, or '0' as value, or '1' or value!---`);
        console.log('---------------------------------------------------------------');
        console.log('---------------------------------------------------------------');
        process.exit(1);
    }
    const raw_data = await download_data();
    const transformed_data = response_data_to_csv(raw_data);
    await create_table();
    insert_into_table(transformed_data);
}


async function download_data() {
    console.log(`Downloading Airport Data from ${url}`);
    const data = AXIOS.get(url)
        .then(response => {
            console.log('Download Successful!');
            return response.data;
        })
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
    return data;
}

function response_data_to_csv(response_data_string) {
    let response_data_array = CSV.parse(response_data_string);
    let transformed_data = [];
    for (let i = 1; i < response_data_array.length; i++) {
        for (let j = 0; j < response_data_array[i].length; j++) {
            if (response_data_array[i][j] === '' || response_data_array[i][j] === undefined) {
                response_data_array[i][j] = null;
            } else {
                response_data_array[i][j] = response_data_array[i][j].replaceAll(`'`, `''`)
            }
        }
        if (response_data_array[i][index_to_key[7]] === undefined) {
            response_data_array[i][index_to_key[7]] = 'large_airport';
        }
        const temp = new Object();;
        temp.id = response_data_array[i][index_to_key[0]];
        temp.iata_code = response_data_array[i][index_to_key[1]];
        temp.name = response_data_array[i][index_to_key[2]];
        temp.latitude = response_data_array[i][index_to_key[3]];
        temp.longitude = response_data_array[i][index_to_key[4]];
        temp.elevation_ft = response_data_array[i][index_to_key[5]];
        temp.country_code = response_data_array[i][index_to_key[6]];
        temp.type_size = response_data_array[i][index_to_key[7]];
        transformed_data.push(temp);
    }
    return transformed_data;
}

async function create_table() {
    const client_creation = new PG.Client(CONNECTION_STRING);
    await client_creation.connect();
    await client_creation.query(CREATE_TABLE_STRING)
        .then(console.log('Created Table: airports'))
        .catch(e => console.error(e.stack));
    client_creation.end();
}

async function insert_into_table(data) {
    let insertion_string = '';
    const bar = new PROGRESSBAR('Insertion:  [:bar] :percent', { complete: '=', incomplete: ' ', total: Math.floor(data.length / 1000 * progress_length) + 1});
    for (let i = 0; i < data.length; i++) {
        insertion_string += INSERT_INTO_STRING;
        insertion_string += `${data[i].id},`;
        if (data[i].iata_code === null) {
            insertion_string += 'null,';
        } else {
            insertion_string += `'${data[i].iata_code}',`;
        }
        insertion_string += `'${data[i].name}',`;
        insertion_string += `ST_SetSRID(ST_MakePoint(${data[i].longitude}, ${data[i].latitude}), 4326),`;
        insertion_string += `${data[i].elevation_ft},`;
        if (data[i].country_code === null) {
            insertion_string += 'null,';
        } else {
            insertion_string += `'${data[i].country_code}',`;
        }
        if (data[i].type_size === null) {
            insertion_string += 'null);\n';
        } else {
            insertion_string += `'${data[i].type_size}');\n`;
        }
        if ((i % 1000) === 0 || i === data.length - 1) {
            const client_insertion = new PG.Client(CONNECTION_STRING);
            await client_insertion.connect();
            await client_insertion.query(insertion_string)
                .catch(e => {
                    console.error(e.stack);
                    process.exit(1);
                });
            client_insertion.end();
            insertion_string = '';
            bar.tick(progress_length);
        }
    }
    console.log(`Successfully Inserted ${data.length} Data Records`)
}
