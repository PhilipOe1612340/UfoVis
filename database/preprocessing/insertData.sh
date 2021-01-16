#!/bin/bash
PGPASSWORD='gis_pass' psql -U gis_user -d gis_db -h localhost -p 5432 -f /database/preprocessing/data.sql
