const pg = require('pg');
const axios = require('axios');
const CSV = require('csv-string');
const ProgressBar = require('progress');
const connection_string = "postgres://gis_user:gis_pass@localhost:25432/gis_db";

let create_table_string = '';
let url = '';
let insert_into = '';
let progress_length = 0;
let index_to_key = [];
let insert_sequence = [0];

if (process.argv.length === 2 || process.argv[2] === '0') {
	create_table_string = 'DROP TABLE IF EXISTS airports;'
		+ 'CREATE TABLE airports ('
  		+ 'airport_id int NOT NULL PRIMARY KEY,'
  		+ 'iata_code varchar(10),'
  		//+ 'icao varchar(4) NOT NULL,'
  		+ 'name varchar(100) NOT NULL,'
  		//+ 'name_de varchar(250),'
  		// + 'length_ft smallint,'
  		// + 'wikipedia_link varchar(200),'
  		//+ 'wiki_new_de varchar(255),'
  		// + 'latitude decimal(10,7) NOT NULL,'
  		// + 'longitude decimal(10,7) NOT NULL,'
  		+ 'elevation_ft int,'
  		+ 'type_size varchar(50),'
  		+ 'country_code varchar(5),'
  		+ 'coordinates geometry NOT NULL'
		+ ');';
	url = 'https://www.abflug.info/resources/downloads/airports.csv';
	// insert_into = `INSERT INTO airports (airport_id, iata, icao, name_en, name_de, length_ft, wiki_new_en, wiki_new_de, latitude, longitude, elevation_ft, country_code) VALUES (`;
	insert_into = `INSERT INTO airports (airport_id, iata_code, name, coordinates, elevation_ft, country_code, type_size) VALUES (`;
	progress_length = 5;
	index_to_key = [0,1,3,8,9,10,11,-1];
} else if (process.argv[2] === '1') {
	create_table_string = 'DROP TABLE IF EXISTS airports;'
		+ 'CREATE TABLE airports ('
  		+ 'airport_id int NOT NULL PRIMARY KEY,'
  		//+ 'ident varchar(200),'
  		+ 'type_size varchar(50),'
  		+ 'name varchar(200) NOT NULL,'
  		// + 'latitude decimal NOT NULL,'
  		// + 'longitude decimal NOT NULL,'
  		+ 'elevation_ft int,'
  		//+ 'continent varchar(200),'
  		+ 'country_code varchar(5),'
  		//+ 'iso_region varchar(200),'
  		//+ 'municipality varchar(200),'
  		//+ 'scheduled_service varchar(200),'
  		//+ 'gps_code varchar(200),'
  		+ 'iata_code varchar(10),'
  		//+ 'local_code varchar(200),'
  		//+ 'home_link varchar(200),'
  		// + 'wikipedia_link varchar(200)'
  		//+ 'keywords varchar(500)'
  		+ 'coordinates geometry NOT NULL'
		+ ');';
	url = 'https://ourairports.com/data/airports.csv';
	// insert_into = `INSERT INTO airports (airport_id,ident,type,name,latitude,longitude,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords) VALUES (`;
	insert_into = `INSERT INTO airports (airport_id, iata_code, name, coordinates, elevation_ft, country_code, type_size) VALUES (`;
	index_to_key = [0,13,3,4,5,6,8,2];
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
		let response_data_as_array = CSV.parse(response.data);
		let transformed_data = [];
		for (let i = 1; i < response_data_as_array.length; i++) {
		// for (let i = 1; i < 4; i++) {
			for (let j = 0; j < response_data_as_array[i].length; j++) {
				if (response_data_as_array[i][j] === '' || response_data_as_array[i][j] === undefined) {
					response_data_as_array[i][j] = null;
				} else {
					response_data_as_array[i][j] = response_data_as_array[i][j].replaceAll(`'`, `''`)
				}
			}
			if (response_data_as_array[i][index_to_key[7]] === undefined) {
				response_data_as_array[i][index_to_key[7]] = 'large_airport';
			}
			let temp = new Object();;
			temp.airport_id = response_data_as_array[i][index_to_key[0]];
			temp.iata_code = response_data_as_array[i][index_to_key[1]];
			temp.name = response_data_as_array[i][index_to_key[2]];
			temp.latitude = response_data_as_array[i][index_to_key[3]];
			temp.longitude = response_data_as_array[i][index_to_key[4]];
			temp.elevation_ft = response_data_as_array[i][index_to_key[5]];
			temp.country_code = response_data_as_array[i][index_to_key[6]];
			temp.type_size = response_data_as_array[i][index_to_key[7]];
			transformed_data.push(temp);
		}
		database_operations(transformed_data);
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
	let success = true;
	let insertion_string = '';
	const bar = new ProgressBar('Insertion:  [:bar] :percent', { complete: '=', incomplete: ' ', total: Math.floor(data.length / 500 * progress_length)});
	for (let i = 1; i < data.length; i++) {
		insertion_string += insert_into;
		insertion_string += `${data[i].airport_id},`;
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
		if ((i % 500) === 0 || i === data.length - 1) {
			const client_insertion = new pg.Client(connection_string);
			await client_insertion.connect();
			client_insertion.query(
				insertion_string,
				(err, res) => {
					if (err !== null) {
						console.log(err);
						if (success) {
							success = false;
						}
					}
					client_insertion.end();
				}
			);
			insertion_string = '';
			bar.tick(progress_length);
		}
	}
	if (success) {
		console.log(`Successfully Inserted ${data.length - 2} Data Records`)
	}
}
