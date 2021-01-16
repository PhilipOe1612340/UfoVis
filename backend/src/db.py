from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os 


host = os.environ.get('DATABASE_HOST', "database") 
port = 5432 if host == "database" else 25432


engine = create_engine(f'postgresql://gis_user:gis_pass@{host}:{port}/gis_db', echo=True)
Session = sessionmaker(bind=engine)