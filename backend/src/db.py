import psycopg2
from psycopg2 import sql
import os 

class DBConnector:
    def __init__(self):
        self.host = os.environ.get('DATABASE_HOST', "database") 
        self.port = 5432 if self.host == "database" else 25432
            
    def execute(self, query):
        with psycopg2.connect(host=self.host, port=self.port, dbname="gis_db", user="gis_user", password="gis_pass") as connection:
            print(query.as_string(connection))
            with connection.cursor() as cursor:
                cursor.execute(query)
                return cursor.fetchall()