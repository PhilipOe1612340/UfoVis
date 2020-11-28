import psycopg2
from psycopg2 import sql

DEBUG = True

class DBConnector:
    
    def __init__(self):
        # test connection
        stmt = sql.SQL(""" SELECT count(*) FROM {table_name}""").format(
           table_name=sql.Identifier('planet_osm_polygon')
        )
        if not self.execute(stmt):
            raise Exception('table is not setup properly')
        else:
            print('table found')

        
    def execute(self, query):
        with psycopg2.connect(host="database", port=5432, dbname="gis_db", user="gis_user", password="gis_pass") as connection:
            print(query.as_string(connection))
            with connection.cursor() as cursor:
                cursor.execute(query)
                if DEBUG:
                    print('execute: ', cursor.query)
                return cursor.fetchall()