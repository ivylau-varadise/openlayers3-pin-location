//reference from https://api.portal.hkmapservice.gov.hk/js-samples-demo
// resize map
const mapdiv = document.getElementById("map");
var margin;
if (document.all) {
  margin =
    parseInt(document.body.currentStyle.marginTop, 10) +
    parseInt(document.body.currentStyle.marginBottom, 10);
} else {
  margin =
    parseInt(
      document.defaultView
        .getComputedStyle(document.body, "")
        .getPropertyValue("margin-top")
    ) +
    parseInt(
      document.defaultView
        .getComputedStyle(document.body, "")
        .getPropertyValue("margin-bottom")
    );
}
//mapdiv.style.height = window.innerHeight - margin + "px";
mapdiv.style.height = "500px";
mapdiv.style.width = "500px";

// location param
const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
let mapImage = "";
let lon = Number(params.longitude) || 114.2082061;
let lat = Number(params.latitude) || 22.4272311;
let isView = Boolean(params.isView) || false;
let isDownload = Boolean(params.isDownload) || false;

let locationCorr = [lon, lat];

///// openlayer 3
var apikey = "584b2fa686f14ba283874318b3b8d6b0"; //api.hkmapservice.gov.hk starter key
function initMap() {
  return new ol.Map({
    target: "map",
    controls: ol.control.defaults({
      attributionOptions: {
        collapsible: false,
      },
    }),
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          attributions: new ol.Attribution({
            html: "<a href='https://api.portal.hkmapservice.gov.hk/disclaimer' target='_blank'>&copy; Map from Lands Department</a><div style='width:25px;height:25px;display:inline-flex;background:url(https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg);background-size:25px;margin-left:4px'></div>",
          }),
          crossOrigin: "anonymous",
          url:
            "https://api.hkmapservice.gov.hk/osm/xyz/basemap/WGS84/tile/{z}/{x}/{y}.png?key=" +
            apikey,
          // url: "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png",
        }),
      }),
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          crossOrigin: "anonymous",
          url:
            "https://api.hkmapservice.gov.hk/osm/xyz/label-tc/WGS84/tile/{z}/{x}/{y}.png?key=" +
            apikey,
          // url: "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png",
        }),
      }),
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat(locationCorr),
      zoom: 18,
      minZoom: 10,
      maxZoom: 20,
    }),
  });
}

var map = initMap();

map.on("click", function (event) {
  var point = map.getCoordinateFromPixel(event.pixel);
  var lonLat = ol.proj.toLonLat(point);
  console.log("clicked on ([lon, lat]): ", lonLat); // note the ordering of the numbers
  console.log("zoom: ", map.getView().getZoom()); // note the ordering of the numbers
  console.log("center: "); // note the ordering of the numbers
});

function addPin() {
  // add location pin
  var features = [];

  var iconPath = "./placeholder.png";
  //create Feature... with coordinates
  var iconFeature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat(locationCorr)),
  });

  //create style for your feature...
  var iconStyle = new ol.style.Style({
    text: new ol.style.Text({
      text: "\uf3c5",
      font: "normal 38px FontAwesome",
      fill: new ol.style.Fill({
        color: "#ff0000",
      }),
    }),
  });

  iconFeature.setStyle(iconStyle);
  features.push(iconFeature);

  /*
   * create vector source
   * you could set the style for all features in your vectoreSource as well
   */
  var vectorSource = new ol.source.Vector({
    features: features, //add an array of features
    //,style: iconStyle     //to set the style for all your features...
  });

  var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    name: "Pin",
  });

  map.addLayer(vectorLayer);
}

function removePin() {
  console.log("removePin", map.getLayers().getArray());
  map
    .getLayers()
    .getArray()
    .filter((layer) => layer.get("name") === "Pin")
    .forEach((layer) => map.removeLayer(layer));
}

function setMapView() {
  map.getView().setCenter(ol.proj.fromLonLat(locationCorr));
}

function loadMap() {
  console.log("loadMap");
  locationCorr = [
    Number(document.getElementById("lon").value),
    Number(document.getElementById("lat").value),
  ];
  setMapView();
  removePin();
  addPin();
  checkMapLoaded();
}

//check map is loaded
//"Dirty" tiles can be in one of two states: Either they are being downloaded,
//or the map is holding off downloading their replacement, and they are "wanted."
//We can tell when the map is ready when there are no tiles in either of these
//states, and rendering is done.

function checkMapLoaded() {
  var numInFlightTiles = 0;
  map.getLayers().forEach(function (layer) {
    console.log("getLayers");
    var source = layer.getSource();
    if (source instanceof ol.source.TileImage) {
      source.on("tileloadstart", function () {
        ++numInFlightTiles;
      });
      source.on("tileloadend", function () {
        --numInFlightTiles;
      });
    }
  });

  map.on("postrender", function (evt) {
    if (!evt.frameState) return;

    var numHeldTiles = 0;
    var wanted = evt.frameState.wantedTiles;
    for (var layer in wanted)
      if (wanted.hasOwnProperty(layer))
        numHeldTiles += Object.keys(wanted[layer]).length;

    var ready = numInFlightTiles === 0 && numHeldTiles === 0;
    if (map.get("ready") !== ready) map.set("ready", ready);
  });
}

function whenMapIsReady(callback) {
  console.log("whenMapIsReady");
  if (map.get("ready")) callback();
  else map.once("change:ready", whenMapIsReady.bind(null, callback));
}

//auto download
function DownloadMapAsImage() {
  //console.log("DownloadMapAsImage", mapCanvas);
  let downloadLink = document.createElement("a");
  downloadLink.setAttribute("download", "map.png");
  let dataURL = getMapImage();
  map.renderSync();
  downloadLink.setAttribute("href", dataURL);
  downloadLink.click();
}

function getMapImage() {
  return document.getElementsByTagName("canvas")[0].toDataURL("image/png");
}

function setMapImage() {
  console.log("setMapImage", Date.now());
  mapImage = getMapImage();
  console.log("mapImage", mapImage);
  map.renderSync();
}

//control location pin
function setLonLat(lonVal, latVal) {
  lonEle = document.getElementById("lon");
  latEle = document.getElementById("lat");
  lonEle.value = lonVal;
  latEle.value = latVal;
  generateMapImage();
  return "";
}

function generateMapImage() {
  console.log("generateMapImage", Date.now());
  mapImage = "";
  map.set("ready", false);
  loadMap();
  whenMapIsReady(setMapImage);
}

setLonLat(lon, lat);
