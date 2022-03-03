import pandas as pd
import geopandas as gpd
import numpy as np
import psycopg2
import json
import requests
import geojson
import shapely.wkt
import folium
from IPython.display import display

position="4.8357,45.7640"
"""
url = "http://wxs.ign.fr/choisirgeoportail/isochrone/isochrone.json?location="+position+"&method=Time&graphName=Pieton&exclusions=&time=600&holes=false&smoothing=true&srs=EPSG:4326"
    
response = requests.get(url)    
    
dict = response.json()

geomWKT=dict['wktGeometry']

print(geomWKT)
"""


geomWKT="POLYGON ((4.833549 45.758825, 4.832277 45.75927, 4.831006 45.76016, 4.83037 45.76105, 4.83037 45.761495, 4.831006 45.76194, 4.831006 45.76283, 4.829734 45.76194, 4.829099 45.76194, 4.829099 45.76461, 4.829734 45.76461, 4.83037 45.76372, 4.83037 45.765501, 4.829734 45.766391, 4.829734 45.766836, 4.829734 45.767281, 4.83037 45.767281, 4.832277 45.768616, 4.835456 45.769506, 4.836092 45.769506, 4.836728 45.769506, 4.837363 45.769061, 4.837999 45.769061, 4.838635 45.769061, 4.838635 45.768616, 4.838635 45.768171, 4.838635 45.767726, 4.838635 45.767281, 4.838635 45.766836, 4.838635 45.766391, 4.841178 45.766391, 4.841178 45.766836, 4.841814 45.766836, 4.842449 45.765946, 4.842449 45.765501, 4.843721 45.76372, 4.843721 45.763275, 4.843721 45.76283, 4.842449 45.76194, 4.841814 45.76194, 4.841178 45.76194, 4.841178 45.762385, 4.841178 45.76283, 4.838635 45.76283, 4.839271 45.76016, 4.839271 45.759715, 4.837999 45.758825, 4.837363 45.758825, 4.837363 45.75927, 4.837363 45.759715, 4.836092 45.759715, 4.836092 45.75927, 4.836092 45.758825, 4.836092 45.75838, 4.834185 45.75838, 4.833549 45.758825))"
connection = psycopg2.connect(database="lescoursesdulyon", user="postgres", password="0Courrier0", host="localhost", port=5432)

cursor = connection.cursor()

cursor.execute("SELECT ST_IsValid( ST_GeomFromText('"+geomWKT+"'))")


#cursor.execute("SELECT geom from eco_circulaire ")

#print(cursor.fetchall())

cursor.execute("select json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON( eco_circulaire.*)::json )) as geojson from eco_circulaire where ST_Intersects (ST_GeomFromText('"+geomWKT+"',4326), eco_circulaire.geom)=TRUE")

json_c_for_c=[c for c, in cursor.fetchall()]

gdf = gpd.GeoDataFrame.from_features(json_c_for_c[0]["features"])


x=str(gdf[gdf.scoretotal == gdf.scoretotal.max()].geometry.x.values[0])
y=str(gdf[gdf.scoretotal == gdf.scoretotal.max()].geometry.y.values[0])


#########  itineraire vers le meilleur commerce ##############
url = """https://wxs.ign.fr/calcul/geoportail/itineraire/rest/1.0.0/route?resource=bdtopo-pgr&profile=car&optimization=fastest&start="""+position+"&end="+x+","+y+"""&intermediates=&constraints={"constraintType": "banned","key":"wayType","operator":"=","value":"tunnel"}&geometryFormat=geojson&getSteps=true&getBbox=true&waysAttributes=cleabs"""

response = requests.get(url)  
# conversion bytes vers dict     
dict = response.json()
# conversion en string
result = json.dumps(dict)


f = open("essai_itineraire_geoservice/response_itineraire.geojson", "w")
f.write(result)
f.close()

"""
m = folium.Map(location=[4.8357,45.7640],tiles="cartodbpositron",zoom_start=2)

folium.GeoJson(result, name="geojson").add_to(m)

m.save("map.html")
"""