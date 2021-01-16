# specify base image that we want to extend
FROM python:3.9-slim

# app target location
ENV APP_DIR=/var/opt/gis
RUN mkdir -p ${APP_DIR}
WORKDIR ${APP_DIR}
COPY ./requirements.txt /requirements.txt

# install build-essentials
RUN apt-get update && apt-get install -y build-essential

# install dependencies
RUN pip3 install --upgrade pip
RUN pip3 install -r /requirements.txt

# environment variables
ENV FLASK_APP=src/server.py
ENV FLASK_DEBUG=1

# run flask server
CMD [ "python", "-m", "flask", "run", "--host=0.0.0.0" ]