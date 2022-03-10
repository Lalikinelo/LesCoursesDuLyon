from flask import Flask
from flask import render_template
from flask import request,redirect
import numpy as np
import psycopg2
import json
import requests
import geojson
import shapely.wkt
import pandas as pd
import geopandas as gpd
import folium
from IPython.display import display
from shapely.geometry import Point
import pygeos
from tabulate import tabulate

app = Flask(__name__)


@app.route('/')
def index():

    connection = psycopg2.connect(database="lescoursesdulyon", user="postgres", password="0Courrier0", host="localhost", port=5432)

    cursor = connection.cursor()

    cursor.execute("""select json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON( t.*)::json )) as geojson 
    from (eco_circulaire
    inner JOIN association
        ON eco_circulaire.gid=association.gid
    inner JOIN sous_categ
        ON association.id_sous_categ=sous_categ.id_sous_categ
    inner JOIN categ
        ON sous_categ.id_categ=categ.id_categ ) as t""")
    
    markers=cursor.fetchall()

    #cursor.execute("""select distinct classe from eco_circulaire order by classe asc""")
    #classes=[c for c, in cursor.fetchall()]

    cursor.execute("""select distinct nom_categ from categ order by nom_categ asc""")
    categs=[c for c, in cursor.fetchall()] 

    return render_template("Accueil.html", markers=markers,categs=categs)


#Récupérer données de la page html indiquée apres le /
@app.route('/itineraire/<path:path>')
def send_file(path):
    print(path)
    arg=path.split("&")
    # recuperation de la position de l'utilisateur    
    path_dict=json.loads(arg[0])
    user_position=str(path_dict["lng"])+","+str(path_dict["lat"])
    
    # Recuperation des categories de courses
    cat_course=arg[1].split(',')

    #user_position="4.8357,45.7850"
    #cat_course='Alimentaire'

################### Récupère l'isochrone de 10 min à pied auitour de la position de l'utilisateur  ##############
    url = "http://wxs.ign.fr/choisirgeoportail/isochrone/isochrone.json?location="+user_position+"&method=Time&graphName=Pieton&exclusions=&time=600&holes=false&smoothing=true"
    
    response = requests.get(url)    
    dict = response.json()
    geomWKT=dict['wktGeometry']

    # Convert to a shapely.geometry.polygon.Polygon objects
    g1 = shapely.wkt.loads(geomWKT)

    g2 = geojson.Feature(geometry=g1, properties={})

    # conversion en string
    isochrone = geojson.dumps(g2)

    
    ################## recupere toutes les données #########################
    connection = psycopg2.connect(database="lescoursesdulyon", user="postgres", password="0Courrier0", host="localhost", port=5432)

    cursor = connection.cursor()

    cursor.execute("""select json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON( t.*)::json )) as geojson 
    from (eco_circulaire
    inner JOIN association
        ON eco_circulaire.gid=association.gid
    inner JOIN sous_categ
        ON association.id_sous_categ=sous_categ.id_sous_categ
    inner JOIN categ
        ON sous_categ.id_categ=categ.id_categ ) as t""")

    #récupération du json
    json_c_for_c=[c for c, in cursor.fetchall()]


    gdf_tout_com= gpd.GeoDataFrame.from_features(json_c_for_c[0]["features"])
    gdf_tout_com.crs = "epsg:4326"

    ################## recupere les commerces dans l isochrone filtré par catégorie #########################

    # taille du buffer. Augmente si 0 commerces dans l'isochrone de base
    radius=0

    # Nombre de commerces dans l'isochrone
    nb_com=0
    
    # construction de la requete sql
    def build_request(cat_course,geomWKT,radius):
        request="""SELECT json_build_object('type', 'FeatureCollection','features', json_agg(ST_AsGeoJSON( t.*)::json )) as geojson 
        from (eco_circulaire
        inner JOIN association
            ON eco_circulaire.gid=association.gid
        inner JOIN sous_categ
            ON association.id_sous_categ=sous_categ.id_sous_categ
        inner JOIN categ
            ON sous_categ.id_categ=categ.id_categ ) as t   
        WHERE ST_Intersects(ST_Buffer(ST_ForceRHR(ST_Boundary(ST_GeomFromText('"""+geomWKT+"""',4326))),"""+str(radius)+""", 'side=left'), t.geom)=TRUE 
        AND ST_IsValid(t.geom) AND (
        """
        # Ajouter des categories de commerces delmandées par l'utilisateur
        i=0
        for cat in cat_course:
            # uniquement pour la 1ere categorie
            if i==0:
                request=request+"t.nom_categ='"+cat+"'" 
            else:
                request=request+" OR t.nom_categ='"+cat+"'" 
            i=i+1
    
        request=request+');'
        return request

    score_max = 0
    iteration = 0
    
    # calcul du score minimum
    # le score minimum doit augmenter avec le nb de catégories cochées
    score_minimum=len(cat_course)+9

    # agrandi l'isochrone par un buffer tant qu'il n'y a pas au moins 4 commerces dedans 
    while (nb_com<=4 or score_max<score_minimum) and iteration <11:
    
        #Augmentation du beffer
        cursor.execute(build_request(cat_course,geomWKT,radius))
        radius=radius+0.0049
        #récupération du json
        json_c_for_c=[c for c, in cursor.fetchall()]

        # astuce car len(None) fait planter
        try:
            nb_com=len(json_c_for_c[0]['features'])
        except:
            nb_com=0

        if(nb_com>0):    
            gdf_com_dans_iso = gpd.GeoDataFrame.from_features(json_c_for_c[0]["features"])

            ############### creation des bulles ##################
            gdf_com_dans_iso.crs = "epsg:4326"

            gdf_com_dans_iso_buff=gdf_com_dans_iso
            gdf_com_dans_iso_buff.geometry=gdf_com_dans_iso.to_crs(2154).buffer(300).geometry
            # Numerotation des bulles
            gdf_com_dans_iso_buff.insert(0, 'num_bulle', range(0, len(gdf_com_dans_iso_buff)))


            ############### recupérationn des commerces dans les bulles #############################

            com_in_200m = gpd.overlay(gdf_com_dans_iso_buff,gdf_tout_com.to_crs(2154), how='intersection',keep_geom_type=False)
            
            com_in_200m.rename(columns={ 'nom_categ_2' : 'nom_categ'}, inplace=True)
            

            # suppression des colnnes inutiles
            #for col_name in com_in_200m.columns: 
            #    print(col_name)
                #com_in_200m.drop(columns=[col_name])

        
            ############## Calcul du score de diversité pour chaque bulle  #########################

            id_best_bulle=com_in_200m.groupby('num_bulle').nom_sous_categ_2.nunique().idxmax()
            
            score_max = com_in_200m.groupby('num_bulle').nom_sous_categ_2.nunique().max()

            iteration = iteration +1
            print("id des bulles trouvées et score:")
            print(com_in_200m.groupby('num_bulle').nom_sous_categ_2.nunique())
            print(" score max de la bulle : "+str(score_max))
            print(" iteration : "+str(iteration))


    if iteration >= 10:
        response ={'message': 'pas de bulle'}
        return response

    #                                                                                   #
    # que faire en cas d'égalité de score?                                              #
    #                                                                                   #





    ############## extraction de la meilleure des bulles ##################################

    best_bulle=com_in_200m.to_crs(4326).loc[com_in_200m.num_bulle == id_best_bulle]

    commerces_bulle=best_bulle.to_json()

    ############## polygone de la meilleure des bulles ##################################

    best_bulle_buff = gdf_com_dans_iso_buff.to_crs(4326).loc[gdf_com_dans_iso_buff.num_bulle == id_best_bulle]

    bulle=best_bulle_buff.to_json() 

    centre_bulle=best_bulle_buff.to_crs(4326).centroid


    #########  itineraire vers le meilleur commerce ##############
    url = """https://wxs.ign.fr/calcul/geoportail/itineraire/rest/1.0.0/route?resource=bdtopo-pgr&profile=pedestrian&optimization=fastest&start="""+user_position+"&end="+str(centre_bulle.x.values[0])+","+str(centre_bulle.y.values[0])+"""&intermediates=&constraints={"constraintType": "banned","key":"wayType","operator":"=","value":"tunnel"}&geometryFormat=geojson&getSteps=true&getBbox=true&waysAttributes=cleabs&timeUnit=minute"""

    response = requests.get(url)    

    # conversion bytes vers dict     
    dict = response.json()
    # conversion en string
    itineraire = json.dumps(dict)

    response={'itineraire':itineraire, 'isochrone': isochrone, 'bulle': bulle, 'commerces_bulle':commerces_bulle, 'message': 'fund'} 
     
    return response




@app.route('/Qui-sommes-nous')
def qui_sommes_nous():
    return render_template("Qui-sommes-nous.html")


@app.route('/A-propos')
def a_propos():
    return render_template("A-propos.html")

@app.route('/Tutoriel')
def tuto():
    return render_template("Tutoriel.html")

@app.route('/Login')
def login():
    return render_template("Login.html")

if __name__ == '__main__':
    app.run(debug=True)