from geoalchemy2 import Geography
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import func

Base = declarative_base()

class Airport(Base):
    __tablename__ = 'airport'
    airport_id = Column(Integer, primary_key=True)
    iata_code = Column(String)
    name = Column(String)
    coordinates = Column(Geography('POINT'))
    elevation_ft = Column(Integer)
    country_code = Column(String)
    type_size = Column(String)


    @classmethod
    def query(cls, session):
        return session.query(
            cls.airport_id,
            cls.iata_code,
            cls.name,
            func.st_asgeojson(cls.coordinates).label("geojson")
            cls.elevation_ft,
            cls.country_code,
            cls.type_size,
        )