from flask import Flask
from flask import render_template
from flask import request,redirect
import pandas as pd
import geopandas
import numpy as np
import psycopg2
import json
import requests
import geojson
import shapely.wkt

app = Flask(__name__)


@app.route('/')
def index():

    connection = psycopg2.connect(database="lescoursesdulyon", user="postgres", password="0Courrier0", host="localhost", port=5432)

    cursor = connection.cursor()

    cursor.execute("""select json_build_object(
                'type', 'FeatureCollection',
                'features', json_agg(ST_AsGeoJSON(eco_circulaire.*)::json)
            ) as geojson
            from eco_circulaire""")
    
    markers=cursor.fetchall()

    cursor.execute("""select distinct classe from eco_ecologie order by classe asc""")
    classes=[c for c, in cursor.fetchall()]

    return render_template("Accueil.html", markers=markers,classes=classes)


#Récupérer données de la page html indiquée apres le /
@app.route('/<path:path>')
def send_file(path):
    path_dict=json.loads(path)
    url = "http://wxs.ign.fr/choisirgeoportail/isochrone/isochrone.json?location="+str(path_dict["lng"])+","+str(path_dict["lat"])+"&method=Time&graphName=Pieton&exclusions=&time=600&holes=false&smoothing=true"
    
    
    response = requests.get(url)    
     
    dict = response.json()


    
    geomWKT=dict['wktGeometry']


    # Convert to a shapely.geometry.polygon.Polygon object
    g1 = shapely.wkt.loads(geomWKT)

    g2 = geojson.Feature(geometry=g1, properties={})

    # conversion en string
    result = geojson.dumps(g2)

    return result


@app.route('/Qui-sommes-nous')
def qui_sommes_nous():
    return render_template("Qui-sommes-nous.html")


@app.route('/A-propos')
def a_propos():
    return render_template("/A-propos.html")

@app.route('/Tutoriel')
def turo():
    return render_template("/Tutoriel.html")

@app.route('/Login')
def login():
    return render_template("/Login.html")

if __name__ == '__main__':
    app.run(debug=True)