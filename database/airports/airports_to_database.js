const pg = require('pg');
const axios = require('axios');
const CSV = require('csv-string');
const ProgressBar = require('progress');
const connection_string = "postgres://gis_user:gis_pass@localhost:25432/gis_db";

let create_table_string = '';
let url = '';
let insert_into = '';
let integer_place = [];
let progress_length = 0;

if (process.argv.length === 2 || process.argv[2] === '0') {
	create_table_string = 'DROP TABLE IF EXISTS airports;'
		+ 'CREATE TABLE airports ('
  		+ 'airport_id int NOT NULL PRIMARY KEY,'
  		+ 'iata varchar(3) NOT NULL,'
  		+ 'icao varchar(4) NOT NULL,'
  		+ 'name_en varchar(100),'
  		+ 'name_de varchar(250),'
  		+ 'length_ft smallint,'
  		+ 'wiki_new_en varchar(250),'
  		+ 'wiki_new_de varchar(255),'
  		+ 'latitude decimal(10,7) NOT NULL,'
  		+ 'longitude decimal(10,7) NOT NULL,'
  		+ 'elevation_ft int,'
  		+ 'country_code varchar(2)'
		+ ');';
	url = 'https://www.abflug.info/resources/downloads/airports.csv';
	insert_into = `INSERT INTO airports (airport_id, iata, icao, name_en, name_de, length_ft, wiki_new_en, wiki_new_de, latitude, longitude, elevation_ft, country_code) VALUES (`;
	integer_place = [0,5,10];
	progress_length = 5;
} else if (process.argv[2] === '1') {
	create_table_string = 'DROP TABLE IF EXISTS airports;'
		+ 'CREATE TABLE airports ('
  		+ 'airport_id int NOT NULL PRIMARY KEY,'
  		+ 'ident varchar(200),'
  		+ 'type varchar(200),'
  		+ 'name varchar(200) NOT NULL,'
  		+ 'latitude decimal NOT NULL,'
  		+ 'longitude decimal NOT NULL,'
  		+ 'elevation_ft int,'
  		+ 'continent varchar(200),'
  		+ 'iso_country varchar(200),'
  		+ 'iso_region varchar(200),'
  		+ 'municipality varchar(200),'
  		+ 'scheduled_service varchar(200),'
  		+ 'gps_code varchar(200),'
  		+ 'iata_code varchar(200) NOT NULL,'
  		+ 'local_code varchar(200),'
  		+ 'home_link varchar(200),'
  		+ 'wikipedia_link varchar(200),'
  		+ 'keywords varchar(500)'
		+ ');';
	url = 'https://ourairports.com/data/airports.csv';
	insert_into = `INSERT INTO airports (airport_id,ident,type,name,latitude,longitude,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords) VALUES (`;
	integer_place = [0,6];
	progress_length = 1.25;
} else {
	console.log('---------------------------------------------------------------');
	console.log('---------------------------------------------------------------');
	console.log(`---Please give 'no' value, or '0' as value, or '1' or value!---`);
	console.log('---------------------------------------------------------------');
	console.log('---------------------------------------------------------------');
	process.exit(1);
}

console.log(`Downloading Airport Data from ${url}`);
axios.get(url)
	.then(response => {
		console.log('Download Successful!');
		const response_data_as_array = CSV.parse(response.data);
		database_operations(response_data_as_array);
	})
	.catch(error => {
		console.log(error);
	});

async function database_operations(data) {
	const client_creation = new pg.Client(connection_string);
	await client_creation.connect();
	client_creation.query(
		create_table_string,
		(err, res) => {
			if (err !== null) {
				console.log(err)
			} else {
				console.log('Created Table: airports');
			}
			client_creation.end();
			insert_into_table(data);
		}
	);
}

async function insert_into_table(data) {
	let insertion_string = '';
	const bar = new ProgressBar('Insertion:  [:bar] :percent', { complete: '=', incomplete: ' ', total: Math.floor(data.length / 500 * progress_length)});
	for (let i = 1; i < data.length; i++) {
		insertion_string += insert_into;
		for (let j = 0; j < data[i].length - 1; j++) {
			let to_insert = data[i][j];
			if (to_insert.includes(`'`)) {
				to_insert = to_insert.replaceAll(`'`, `''`);
			}
			if (to_insert === '') {
				if (!integer_place.includes(j)) {
					insertion_string += `'',`;
				} else {
					insertion_string += '0,';
				}
			} else {
				insertion_string += `'`;
				insertion_string += to_insert;
				insertion_string += `',`;
			}
		}
		insertion_string += `'`;
		insertion_string += data[i][data[i].length - 1].replaceAll(`'`, `''`);
		insertion_string += `'`;
		insertion_string += `);\n`;
		if ((i % 500) === 0 || i === data.length - 1) {
			const client_insertion = new pg.Client(connection_string);
			await client_insertion.connect();
			client_insertion.query(
				insertion_string,
				(err, res) => {
					if (err !== null) {
						console.log(err);
					}
					client_insertion.end();
				}
			);
			insertion_string = '';
			bar.tick(progress_length);
		}
	}
	console.log(`Successfully Inserted ${data.length - 2} Data Records`)
}
