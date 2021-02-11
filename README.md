# UfoVis
Project for GeoVis WS 2020


## Setup

### Download data:
```bash
cd database/preprocessing/scraper
git lfs pull
npm install
```

## Frontend
Install dependencies
```bash
npm install
```

**Development server with auto refresh:**
```bash
npm start
```
Accessible at: `http://localhost:4200/`


**Build production version:**
```bash
npm run build
```
Accessible only with a running backend at: `http://localhost:5000/`


## Docker Compose (Server and Database)
Build frontend first for production use.

```
docker-compose up -d && docker-compose logs -f
```

## Docker Compose (Database only)
```
docker-compose -f docker-compose-database-only.yml up -d && docker-compose logs -f
```

## Fill airport data in database
```bash
cd database/airports
npm install
```
1. Small Dataset (default):
```
npm run smallDataset
```
2. Large Dataset:
```
npm run largeDataset
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



