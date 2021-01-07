from geoalchemy2 import Geography
from sqlalchemy import Column, Date, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Report(Base):
    __tablename__ = 'report'
    id = Column(Integer, primary_key=True)
    shape = Column(String)
    duration = Column(Integer)
    description = Column(Text)
    date = Column(Date)
    point = Column(Geography('POINT'))

