from geoalchemy2 import Geography
from sqlalchemy import Column, Date, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import func
from typing import NamedTuple
from datetime import date

Base = declarative_base()

class Report(Base):
    __tablename__ = 'report'
    id = Column(Integer, primary_key=True)
    shape = Column(String)
    duration = Column(String)
    description = Column(Text)
    date = Column(Date)
    point = Column(Geography('POINT'))

    @classmethod
    def query(cls, session):


        return session.query(
            cls.id,
            cls.shape,
            cls.duration,
            cls.description,
            cls.date,
            func.st_asgeojson(cls.point).label("geojson")
            )

    @staticmethod
    def row_to_dict(row):
        import json
        row_dict = row._asdict()
        row_dict["id"] = row.id
        row_dict["shape"] = row.shape
        row_dict["duration"] = row.duration
        row_dict["description"] = row.description
        row_dict["date"] = row.date

        geo_dict = json.loads(row_dict["geojson"])
        del row_dict["geojson"]
        geo_dict["properties"] = row_dict
        return geo_dict

    
