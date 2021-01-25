from geoalchemy2 import Geography
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import func
from typing import NamedTuple

Base = declarative_base()

class Airport(Base):
    __tablename__ = 'airport'
    id = Column(Integer, primary_key=True)
    iata_code = Column(String)
    name = Column(String)
    coordinates = Column(Geography('POINT'))
    elevation_ft = Column(Integer)
    country_code = Column(String)
    type_size = Column(String)


    @classmethod
    def query(cls, session):
        return session.query(
            cls.id,
            cls.iata_code,
            cls.name,
            func.st_asgeojson(cls.coordinates).label("geojson"),
            cls.elevation_ft,
            cls.country_code,
            cls.type_size
        )

    @staticmethod
    def row_to_dict(row):
        import json
        row_dict = row._asdict()
        geo_dict = json.loads(row_dict["geojson"])
        del row_dict["geojson"]
        row_dict["latitude"] = geo_dict["coordinates"][1]
        row_dict["longitude"] = geo_dict["coordinates"][0]
        return row_dict