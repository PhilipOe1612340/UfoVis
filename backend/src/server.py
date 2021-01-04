from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from psycopg2 import sql
import psycopg2
import json

from db import DBConnector

db = DBConnector()
app = Flask(__name__)
CORS(app, send_wildcard=True)

@app.route('/someSights')
def someSights():
    query = sql.SQL("SELECT st_asgeojson(point) FROM report LIMIT 1000")
    results = db.execute(query)
    cos = [json.loads(row[0])["coordinates"] for row in results]
    return jsonify(cos), 200

@app.route('/')
def send_index():
    return send_from_directory('../static/', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../static/', path)
