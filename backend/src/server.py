from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from psycopg2 import sql
import psycopg2
import json

from db import DBConnector

db = DBConnector()
app = Flask(__name__)
CORS(app, send_wildcard=True)

@app.route('/pubs', methods=["GET", "POST"])
def pubs():
    query = sql.SQL("""WITH konstanz AS 
    (SELECT way
    FROM planet_osm_polygon
    WHERE admin_level='8' and name = 'Konstanz')
    SELECT points.name, ST_AsGeoJSON(points.way)
    from planet_osm_point as points join konstanz on st_contains(konstanz.way, points.way)
    where points.amenity in ('bar', 'pub')
    """)
    
    results = db.execute(query)
    jsonResults = [addToJSON(json.loads(r[1]), {"properties": {"name": r[0]}}) for r in results]
    return jsonify(jsonResults), 200


@app.route('/ofType', methods=['GET', 'POST'])
def ofType2():
    body = request.json
    print(body)
    amenityType = body['type']
    
    query = sql.SQL("""WITH konstanz AS 
        (SELECT way
        FROM planet_osm_polygon
        WHERE admin_level='8' and name = 'Konstanz')
        SELECT points.name, ST_AsGeoJSON(points.way)
        from planet_osm_point as points join konstanz on st_contains(konstanz.way, points.way)
        where points.amenity = {}""").format(sql.Literal(amenityType))
    results = db.execute(query)
    jsonResults = [addToJSON(json.loads(r[1]), {"properties": {"name": r[0]}}) for r in results]
 
    query2 = sql.SQL("""WITH konstanz AS 
        (SELECT way
        FROM planet_osm_polygon
        WHERE admin_level='8' and name = 'Konstanz')
        SELECT points.name, ST_AsGeoJSON(points.way)
        from planet_osm_polygon as points join konstanz on st_contains(konstanz.way, points.way)
        where points.amenity = {}""").format(sql.Literal(amenityType))

    results = db.execute(query2)
    return jsonify(jsonResults + [addToJSON(json.loads(r[1]), {"properties": {"name": r[0]}}) for r in results]), 200


@app.route('/typesAvaliable', methods=['GET'])
def allTypes():
    results = db.execute(sql.SQL("""Select point.amenity from planet_osm_point as point
        inner JOIN planet_osm_polygon as region 
        ON ST_Contains(region.way, point.way) 
        WHERE region.admin_level='8' and region.name = 'Konstanz' and point.amenity is not Null and point.name is not Null
        group by point.amenity"""))
    jsonResults = [r[0] for r in results]

    results = db.execute(sql.SQL("""Select point.amenity from planet_osm_polygon as point
        inner JOIN planet_osm_polygon as region 
        ON ST_Contains(region.way, point.way) 
        WHERE region.admin_level='8' and region.name = 'Konstanz' and point.amenity is not Null and point.name is not Null
        group by point.amenity"""))

    return jsonify(jsonResults + [r[0] for r in results]), 200

def addToJSON(jsonObj, propertyList):
    for prop in propertyList.keys():
        jsonObj[prop] = propertyList[prop]
    return jsonObj

@app.route('/')
def send_index():
    return send_from_directory('../static/', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../static/', path)
