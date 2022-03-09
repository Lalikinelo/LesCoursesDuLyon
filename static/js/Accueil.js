var user_position ='';
var tout_com_limit=0;
var premier_lancement=true;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// fonction pour debuguer: liste tous les arguments d'un objet javascript /////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function listerToutesLesProprietes(o){
    let objectToInspect;
    let resultat = [];
  
    for(objectToInspect = o;
        objectToInspect !== null;
        objectToInspect = Object.getPrototypeOf(objectToInspect)){
      resultat = resultat.concat(Object.getOwnPropertyNames(objectToInspect));
    }
    return resultat;
  }


/////////////////////////////////////////////////////////////////////////////////
////////////////////// envoi des donné au server app.py /////////////////////////
/////////////////////////////////////////////////////////////////////////////////

async function fetchAsync (url) {
    let response = await fetch(url);
    let data = await response.json();
    return data;
  }


/////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Carte Leaflet /////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

var map = L.map('map');
var osmUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png';
var osmAttrib = 'Map data © OpenStreetMap contributors';
var osm = new L.TileLayer(osmUrl, {attribution: osmAttrib}).addTo(map);
map.setView([45.7640, 4.8357], 12);

// FullScreen
map.addControl(new L.Control.Fullscreen());


//Gestion couche
var group_layer = new L.layerGroup();

/////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// Echelle ////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

var scale = L.control.scale(
    options = {
        position: 'bottomleft',
        maxWidth: 100,
        metric: true,
        imperial: false,
        updateWhenIdle: false},
).addTo(map);

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// style commerces /////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Définition du style en fonction du type de commerce
function getColors(properties) {
    if (properties.nom_categ === "Alimentaire") {
      return {
        fillColor: "#da6770",
      };
    } else if (properties.nom_categ === "Restauration") {
      return {
        fillColor: "#8ca96f",
      };
    } else if (properties.nom_categ === "Activite") {
        return {
        fillColor: "#478ac9",
        };
    } else if (properties.nom_categ === "Dechet") {
        return {
        fillColor: "#a377c9",
        };
    } else if (properties.nom_categ === "Equipement Maison") {
        return {
        fillColor: "#f2a941",
        };
    } else if (properties.nom_categ === "Bien etre") {
        return {
        fillColor: "#e0df72",
        };
    } else if (properties.nom_categ === "Don") {
        return {
        fillColor: "grey",
        };
    } else if (properties.nom_categ === "Reparation") {
        return {
        fillColor: "black",
        };
    } else {
      return {
        fillColor: "#0099CC"
      };}}


/////////////////////////////////////////////////////////////////////////////////
/////////////////////// Afficher les commerces sur la carte//////////////////////
/////////////////////////////////////////////////////////////////////////////////

function affiche_commerces(data){
    // Ajout du geoJSON
    var commerces = L.geoJson(data, {
        style : function(feature) {
            return {
                radius: 6,
                color: 'white',
                weight: 1,
                fillOpacity: 1
            }},
        pointToLayer: function (feature, latlng) {
            var popupOptions = { maxWith: 200 };
            var popupContent = "Nom: " + feature.properties.name ;
        return L.circleMarker(latlng, getColors(feature.properties)).bindPopup(popupContent, popupOptions);
        },
        onEachFeature: mouse_events}).addTo(map);

    // Ajout d'évènements : zoom + buffer + couleur
    function mouse_events(feature, leaflet_object){
        leaflet_object.on('click', function(event){
            map.setView(event.latlng, 16);
        });
        leaflet_object.on('mouseover', function(event){
            var leaflet_object = event.target;
            leaflet_object.setRadius(12),
            leaflet_object.setStyle({
                color: "white",
                weight: 5})
        });
        leaflet_object.on('mouseout', function(event){
            var leaflet_object = event.target;
            commerces.resetStyle(leaflet_object),
            leaflet_object.setRadius(6)});}


    map.fitBounds(commerces.getBounds());

    // set maxBounds
    map.setMaxBounds(commerces.getBounds());
    if (premier_lancement==true){
        premier_lancement==false;
        tout_com_limit = commerces.getBounds()
    }
    // zoom the map to the polyline
    map.fitBounds(commerces.getBounds(), { reset: true })    

}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////// filtrer les commerces sur la carte//////////////////////
/////////////////////////////////////////////////////////////////////////////////


function change_categorie() {
    var type_com = document.getElementById("test");
    var type_comm = test.options[test.selectedIndex].text;
    
    group_layer.clearLayers();

    if (type_comm=='Afficher toutes les données'){
        affiche_commerces(data)
    }
    else{ 
        //Wtransforme en string pour pouvoir le parcourir
        var my_json = JSON.stringify(data)
        
        // applique le filtre
        var data_filter = JSON.parse(my_json).features.filter(function (entry) {
            return entry.properties.nom_categ === type_comm;
        });       
        
        affiche_commerces(data_filter)
    }
}


/////////////////////////////////////////////////////////////////////////////////
/////////////////////// Afficher la bulle sur la carte //////////////////////////
/////////////////////////////////////////////////////////////////////////////////
        


function affiche_bulle (data_bulle){
    // Ajout du geoJSON
    var bulle = L.geoJson(data_bulle).addTo(map)
    }

/////////////////////////////////////////////////////////////////////////////////
/////////////////////// Afficher l itineraire sur la carte //////////////////////
/////////////////////////////////////////////////////////////////////////////////
        


function affiche_itineraire(data_iti){
    // Ajout du geoJSON
    var itineraire = L.geoJson(data_iti).addTo(map)

    }


/////////////////////////////////////////////////////////////////////////////////
/////////////////////// Afficher l isochronesur la carte //////////////////////////
/////////////////////////////////////////////////////////////////////////////////
        


function affiche_isochrone(data_iso){
    // Ajout du geoJSON
    var bulle = L.geoJson(data_iso).addTo(map)
    map.fitBounds(bulle.getBounds());

    }




/////////////////////////////////////////////////////////////////////////////////
///////////////////////////// Connaitre votre adresse ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////

var geocoderBAN = L.geocoderBAN({ 
    collapsed: false, 
    style: 'searchBar',
    resultsNumber: 5,
    placeholder: 'Entrez votre adresse'
}).addTo(map)


// Bouton sur la carte
L.control.locate({
    position: 'topleft',
    strings: {
        title: "Localisez-vous !"
    }
}).addTo(map);



/////////////////////////////////////////////////////////////////////////////////
///////////////////////////// Légende ///////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

L.control.Legend({
    position: "bottomright",
    title:' ',
    legends: [{
        label: "Alimentaire",
        type: "circle",
        radius: 6,
        fillColor: "#da6770",
},{
        label: "Atelier et Seconde Vie",
        type: "circle",
        radius: 6,
        fillColor: 'grey',
},{
        label: "Commerce Alimentaire",
        type: "circle",
        radius: 6,
        fillColor: '#8ca96f',
},{
        label: "Commerce Non Alimentaire",
        type: "circle",
        radius: 6,
        fillColor: '#478ac9',
},{
        label: "Conseil et Accompagnement social",
        type: "circle",
        radius: 6,
        fillColor: '#a377c9',
},{
        label: "Déchet Bio",
        type: "circle",
        radius: 6,
        fillColor: '#f2a941',
},{
        label: "Donnation non alimentaire",
        type: "circle",
        radius: 6,
        fillColor: '#e0df72',
}]
}).addTo(map);



/////////////////////////////////////////////////////////////////////////////////
///////////// chopix du type de courses ////////////////
/////////////////////////////////////////////////////////////////////////////////

var checkboxes = document.querySelectorAll("#choix_commerce");
var liste_course = []

// Use Array.forEach to add an event listener to each checkbox.
checkboxes.forEach(function(checkbox) {
  checkbox.addEventListener('change', (event) => {
    liste_course = 
      Array.from(checkboxes) // Convert checkboxes to an array to use filter and map.
      .filter(i => i.checked) // Use Array.filter to remove unchecked checkboxes.
      .map(i => i.value) // Use Array.map to extract only the checkbox values from the array of objects.
      console.log(liste_course.toString())
  })});

/////////////////////////////////////////////////////////////////////////////////
///////////// Chargement des tous les commerces au 1er chargement////////////////
/////////////////////////////////////////////////////////////////////////////////
data = JSON.parse(document.getElementById("getdata").dataset.markers);
data = data[0][0]

affiche_commerces(data)


/////////////////////////////////////////////////////////////////////////////////
////////////////////////////// creation de la bulle ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////

document.getElementById('find_bulle').addEventListener("click", function() {
    
    // recupere la posiotn de l'utilisateur
    map.locate({setView: true, watch: false, maxZoom: 14})
        .on('locationfound', position= async function (e) {
            
            
            e.latlng.lat=45.7850;
            e.latlng.lng=4.8557;
            //4.8357
            if(liste_course.length>0){
                if (tout_com_limit.contains(e.latlng)==true){

                    // calcul de la bulle
                    data_fetch = await fetchAsync("/itineraire/"+JSON.stringify(e.latlng)+"&"+liste_course.toString())

                    if (data_fetch == 'pas de bulle'){
                        alert("Notre service ne trouve pas de bulle pour votre recherche...");

                    }
                    else{
                        // supprime les couches existantes
                        group_layer.clearLayers();

                        affiche_commerces(JSON.parse(data_fetch['commerces_bulle']));
                        console.log(data_fetch['commerces_bulle'])
                        affiche_isochrone(JSON.parse(data_fetch['isochrone']));
                        affiche_bulle(JSON.parse(data_fetch['bulle']));
                        affiche_itineraire(JSON.parse(data_fetch['itineraire']).geometry);
                        }
                    }

                else{
                    alert("vous êtes trop loin des commerces...");
                    affiche_commerces(data);
                    }
                }
            else{
                alert("vous devez choisir un type de courses avant de calculer un itinéraire ...");
                }
            })
            .on('locationerror', function(e){
                alert("Où êtes vous?? Veuillez accorder l'accès à votre position actuelle dans votre navigateur.");
            });

}, false);


