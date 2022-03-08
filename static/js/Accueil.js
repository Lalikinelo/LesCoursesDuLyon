var position =''

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
//////////////////////////// Connaitre votre position ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Pop-up à l'entrée du site
map.locate({setView: true, watch: false, maxZoom: 14})
        .on('locationfound', async function (e) {
            
            //console.log(e)
            //var itineraire, isochrone, bulle, commerces_bulle = await fetchAsync("/"+JSON.stringify(e.latlng));
            //console.log(e.latlng)

            console.log(await fetchAsync("/"+JSON.stringify(e.latlng)))
            
            //var isochrone_layer = L.geoJson(isochrone).addTo(map);
            //var marker = L.marker([e.latitude, e.longitude]).bindTooltip('Vous êtes ici : '+String(e.latitude)+" ; "+String(e.longitude));
            //map.addLayer(marker);
        })
       .on('locationerror', function(e){
            console.log(e);
            alert("Location access denied.");
        });

console.log(listerToutesLesProprietes(map))
console.log(map)  

// Bouton sur la carte
L.control.locate({
    position: 'topleft',
    strings: {
        title: "Localisez-vous !"
    }
}).addTo(map);

/////////////////////////////////////////////////////////////////////////////////
///////////////////////////// Connaitre votre adresse ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/*
var geocoder = L.Control.geocoder(
    options = {
        position: 'topleft',
        placeholder: 'Entrez votre adresse'},
).addTo(map);
var div_geocoder = document.getElementsByClassName('leaflet-control-geocoder')[0]
div_geocoder
*/

var geocoderBAN = L.geocoderBAN({ 
    collapsed: false, 
    style: 'searchBar',
    resultsNumber: 5,
    placeholder: 'Entrez votre adresse'
}).addTo(map)

/////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Chargement des données /////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
data = JSON.parse(document.getElementById("getdata").dataset.markers);
data = data[0][0]
//Gestion couche
var group_layer = new L.layerGroup();


/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Economie circulaire /////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Définition du style en fonction du type de commerce
function getColors(properties) {
    if (properties.classe === "Anti Gaspillage") {
      return {
        fillColor: "#da6770",
      };
    } else if (properties.classe === "Commerce Alimentaire") {
      return {
        fillColor: "#8ca96f",
      };
    } else if (properties.classe === "Commerce Non Alimentaire") {
        return {
        fillColor: "#478ac9",
        };
    } else if (properties.classe === "Conseil et Accompagnement social") {
        return {
        fillColor: "#a377c9",
        };
    } else if (properties.classe === "Dechet Bio") {
        return {
        fillColor: "#f2a941",
        };
    } else if (properties.classe === "Donnation non alimentaire") {
        return {
        fillColor: "#e0df72",
        };
    } else if (properties.classe === "Atelier et Seconde Vie") {
        return {
        fillColor: "grey",
        };
    } else {
      return {
        fillColor: "#0099CC"
      };}}


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

// Légende
L.control.Legend({
    position: "bottomright",
    title:' ',
    legends: [{
        label: "Anti Gaspillage",
        type: "circle",
        radius: 6,
        fillColor: '#da6770',
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
///////////////////////////// Appliquer le filtre ///////////////////////////
////////////////////////////////////////////////////////////////////
change_categorie()

function change_categorie() {
    var type_com = document.getElementById("test");
    var type_comm = test.options[test.selectedIndex].text;
    if (type_comm=='Afficher toutes les données'){
        commerces.addTo(group_layer);
        group_layer.addTo(map);
        console.log('toto');
        console.log(type_comm);
    }else 
    //console.log('toto')
    //console.log(type_comm);
    group_layer.clearLayers();
    var commerces_filter = L.geoJson(data, {
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
          return L.circleMarker(latlng, getColors(feature.properties)).bindPopup(popupContent, popupOptions)},

        filter: function (feature, layer) {
            return feature.properties.classe == type_comm;
        },
        
    onEachFeature: mouse_events

    }).addTo(group_layer);
    group_layer.addTo(map);
}




/////////////////////////////////////////////////////////////////////////////////
////////////////////////////// Frontière sur la carte ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////

  map.fitBounds(commerces.getBounds());

  // set maxBounds
  map.setMaxBounds(commerces.getBounds());
  
  // zoom the map to the polyline
  map.fitBounds(commerces.getBounds(), { reset: true });


  
/////////////////////////////////////////////////////////////////////////////////
////////////////////////////// creation de la bulle ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////









