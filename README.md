# UfoVis
Project for GeoVis WS 2020


## Setup

### Download data:
```bash
cd database/preprocessing/scraper
git lfs pull
npm install
```

## Docker Compose (Server and Database)

```
docker-compose up -d && docker-compose logs -f
```

## Docker Compose (Database only)
```
docker-compose -f docker-compose-database-only.yml up -d && docker-compose logs -f
```

## Fill data in database
```
docker exec -it ufovis_database_1 /database/preprocessing/insertData.sh
```

## Fill airport data in database
```bash
cd database/airports
npm install
```
1. Small Dataset (default):
```
node airports_to_database.js 0
```
2. Large Dataset:
```
node airports_to_database.js 1
```

## Run server locally

If not done yet install virtual environment on your system
```
pip3 install virtualenv
```
### Create virtual Enviroment
```
cd backend
python3 -m venv virtual-env
```

### Activate virtual Enviroment
Unix:
```
source ./virtual-env/bin/activate
```
Windows:
```
myenv\Scripts\activate.bat
```
### Install Dependencies from requirement.txt
```
pip3 install -r requirements.txt
```



