from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from psycopg2 import sql
import psycopg2
import json
from orm.report import Report
from sqlalchemy import func
from db import DatabaseConnection
from orm.queries import handleFilters

app = Flask(__name__)
CORS(app, send_wildcard=True)

db_connection = DatabaseConnection()


@app.route('/reports')
def reports():
    query = Report.query(db_connection.get_read_session())
    query = handleFilters(query, request.args)
    limit = request.args.get("limit", 1000)
    query = query.limit(limit)
    reports = tuple(Report.row_to_dict(report) for report in query)
    return jsonify(reports), 200

@app.route('/shapes')
def shapes():
    query = db_connection.get_read_session().query(Report.shape).distinct()
    query = handleFilters(query, request.args)
    shapes = [next(iter(shape)) for shape in query]
    return jsonify(shapes)

@app.route('/')
def send_index():
    return send_from_directory('../static/', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../static/', path)
    