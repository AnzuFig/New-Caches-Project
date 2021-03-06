/*     New Caches

Aluno 1: 60313 Francisco Freitas
Aluno 2: 60288 Guilherme Figueira

Comment:

For the 6th requirement, we decided it was best to "iterate" through every existing cache and 
use a polar coordinate system to calculate and test (check it's validity) every possible cache
insertion around each. The angle interval we decided to use for each test was 0.5 degrees.


0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference.html
*/


/* GLOBAL CONSTANTS */

const MAP_INITIAL_CENTRE =
	[38.661,-9.2044];  // FCT coordinates
const MAP_INITIAL_ZOOM =
	14
const MAP_ID =
	"mapid";
const MAP_ATTRIBUTION =
	'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
	+ 'contributors, Imagery Â© <a href="https://www.mapbox.com/">Mapbox</a>';
const MAP_URL =
	'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token='
	+ 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
const MAP_ERROR =
	"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";
const MAP_LAYERS =
	["streets-v11", "outdoors-v11", "light-v10", "dark-v10", "satellite-v9",
		"satellite-streets-v11", "navigation-day-v1", "navigation-night-v1"]
//const RESOURCES_DIR =
//	"http//ctp.di.fct.unl.pt/lei/lap/projs/proj2122-3/resources/";
const RESOURCES_DIR =
 	"resources/";
const CACHE_KINDS = ["CITO", "Earthcache", "Event",
	"Letterbox", "Mega", "Multi", "Mystery", "Other",
	"Traditional", "Virtual", "Webcam", "Wherigo"];
const CACHE_RADIUS =
	161;	// meters
const ANGLE =
	0.5;
const CACHES_FILE_NAME =
	"caches.xml";
const STATUS_ENABLED =
	"E";
const STATUS_DISABLED =
	"A";
const VALID_RADIUS =
	0.00181154054053411321;
const IMPORTED =
	"imported";
const MANUAL =
	"manual";
const AUTOMATIC =
	"automatic";

/* GLOBAL VARIABLES */

let map = null;
let INVALID_COORDS = "Invalid Coordinates.";
let CANT_MOVE_CACHE = "Cannot move this cache.";
let CANT_DELETE_CACHE = "Cannot delete this cache."; 

/* USEFUL FUNCTIONS */

// Capitalize the first letter of a string.
function capitalize(str)
{
	return str.length > 0
			? str[0].toUpperCase() + str.slice(1)
			: str;
}

// Opens the url on a new tab
function openURL(url)
{
    window.open(url, "_blank");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cacheCoordsAreValid(lat, lon){
	let foundCloseImported = false;
	if(lat == "" || lon == "")
		return false;
	for(let i = 0 ; i < map.caches.length ; i++){
		if(map.caches[i].status == STATUS_ENABLED){
			let distance = haversine(map.caches[i].latitude, map.caches[i].longitude, lat, lon);
			if(distance <= 0.161){
				return false;
			}
			if(map.caches[i].insertType == IMPORTED && kindIsPhysical(map.caches[i].kind) 
			&& distance < 0.4){
				foundCloseImported = true;
			}
		}
	}
	return foundCloseImported;
}

function manageCoordsFunc(index, lat, lon)
{
	let cache = map.caches[index];
	if((cache.insertType != IMPORTED || !kindIsPhysical(cache.kind))){
		if(cacheCoordsAreValid(lat, lon)){
			cache.latitude = lat;
			cache.longitude= lon;
			cache.installMarker();	
			switch(cache.insertType){
				case MANUAL:
					cache.installCircle(CACHE_RADIUS, 'green');
					break;
				case AUTOMATIC:
					cache.installCircle(CACHE_RADIUS, 'blue');
					break;
				case IMPORTED:
					cache.installCircle(CACHE_RADIUS, 'red');
					break;
				default:
					break;
			}
		}
		else{
			alert(INVALID_COORDS);
		}
	}
	else{
		alert(CANT_MOVE_CACHE);
	}
}

function deleteCache(index){
	let cache = map.caches[index];	
	if(kindIsPhysical(cache.kind) && (cache.insertType != IMPORTED)){
		map.remove(cache.marker);
		map.remove(cache.circle);
		map.caches[map.caches.length - 1].index = map.caches[index].index;
		map.caches[index] = map.caches[map.caches.length - 1];
		map.caches.pop();
		map.caches[index].installMarker();
		map.cacheCount--;
	}
	else{
		alert(CANT_DELETE_CACHE);
	}	
}


// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2)
{
    function toRad(deg) { return deg * 3.1415926535898 / 180.0; }
    let dLat = toRad(lat2 - lat1), dLon = toRad (lon2 - lon1);
    let sa = Math.sin(dLat / 2.0), so = Math.sin(dLon / 2.0);
    let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
    return 6372.8 * 2.0 * Math.asin (Math.sqrt(a));
}

function loadXMLDoc(filename)
{
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	}
	catch(err) {
		alert("Could not access the geocaching database via AJAX.\n"
			+ "Therefore, no POIs will be visible.\n");
	}
	return xhttp.responseXML;	
}

function getAllValuesByTagName(xml, name)  {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name)  {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}

function kindIsPhysical(kind) {
	return kind === "Traditional";
}

/* POI CLASS + Cache CLASS */

class POI {
	constructor(xml) {
		this.decodeXML(xml);
	}

	decodeXML(xml) {
		if(xml === null)
			return;
		this.name = getFirstValueByTagName(xml, "name");
		this.latitude = getFirstValueByTagName(xml, "latitude");
		this.longitude = getFirstValueByTagName(xml, "longitude");
	}

	installCircle(radius, color) {
		if(this.circle != null){
			map.remove(this.circle);
		}
		let pos = [this.latitude, this.longitude];
		let style = {color: color, fillColor: color, weight: 1, fillOpacity: 0.1};
		this.circle = L.circle(pos, radius, style);
		this.circle.bindTooltip(this.name);
		map.add(this.circle);	
	}
}

class Cache extends POI {
	constructor(xml, i, insertType) {
		super(xml);
		this.index = i;
		this.insertType = insertType; 
		this.installMarker();
		switch(this.insertType){
			case IMPORTED:
				this.installCircle(CACHE_RADIUS, 'red');
				break;
			case MANUAL:
				this.installCircle(CACHE_RADIUS, 'green');
				break;
			case AUTOMATIC:
				this.installCircle(CACHE_RADIUS, 'blue');
				break;
			default:
				break;
		}
	}

	decodeXML(xml) {
		super.decodeXML(xml);
		this.code = getFirstValueByTagName(xml, "code");
		this.owner = getFirstValueByTagName(xml, "owner");
		this.altitude = getFirstValueByTagName(xml, "altitude");

		this.kind = getFirstValueByTagName(xml, "kind");
		this.size = getFirstValueByTagName(xml, "size");
		this.difficulty = getFirstValueByTagName(xml, "difficulty");
		this.terrain = getFirstValueByTagName(xml, "terrain");

		this.favorites = getFirstValueByTagName(xml, "favorites");
		this.founds = getFirstValueByTagName(xml, "founds");
		this.not_founds = getFirstValueByTagName(xml, "not_founds");
		this.state = getFirstValueByTagName(xml, "state");
		this.county = getFirstValueByTagName(xml, "county");

		this.publish = new Date(getFirstValueByTagName(xml, "publish"));
		this.status = getFirstValueByTagName(xml, "status");
		this.last_log = new Date(getFirstValueByTagName(xml, "last_log"));
	}

	installMarker() {
		if(this.marker != null){
			map.remove(this.marker);
		}
		let pos = [this.latitude, this.longitude];
		this.marker = L.marker(pos, {icon: map.getIcon(this.kind)});
		this.marker.bindTooltip(this.name);
		this.marker.bindPopup("I'm the marker of the cache <b>" + this.name + "</b>." +
		`<FORM>
		<P>
		<INPUT TYPE="button" ID="cachePage" VALUE="Cache Page" ONCLICK="openURL('https://coord.info/` +
		 this.code + `');">
		 <INPUT TYPE="button" ID="googleMaps" VALUE="Google Maps" ONCLICK="openURL(' http://maps.google.com/maps?layer=c&cbll=` +
		 this.latitude + ', '+ this.longitude+ `');">
		<P>
		Latitude <INPUT TYPE="number" ID="lat" VALUE="" SIZE=10 style="text-align: left">
		<P>
		Longitude <INPUT TYPE="number" ID="lon" VALUE="" SIZE=10 style="text-align: left">
		<P>
		<INPUT TYPE="button" ID="manageCoordsId" VALUE="Change Coord" ONCLICK="manageCoordsFunc(${this.index}, lat.value, lon.value);">
		<INPUT TYPE="button" ID="deleteCacheId" VALUE="Delete Cache" ONCLICK="deleteCache(${this.index});">
		</FORM>`);
		map.add(this.marker);
	}


}

class Place extends POI {
	constructor(name, pos) {
		super(null);
		this.name = name;
		this.latitude = pos[0];
		this.longitude = pos[1];
		this.installCircle(CACHE_RADIUS, 'black');
	}
}

function getLatLngArray(latlng){
	return latlng.slice(7, latlng.length - 1).split(","); 
}

function txt2xml(txt) {
    let parser = new DOMParser();
    return parser.parseFromString(txt,"text/xml");
}

function createManualCache(latlng){
	let latlngArray = getLatLngArray(latlng);
	let lat = latlngArray[0];
	let lng = latlngArray[1];
	if(cacheCoordsAreValid(lat, lng)){
		let txt =
 	         `<cache>
 	           <code>UNKNOWN</code>
 	           <name>UNKNOWN</name>
 	           <owner>User</owner>
 	           <latitude>${lat}</latitude>
 	           <longitude>${lng}</longitude>
 	           <altitude>-32768</altitude>
 	           <kind>Traditional</kind>
 	           <size>UNKNOWN</size>
 	           <difficulty>1</difficulty>
 	           <terrain>1</terrain>
 	           <favorites>0</favorites>
 	           <founds>0</founds>
 	           <not_founds>0</not_founds>
 	           <state>UNKNOWN</state>
 	           <county>UNKNOWN</county>
 	           <publish>2000/01/01</publish>
 	           <status>E</status>
 	           <last_log>2000/01/01</last_log>
 	         </cache>`;
 	   let cacheXML = txt2xml(txt);
		map.caches.push(new Cache(cacheXML, map.caches.length, MANUAL));
		map.cacheCount++;
		map.computeStatistics();
	}
	else{
		alert(INVALID_COORDS);
	}
}

/* Map CLASS */
class Map {
	constructor(center, zoom) {
		this.lmap = L.map(MAP_ID).setView(center, zoom);
		this.addBaseLayers(MAP_LAYERS);
		this.icons = this.loadIcons(RESOURCES_DIR);
		this.caches = [];
		this.cacheCount = 0;
		this.addClickHandler(e =>
			L.popup()
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString() + 
			`<FORM>
			<P>
			<INPUT TYPE="button" ID="streetView" VALUE="Google Maps" 
			ONCLICK="openURL('http://maps.google.com/maps?layer=c&cbll=${getLatLngArray(e.latlng.toString())[0]}, ${getLatLngArray(e.latlng.toString())[1]}');">
			<INPUT TYPE="button" ID="createCacheId" VALUE="Create Cache" ONCLICK="createManualCache('${e.latlng.toString()}');">
			 </FORM>
			`)
		);    
	}

	createValidCache(fill){
		async function animation(){
			let centerLan;
			let centerLng;
			let newLat;
			let newLng;
			let angle = 0;
			let numCachesAdded = 0;
			let cachesLength = map.caches.length;
			for(let i = 0; i < cachesLength; i++){
				centerLan = parseFloat(map.caches[i].latitude);
				centerLng = parseFloat(map.caches[i].longitude);
				for(let j = 0; j < 360/ANGLE; j++){
					angle = j*ANGLE;
					newLat = centerLan + VALID_RADIUS*Math.cos(angle);
					newLng = centerLng + VALID_RADIUS*Math.sin(angle);
					if(cacheCoordsAreValid(newLat, newLng)){
						let txt =
						  `<cache>
							<code>UNKNOWN</code>
							<name>UNKNOWN</name>
							<owner>User</owner>
							<latitude>${newLat}</latitude>
							<longitude>${newLng}</longitude>
							<altitude>-32768</altitude>
							<kind>Traditional</kind>
							<size>UNKNOWN</size>
							<difficulty>1</difficulty>
							<terrain>1</terrain>
							<favorites>0</favorites>
							<founds>0</founds>
							<not_founds>0</not_founds>
							<state>UNKNOWN</state>
							<county>UNKNOWN</county>
							<publish>2000/01/01</publish>
							<status>E</status>
							<last_log>2000/01/01</last_log>
						  </cache>`;
						let cacheXML = txt2xml(txt);
						map.caches.push(new Cache(cacheXML, map.caches.length, AUTOMATIC));
						await sleep(1);
						if(!fill){
							map.computeStatistics();
							return 1;
						}
						else{
							numCachesAdded++;
						}
						
					}
				}
			}
			map.computeStatistics();
			alert(numCachesAdded + " new caches were added.");
			return numCachesAdded;
		}
		return animation();
	}

	computeStatistics(){
		let nCachesText = document.getElementById('nCaches');
		nCachesText.innerHTML = this.caches.length;
		let prolificOwnerText = document.getElementById('prolOwner');
		prolificOwnerText.innerHTML = this.getProlificOwner();
		let highALtitudeCacheText = document.getElementById('highestAltitudeCache');
		let altitudeText = document.getElementById('altitude');
		let nameAndAltitude = this.getHighestCache();
		highALtitudeCacheText.innerHTML = nameAndAltitude[1];
		altitudeText.innerHTML = nameAndAltitude[0];
	}

	getProlificOwner() {
		let ownerArray = [];
		for(let i = 0; i < this.caches.length; i++){
			ownerArray[i] = this.caches[i].owner;
		}
		return ownerArray.sort((o1,o2) => ownerArray.filter(a => a===o1).length -
								ownerArray.filter(a => a===o2).length).pop();
	}

	getHighestCache(){
		let altitudeArray = [];
		for(let i = 0; i < this.caches.length; i++){
			altitudeArray.push(this.caches[i].altitude);
		}
		let highestAltitude = altitudeArray.sort((a,b) => a - b).pop();
		let nameAndAltitude = [highestAltitude];
		nameAndAltitude.push(this.caches.find(x => x.altitude === highestAltitude).name);
		return nameAndAltitude;
	}

	populate() {
		this.caches = this.loadCaches(RESOURCES_DIR + CACHES_FILE_NAME);
	}

	showFCT() {
		this.fct = new Place("FCT/UNL", MAP_INITIAL_CENTRE);
	}

	getIcon(kind) {
		return this.icons[kind];
	}

	getCaches() {
		return this.caches;
	} 

	makeMapLayer(name, spec) {
		let urlTemplate = MAP_URL;
		let attr = MAP_ATTRIBUTION;
		let errorTileUrl = MAP_ERROR;
		let layer =
			L.tileLayer(urlTemplate, {
					minZoom: 6,
					maxZoom: 19,
					errorTileUrl: errorTileUrl,
					id: spec,
					tileSize: 512,
					zoomOffset: -1,
					attribution: attr
			});
		return layer;
	}

	addBaseLayers(specs) {
		let baseMaps = [];
		for(let i in specs)
			baseMaps[capitalize(specs[i])] =
				this.makeMapLayer(specs[i], "mapbox/" + specs[i]);
		baseMaps[capitalize(specs[0])].addTo(this.lmap);
		L.control.scale({maxWidth: 150, metric: true, imperial: false})
									.setPosition("topleft").addTo(this.lmap);
		L.control.layers(baseMaps, {}).setPosition("topleft").addTo(this.lmap);
		return baseMaps;
	}

	loadIcons(dir) {
		let icons = [];
		let iconOptions = {
			iconUrl: "??",
			shadowUrl: "??",
			iconSize: [16, 16],
			shadowSize: [16, 16],
			iconAnchor: [8, 8], // marker's location
			shadowAnchor: [8, 8],
			popupAnchor: [0, -6] // offset the determines where the popup should open
		};
		for(let i = 0 ; i < CACHE_KINDS.length ; i++) {
			iconOptions.iconUrl = dir + CACHE_KINDS[i] + ".png";
			iconOptions.shadowUrl = dir + "Alive.png";
			icons[CACHE_KINDS[i]] = L.icon(iconOptions);
			iconOptions.shadowUrl = dir + "Archived.png";
			icons[CACHE_KINDS[i] + "_archived"] = L.icon(iconOptions);
		}
		return icons;
	}

	loadCaches(filename) {
		let xmlDoc = loadXMLDoc(filename);
		let xs = getAllValuesByTagName(xmlDoc, "cache"); 
		let caches = [];
		let newCache;
		if(xs.length === 0)
			alert("Empty cache file");
		else {
			for(let i = 0 ; i < xs.length ; i++)  // Ignore the disables caches
				if( getFirstValueByTagName(xs[i], "status") === STATUS_ENABLED ){
					newCache = new Cache(xs[i], this.cacheCount, IMPORTED);
					caches.push(newCache);			
					this.cacheCount++; 
				}
		}
		return caches;
	}

	add(marker) {
		marker.addTo(map.lmap);
	}

	remove(marker) {
		marker.remove();
	}

	addClickHandler(handler) {
		let m = this.lmap;
		function handler2(e) {
			return handler(e).openOn(m);
		}
		return this.lmap.on('click', handler2);
	}
}


/* Some FUNCTIONS are conveniently placed here to be directly called from HTML.
   These functions must invoke operations defined in the classes, because
   this program must be written using the object-oriented style.
*/

function onLoad()
{
	map = new Map(MAP_INITIAL_CENTRE, MAP_INITIAL_ZOOM);
	map.showFCT();
	map.populate();
	map.computeStatistics();
}



