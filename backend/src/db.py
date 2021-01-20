from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os 


class DatabaseConnection:

    host = os.environ.get('DATABASE_HOST', "database") 
    port = 5432 if host == "database" else 25432
    engine = create_engine(f'postgresql://gis_user:gis_pass@{host}:{port}/gis_db', echo=True)

    def __init__(self):
        self.__sessionmaker = sessionmaker(bind=self.engine)
        self.__read_session = self.__sessionmaker()

    def get_read_session(self):
        return self.__read_session

    def get_write_session(self):
        return self.__sessionmaker()
