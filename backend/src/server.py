from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from psycopg2 import sql
import psycopg2
import json
from orm.report import Report
from sqlalchemy import func
from db import Session

app = Flask(__name__)
CORS(app, send_wildcard=True)

@app.route('/reports')
def reports():
    session = Session()
    query = Report.query(session).limit(1000)
    reports = tuple(Report.row_to_dict(report) for report in query)
    return jsonify(reports), 200

@app.route('/')
def send_index():
    return send_from_directory('../static/', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../static/', path)
