from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Query
from werkzeug.datastructures import ImmutableDict
from orm.report import Report


def handleFilters(query: Query, request_params: ImmutableDict)-> Query:
    fromYear = request_params.get("fromYear", None)
    toYear = request_params.get("toYear", None)
    shape = request_params.get("shape", None)
    if fromYear:
        query = query.filter(Report.date >= year_to_date(fromYear))
    if toYear:
        query = query.filter(Report.date <= year_to_date(toYear))
    if shape:
        query = query.filter(func.upper(Report.shape) == shape.upper())
    return query


def year_to_date(year: str)-> datetime:
    return datetime.strptime(str(year), '%Y')
