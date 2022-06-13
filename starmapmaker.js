///////////////////
// MAIN FUNCTION //
///////////////////

window.onload = function() {

	// global variables
	var resolution = 500;
	var scale = resolution / 2;
	var center = raDecPoint(12, 90, false, scale);
	var stars = [];	// list keeping track of all stars

	// create canvas and context
	var hemiN = $("starmapN");
	var hemiS = $("starmapS");
	hemiN.setAttribute("width", resolution);
	hemiN.setAttribute("height", resolution);
	hemiS.setAttribute("width", resolution);
	hemiS.setAttribute("height", resolution);

	drawBackground(resolution, hemiN, center, scale);
	drawBackground(resolution, hemiS, center, scale);

	var table = $("stars");
	hemiN.addEventListener("click", function() { 
		drawStar(hemiN, event, center, scale, stars, table, resolution) 
	});
	hemiS.addEventListener("click", function() { 
		drawStar(hemiS, event, center, scale, stars, table, resolution, sHemisphere = true) 
	});

	$("image").addEventListener("click", toggleSvg);
	$("list").addEventListener("click", function() { toggleList(stars) });
}

///////////////////////
// GENERAL FUNCTIONS //
///////////////////////

function $(id) {
	return document.getElementById(id);
}

/////////////////////
// POINT FUNCTIONS //
/////////////////////

// Point Type - Stores all of the conversion functions between RA/Dec and XY coordinates
//		There's basically three types of info we need:
//			- RA/Dec (in decimal hours/decimal degrees)
//			- Angle RA/Dec (in radians - for conversions) - do we really need this?
//			- X,Y (not to scale - between -1 and 1) - ditto for this?
//			- X,Y (to scale - between 0 and resolution)
class StarPoint {

	// constructor creates global vars w/ dummy values
	constructor() {
		this.X = 0;
		this.Y = 0;
		this.RA = 0;
		this.Dec = 0;
		this.Mag = 0;
	}

	// set functions

	setXY = function(x, y, center, scale, sHemisphere = false) {
		this.X = x;
		this.Y = y;
		this.XYtoRD(center, scale, sHemisphere);
	}

	setRADec = function(ra, dec, center, scale) {
		this.RA = ra;
		this.Dec = dec;
		this.RDtoXY(center, scale);
	}

	setMag = function(mag) {
		this.Mag = mag;
	}

	// get functions

	x = function() {
		return this.X;
	}

	y = function() {
		return this.Y;	
	}

	ra = function() {
		return this.RA;
	}

	dec = function() {
		return this.Dec;
	}

	mag = function() {
		return this.Mag;
	}

	// conversion functions

	RDtoXY = function(center, scale) {
		// convert ra and dec to angles
		var raAngle = raToAngle(this.RA);
		var decAngle = decToAngle(this.Dec);
		if (center) {
			var raCenterAngle = raToAngle(center.ra());
			var decCenterAngle = decToAngle(center.dec());
		}
		else {
			var raCenterAngle = raToAngle(this.RA);
			var decCenterAngle = decToAngle(this.Dec);
		}


		// from http://www.projectpluto.com/project.htm
		var deltaRA = raAngle - raCenterAngle;
		var x = Math.cos(decAngle) * Math.sin(deltaRA);
		var y = Math.sin(decAngle) * Math.cos(decCenterAngle) - Math.cos(decAngle) * Math.cos(deltaRA) * Math.sin(decCenterAngle);

		this.X = this.scaleAndOffset(x, scale);
		this.Y = this.scaleAndOffset(y, scale);
	}

	XYtoRD = function(center, scale, sHemisphere = false) {
		// convert everything to correct units (x and y between -1 and 1, ra and dec into angles)
		var x = this.recenterCoord(this.X, scale);
		var y = this.recenterCoord(this.Y, scale);
		var raCenterAngle = raToAngle(center.ra());
		var decCenterAngle = decToAngle(center.dec());
		var ra = 0;
		var dec = 0;

		// prevent NaN cases
		if (x == 0) {
			x += Number.EPSILON;
		}

		// calculate ra 
		if (x > 0 && y > 0) {			// 18-24h
			ra = Math.atan(x/y);
		}
		else if (x > 0 && y <= 0) {		// 12-18h
			ra = Math.atan(Math.abs(y/x)) + (Math.PI / 2);
		}
		else if (x <= 0 && y <= 0) {	// 6-12h
			ra = Math.atan(x/y) + Math.PI;
		}
		else {							// 0-6h
			ra = Math.atan(Math.abs(y/x)) + (Math.PI * 3 / 2);
		}

		// calculate dec, i do NOT know why this is formula don't ask me
		dec = Math.PI - Math.acos(x / Math.sin(ra - raCenterAngle));

		// set ra and dec for point
		this.RA = angleToRA(ra);
		this.Dec = angleToDec(dec);
		if (sHemisphere) {
			this.Dec *= -1;
		}
	}

	scaleAndOffset = function(point, scale) {
		return (point * scale + scale);
	}

	recenterCoord = function(point, scale) {
		return ((point - scale) / scale);
	}
}

function raDecPoint(ra, dec, center, scale) {
	var newPoint = new StarPoint();
	newPoint.setRADec(ra, dec, center, scale);
	return newPoint;
}

function xyPoint(x, y, center, scale, sHemisphere = false) {
	var newPoint = new StarPoint();
	newPoint.setXY(x, y, center, scale, sHemisphere);
	return newPoint;
}

function angleToRA(angle) {
	return 24 - (12 * angle / Math.PI);
}

function angleToDec(angle) {
	return angle * 180 / Math.PI;
}

function raToAngle(ra) {
	return 2 * Math.PI * (1 - ra /24);
}

function decToAngle(dec) {
	return dec * Math.PI / 180;
}

function mag(counter) {
	// takes the number of stars that have already been draw
	// returns the magnitude the current one should be at
	return 1.6 * Math.pow(counter, (1 / 4.6)) - 1.7 + (Math.random() * 0.1);
}

///////////////////////
// DRAWING FUNCTIONS //
///////////////////////

// makes an svg circle
function drawCircle(svg, id, x, y, rad, color, fill=true, strokeWidth=0) {

	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

	circle.setAttributeNS(null, "id", id);
	circle.setAttributeNS(null, "cx", x);
	circle.setAttributeNS(null, "cy", y);
	circle.setAttributeNS(null, "r", rad);
	if (fill) {
		circle.setAttributeNS(null, "fill", color);
	}
	else {
		circle.setAttributeNS(null, "stroke", color);
		circle.setAttributeNS(null, "stroke-width", strokeWidth);
		circle.setAttributeNS(null, "fill", "none");
	}

	svg.appendChild(circle);
}

// makes an svg line
function drawLine(svg, x0, y0, x1, y1, color, strokeWidth) {
	var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttributeNS(null, "x1", x0);
	line.setAttributeNS(null, "y1", y0);
	line.setAttributeNS(null, "x2", x1);
	line.setAttributeNS(null, "y2", y1);
	line.setAttributeNS(null, "stroke", color);
	line.setAttributeNS(null, "stroke-width", strokeWidth);
	svg.appendChild(line);
}

// draw the two halves of the sky and the coordinate lines
function drawBackground(resolution, svg, center, scale, sHemisphere = false) {

	// for ids, make N if north or S if south
	var idHem = "";
	if (sHemisphere) {
		idHem = "S";
	}
	else {
		idHem = "N";
	}

	// 1/2 of the full image width/height
	var halfRes = resolution / 2;

	// draw in sky hemisphere circle
	drawCircle(svg, "sky"+idHem, halfRes, halfRes, halfRes, "#0e0093");

	// draw in dec lines
	for (var i = 0; i < 90; i += 15) {

		// calculate radius by finding the difference between the center (200,200) and this point
		var point = raDecPoint(center.ra(), i, center, scale);
		var radius = Math.abs(point.y() - center.y());

		// draw path
		drawCircle(svg, i.toString()+idHem, halfRes, halfRes, radius, "#eeeeee", fill=false, strokeWidth=0.25);
	}

	// draw in ra lines
	for (var i = 0; i < 12; i++) {

		// calculate start and end points (opposite each other in circle)
		var startXY = raDecPoint(i, 0, center, scale);
		var endXY = raDecPoint((i+12), 0, center, scale);

		// draw path
		drawLine(svg, startXY.x(), startXY.y(), endXY.x(), endXY.y(), "#eeeeee", 0.25);

	}
}

// draw in stars when clicked
function drawStar(svg, event, center, scale, stars, table, resolution, sHemisphere = false) {

	// create new point
	var newStar = xyPoint(event.offsetX, event.offsetY, center, scale, sHemisphere);
	newStar.setMag(mag(stars.length));
	stars.push(newStar);

	// drawing part
	var rad = ((6 - newStar.mag()) / (7.5)) + 1 * (resolution * 0.01 / 2);
	drawCircle(svg, stars.length.toString(), newStar.x(), newStar.y(), rad, "#ffffff");


	// filling in chart
	table.appendChild(tableRow(newStar.ra().toFixed(2), newStar.dec().toFixed(2), newStar.mag().toFixed(2), stars));

}

// the most ungodly function for making a table row, i hate dom
function tableRow(ra, dec, mag, stars) {
	// make <tr> element
	var tr = document.createElement("tr");
	tr.setAttribute("id", "item" + stars.length.toString());

	// make first <td> with checkbox
	var td1 = document.createElement("td");
	var checkbox = document.createElement("input");
	checkbox.setAttribute("type", "checkbox");
	checkbox.setAttribute("value", stars.length.toString());

	checkbox.addEventListener("change", function() {
		id = stars.length.toString();
		if (this.checked) {
			selectStar(id);
		} 
		else {
			deselectStar(id);
		}
	});

	td1.appendChild(checkbox);


	// make each <td> element
	var td2 = document.createElement("td");
	var td2txt = document.createTextNode(ra.toString());
	td2.appendChild(td2txt);
	var td3 = document.createElement("td");
	var td3txt = document.createTextNode(dec.toString());
	td3.appendChild(td3txt);
	var td4 = document.createElement("td");
	var td4txt = document.createTextNode(mag.toString());
	td4.appendChild(td4txt);

	// make final <td> with delete button
	var td5 = document.createElement("td");
	var button = document.createElement("input");
	button.setAttribute("type", "button");
	button.setAttribute("value", "Delete");

	button.addEventListener("click", function() {
		id = stars.length.toString();
		deleteStar(id, stars);
	});

	td5.appendChild(button);

	// stitch it all together!
	tr.appendChild(td1);
	tr.appendChild(td2);
	tr.appendChild(td3);
	tr.appendChild(td4);
	tr.appendChild(td5);

	return tr;
}

// get star when selected
function selectStar(id) {
	var star = $(id);
	star.setAttribute("stroke", "#ff0000");
	star.setAttribute("stroke-width", "2");
}

// get star when selected
function deselectStar(id) {
	var star = $(id);
	star.setAttribute("stroke", "none");
}

// delete star and corresponding row of table
function deleteStar(id, stars) {
	var star = $(id);
	var par = star.parentNode;
	var tr = $("item"+id);
	var trPar = tr.parentNode;
	var i = parseInt(id,10) - 1;
	console.log(i, stars);
	delete stars[i];
	par.removeChild(star);
	trPar.removeChild(tr);
}

/////////////////////////
// DOWNLOADS FUNCTIONS //
/////////////////////////

// show the image source code
function toggleSvg() {

	// get all the necessary html elements
	var instructions = $("instructions");
	var download = $("download");
	var svg1 = $("starmapN");
	var svg2 = $("starmapS");

	// test if it's already there
	if (instructions.innerHTML == "" || (instructions.innerHTML.slice(0,6) != "Copy a")) {
		// update instructions
		var infoText = "Copy and paste the following into two separate files "
		infoText += "(between the <!--Begin File X--> and <!--End File X --> comments). ";
		infoText += "Save the first one as NorthHemisphere.svg and the second as SouthernHemisphere.svg.";
		var info = document.createTextNode(infoText);
		instructions.appendChild(info);

		// update downloads with inner code from the two svgs
		var img1text = '<!--Begin File 1-->\n<svg xmlns="http://www.w3.org/2000/svg">';
		img1text += svg1.innerHTML;
		img1text += "</svg><!--End File 1-->\n\n";

		var img2text = '<!--Begin File 2-->\n<svg xmlns="http://www.w3.org/2000/svg">';
		img2text += svg2.innerHTML;
		img2text += "</svg><!--End File 2-->";

		var imgText = document.createTextNode(img1text + img2text);
		download.appendChild(imgText);

		// make them all visible
		instructions.hidden = false;
		download.hidden = false;
	}
	else {
		// make them go away
		instructions.innerHTML = "";
		download.innerHTML = "";
		instructions.hidden = true;
		download.hidden = true;
	}


}

// show a csv list of all the ra, dec, and mag values
function toggleList(stars) {

	// get all the necessary html elements
	var instructions = $("instructions");
	var download = $("download");

	// test if it's already there
	if (instructions.innerHTML == "" || (instructions.innerHTML.slice(0,6) != "Copy t")) {

		// make a text list of stars
		for (var i = 0; i < stars.length; i++) {
			if (stars[i]) {

				// first make the text (needs lots of formatting)
				var text = "";
				text += stars[i].ra().toFixed(8) + ", ";
				text += stars[i].dec().toFixed(8) + ", ";
				text += stars[i].mag().toFixed(2);

				// then append as nodes to the page
				var starList = document.createTextNode(text);
				var br = document.createElement("br");
				download.appendChild(starList);
				download.appendChild(br);

			}
		}

		// update instructions
		var info = document.createTextNode("Copy this text into a plaintext file and save it with .csv to get a table.");
		instructions.appendChild(info);

		// make them all visible
		instructions.hidden = false;
		download.hidden = false;

	}
	else {
		// make them go away
		instructions.innerHTML = "";
		download.innerHTML = "";
		instructions.hidden = true;
		download.hidden = true;
	}
}
