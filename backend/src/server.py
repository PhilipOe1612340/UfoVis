from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from psycopg2 import sql
import psycopg2
import json
from model.report import Report
from sqlalchemy import func
from db import Session

app = Flask(__name__)
CORS(app, send_wildcard=True)

@app.route('/someSights')
def someSights():
    session = Session()
    query = session.query(func.st_asgeojson(Report.point)).limit(1000)
    coordinates = [json.loads(coordinate[0])["coordinates"] for coordinate in query]
    return jsonify(coordinates), 200

@app.route('/')
def send_index():
    return send_from_directory('../static/', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../static/', path)
