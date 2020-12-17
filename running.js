// todo: 
// 1. url that can save the state
// refator to react ...
// fix the scaling issue
// fix the resize issue
// add support for miles

let elevationTitleLabel = {};
let minElevationLabel = {};
let maxElevationLabel = {}

let boxes;
let allPaces;
let allKms;
let circles;
let curves;

let elevationPath = {};

// let paper;

let averagePace;
let currentPaceLine;

let scopes = [];

let canMove;

let distanceElement;
let paceMinutesElement;
let paceSecondsElement;
let timeHoursElement;
let timeMinutesElement;
let timeSecondsElement;

const DEFAULT_MIN_PACE = 4;
const DEFAULT_SEC_PACE = 30;
const DEFAULT_HOUR_TIME = 0;
const DEFAULT_MIN_TIME = 22;
const DEFAULT_SEC_TIME = 30;

let route = []
let prettyRoute = []
let maxElevation;
let minElevation;

let elevation = {};

function initState(params) {
    boxes = {}
    allPaces = {}
    allKms = {}
    circles = {}
    curves = {}
    averagePace = {}
    currentPaceLine = {}

    for (let i = 0; i < params.rows; i++) {
        boxes[row(i)] = [];
        allPaces[row(i)] = [];
        allKms[row(i)] = [];
        circles[row(i)] = [];
        curves[row(i)] = [];
    }
}

function row(row) {
    return `row_${row}`;
}

function main() {
    distanceElement = document.querySelector("#race-distance");

    paceMinutesElement = document.querySelector("#pace-minutes");
    paceSecondsElement = document.querySelector("#pace-seconds");

    timeHoursElement = document.querySelector("#time-hours");
    timeMinutesElement = document.querySelector("#time-minutes");
    timeSecondsElement = document.querySelector("#time-seconds");

    paceMinutesElement.onchange = onPaceChange;
    paceSecondsElement.onchange = onPaceChange;

    timeHoursElement.onchange = onTimeChange;
    timeMinutesElement.onchange = onTimeChange;
    timeSecondsElement.onchange = onTimeChange;

    let fileSelector = document.querySelector("#file-selector");

    fileSelector.onchange = loadRoute;



    // uploadStravaButton.onclick = f

    distanceElement.onchange = function() {
        

        setTime(getSelectedPace(), getDistance());
        renderPacePlanningWidget(getParams());

        loadRoute();
    }

    initState(getParams());

    renderPacePlanningWidget(getParams());
};

function loadRoute() {
    route = []
    prettyRoute = []
    elevation = {}
    let fileSelector = document.querySelector("#file-selector");

    if (fileSelector.files.length === 0) {
        return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', (event) => {

        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(event.target.result, "text/xml");

        let childNodes = xmlDoc.getElementsByTagName("trkseg")[0].children;

        for (let i = 0; i < childNodes.length; i++) {
            let child = childNodes[i];

            route.push({
                lat: parseFloat(child.attributes.lat.nodeValue),
                lon: parseFloat(child.attributes.lon.nodeValue),
                ele: parseFloat(child.childNodes[1].textContent)
            })


        }

        let routeDistance = 0;

        let a = route[0];
        minElevation = a.ele;
        maxElevation = a.ele;

        let localMin = a.ele;
        let localMax = a.ele;
        let cumulativeUp = 0;
        let cumulativeDown = 0;

        let currentK = 0;

        for (let i = 1; i < route.length; i++) {
            let b = route[i];
            let d = calculateDistance(a.lat, a.lon, b.lat, b.lon);

            // let r = Math.sqrt(Math.pow(d, 2) + Math.pow(a.ele - b.ele, 2))
            
            prettyRoute.push({
                distance: routeDistance,
                elevation: a.ele
            });

            
            routeDistance += d;

            if (routeDistance > (currentK + 1) * 1000) {
                // save per k stats
                elevation[`${currentK}`] = {
                    min: localMin,
                    max: localMax,
                    up: cumulativeUp,
                    down: cumulativeDown
                }

                localMin = a.ele;
                localMax = a.ele;
                cumulativeUp = 0;
                cumulativeDown = 0;

                
                let start = routeDistance - d;
                let startElevation = a.ele;

                let end = routeDistance;
                let endElevation = b.ele;

                prettyRoute.push({
                    distance: (currentK + 1) * 1000,
                    elevation: line(start, end, startElevation, endElevation, (currentK + 1) * 1000)
                });

                currentK += 1;
            }

            if (a.ele > b.ele) {
                cumulativeDown += (a.ele - b.ele)
            }

            if (b.ele > a.ele) {
                cumulativeUp += (b.ele - a.ele)
            }

            a = route[i];

            if (a.ele > maxElevation) {
                maxElevation = a.ele;
            }

            if (a.ele < minElevation) {
                minElevation = a.ele;
            }

            if (a.ele > localMax) {
                localMax = a.ele;
            }

            if (a.ele < localMin) {
                localMin = a.ele;
            }
        }

        prettyRoute.push({
            distance: routeDistance,
            elevation: a.ele
        });

        elevation[`${currentK}`] = {
            min: localMin,
            max: localMax,
            up: cumulativeUp,
            down: cumulativeDown
        }

        plotPath(getParams(), prettyRoute);

    });
    reader.readAsText(fileSelector.files[0]);
}

function line(x1, x2, y1, y2, x) {
    return ((y2 - y1) / (x2 - x1)) * (x - x1) + y1;
}

function distance(a, b) {
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lon - b.lon, 2) + Math.pow(a.ele - b.ele, 2));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad(); 
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    var d = R * c;
    return d * 1000;
  }
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }

function getParams() {
    let availableWidth = document.querySelector("#canvas-holder").clientWidth;

    let selectedDistance = getDistance();
    let segments = Math.ceil(selectedDistance);

    let margin = 30;
    let maxElementsPerLine = Math.ceil(availableWidth / 120);

    let segmentWidth = (availableWidth - 2 * margin) / maxElementsPerLine > 120 ? 120 : (availableWidth - 2 * margin) / maxElementsPerLine;

    return {
        maxElementsPerLine: maxElementsPerLine,
        rows: Math.ceil(segments / maxElementsPerLine),
        segments: segments,
        segmentLength: segmentWidth,
        segmentHeight: segmentWidth * 1.5,
        margin: margin,
        pace: getSelectedPace(),
        fastestPace: getSelectedPace() - 60,
        slowestPace: getSelectedPace() + 90,
        distance: selectedDistance,
        scalingFactor: 1
    }
}

function onPaceChange() {
    setTime(getSelectedPace(), getDistance());
    renderPacePlanningWidget(getParams());

    loadRoute();
}

function onTimeChange() {
    setPace(getSelectedTime(), getDistance());
    renderPacePlanningWidget(getParams());

    loadRoute();
}

function setTime(pace, distance) {
    let time = pace * distance;

    let h = Math.floor(time / (60 * 60));
    timeHoursElement.value = h;

    let m = Math.floor((time - h * 60 * 60) / (60));
    timeMinutesElement.value = m;

    let s = (time % 60).toFixed(1);
    timeSecondsElement.value = s;
}

function setExactTime(time) {
    let h = Math.floor(time / (60 * 60));
    timeHoursElement.value = h;

    let m = Math.floor((time - h * 60 * 60) / (60));
    timeMinutesElement.value = m;

    let s = (time % 60).toFixed(1);
    timeSecondsElement.value = s;
}

function setPace(time, distance) {
    let pace = (time / distance);

    let m = Math.floor((pace) / (60));
    paceMinutesElement.value = m;

    let s = (pace % (60)).toFixed(1);
    paceSecondsElement.value = s;
}

function getSelectedPace() {
    
    let currentSelectedPaceMin = isNaN(parseFloat(paceMinutesElement.value)) ? DEFAULT_MIN_PACE : parseFloat(paceMinutesElement.value);
    let currentSelectedPaceSec = isNaN(parseFloat(paceSecondsElement.value)) ? DEFAULT_SEC_PACE : parseFloat(paceSecondsElement.value);

    return currentSelectedPaceMin * 60 + currentSelectedPaceSec;
}

function getSelectedTime() {
    let currentSelectedTimeHour = isNaN(parseFloat(timeHoursElement.value)) ? DEFAULT_HOUR_TIME : parseFloat(timeHoursElement.value);
    let currentSelectedTimeMin = isNaN(parseFloat(timeMinutesElement.value)) ? DEFAULT_MIN_TIME : parseFloat(timeMinutesElement.value);
    let currentSelectedTimeSec = isNaN(parseFloat(timeSecondsElement.value)) ? DEFAULT_SEC_TIME : parseFloat(timeSecondsElement.value);

    return currentSelectedTimeHour * 60 * 60 + currentSelectedTimeMin * 60 + currentSelectedTimeSec;
}

function getDistance() {
    let distanceElement = document.querySelector("#race-distance");

    return parseFloat(distanceElement.options[distanceElement.selectedIndex].value);
}

main();

function renderPacePlanningWidget(params) {
    createPacePlanningWidget(params);
}

function clearCanvas(paper) {
    if (paper.project) {
        paper.project.activeLayer.removeChildren();
    }

    initState(getParams());
}

function createPacePlanningWidget(params) {

    let existingCanvas = document.querySelector("#myCanvas");

    if (existingCanvas) {
        existingCanvas.remove();
    }

    let canvas = document.createElement("canvas");
    canvas.id = "myCanvas";

    let canvasDiv = document.querySelector(".canvas");

    canvasDiv.appendChild(canvas);

    paper = init(params);

    for (let i = 0; i < params.rows; i++) {
        drawMainRectangle(paper, params, i);
        drawPerSegmentRectangle(paper, params, i);
        drawPaceLabel(paper, params, i);
        drawDefaultPaceLine(paper, params, i);
    }

    display(paper);
}

function plotPath(params, route) {
    for (let r = 0; r < params.rows; r++) {

        let lastX = params.margin;

        let segments = getSegmentsForRow(getParams(), r);

        if (elevationPath[row(r)]) {
            elevationPath[row(r)].closed = false;
            elevationPath[row(r)].remove()
        }
        
        elevationPath[row(r)] = new paper.Path();
        elevationPath[row(r)].strokeColor = 'black';
        elevationPath[row(r)].add(new paper.Point(params.margin, params.segmentHeight + params.margin + (2 * params.margin + params.segmentHeight) * r));
        
        let d = segments//params.maxElementsPerLine;

        if (params.rows > 1 && r === params.rows - 1) {
            d = (params.segments % params.maxElementsPerLine);
        }
        
        for (let i = 0; i < route.length; i++) {

            if (route[i].distance < r * params.maxElementsPerLine * 1000) {
                continue;
            }

            if (route[i].distance <= (r * params.maxElementsPerLine + d) * 1000) {

                elevationPath[row(r)].add(
                    new paper.Point(
                        params.margin + ((route[i].distance - r * params.maxElementsPerLine * 1000) / (d * 1000)) * params.segmentLength * d, 
                        params.margin + params.segmentHeight - ((route[i].elevation - minElevation) / (maxElevation - minElevation)) * params.segmentHeight + (2 * params.margin + params.segmentHeight) * r));
                lastX = params.margin + ((route[i].distance - r * params.maxElementsPerLine * 1000) / (d * 1000)) * params.segmentLength * d
            }
        }

        // elevationPath[row(r)].add(new paper.Point(
        //     params.margin + params.segmentLength * d, 
        //     params.margin + params.segmentHeight - ((route[route.length - 1].elevation - minElevation) / (maxElevation - minElevation)) * params.segmentHeight + (2 * params.margin + params.segmentHeight) * r));

        elevationPath[row(r)].add(new paper.Point(
            lastX, 
            params.segmentHeight + params.margin + (2 * params.margin + params.segmentHeight) * r));


        elevationPath[row(r)].fillColor = 'black';
        elevationPath[row(r)].opacity = 0.1
        elevationPath[row(r)].sendToBack();

        elevationPath[row(r)].closed = true;

        if (maxElevationLabel[row(r)]) {
            maxElevationLabel[row(r)].remove();
        }

        maxElevationLabel[row(r)] = new paper.PointText(new paper.Point(params.margin * 2 + segments * params.segmentLength, params.margin + 5 + (params.margin * 2 + params.segmentHeight) * r));
        maxElevationLabel[row(r)].justification = 'right';
        maxElevationLabel[row(r)].fillColor = 'black';
        maxElevationLabel[row(r)].content = `${Math.round(maxElevation)}`;

        if (minElevationLabel[row(r)]) {
            minElevationLabel[row(r)].remove();
        }

        minElevationLabel[row(r)] = new paper.PointText(new paper.Point(params.margin * 2 + segments * params.segmentLength, params.margin + params.segmentHeight + 5 + (params.margin * 2 + params.segmentHeight) * r));
        minElevationLabel[row(r)].justification = 'right';
        minElevationLabel[row(r)].fillColor = 'black';
        minElevationLabel[row(r)].content = `${Math.round(minElevation)}`;

        if (elevationTitleLabel[row(r)]) {
            elevationTitleLabel[row(r)].remove();
        }

        elevationTitleLabel[row(r)] = new paper.PointText(new paper.Point(params.margin * 2 + segments * params.segmentLength, params.margin - 15 + (params.margin * 2 + params.segmentHeight) * r));
        elevationTitleLabel[row(r)].justification = 'right';
        elevationTitleLabel[row(r)].fillColor = 'black';
        elevationTitleLabel[row(r)].content = 'ELEVATION (m)';
        elevationTitleLabel[row(r)].fontWeight = 'bold';
    }
}

function secondsToLabel(pace) {
    let m = Math.floor(pace / 60);
    let s = Math.round(pace % 60);

    let ss = `${s}`.padStart(2, '0');

    return `${m}:${ss}`;
}

function init(params) {
    clearCanvas(paper);

    // Get a reference to the canvas object
    var canvas = document.getElementById('myCanvas');
    canvas.setAttribute('width', params.segments * params.segmentLength +  2 * params.margin);
    canvas.setAttribute('height', (params.segmentHeight + 2 * params.margin) * params.rows);
    // Create an empty project and a view for the canvas:

    let scope  = new paper.PaperScope;
    scope.setup(canvas);
    scope.activate();

    scopes.push(scope);

    return scope;
}

function getSegmentsForRow(params, r) {
    let segmentsInRow = params.maxElementsPerLine;
    if (r === params.rows - 1 && params.rows * params.maxElementsPerLine != params.segments) {
        segmentsInRow = params.segments % params.maxElementsPerLine;
    }
    return segmentsInRow;
}

function drawMainRectangle(paper, params, r) {
    let segmentsInRow = getSegmentsForRow(params, r);

    let topLeft = new paper.Point(params.margin, params.margin + (params.margin * 2 + params.segmentHeight) * row);
    let rectSize = new paper.Size(params.segmentLength * segmentsInRow, params.segmentHeight);
    let rect = new paper.Rectangle(topLeft, rectSize);

    let path = new paper.Path.Rectangle(rect);
    path.fillColor = '#ffffff';
    path.strokeColor = '#000000';
    path.selected = false;
    path.strokeWidth = params.scalingFactor;
    path.opacity = 0;
}

function drawPerSegmentRectangle(paper, params, r) {
    let segmentsInRow = getSegmentsForRow(params, r);

    for (let i = 0; i < segmentsInRow; i++) {
        let topLeft = new paper.Point(params.margin + i * params.segmentLength, params.margin + (params.margin * 2 + params.segmentHeight) * r);
        let rectSize = new paper.Size(params.segmentLength, params.segmentHeight);
        let rect = new paper.Rectangle(topLeft, rectSize);

        let path = new paper.Path.Rectangle(rect);

        path.onMouseLeave = function() {
            document.getElementById('myCanvas').style.setProperty('cursor', null);
        };

        path.fillColor = '#ffffff';
        path.strokeColor = '#000000';
        path.selected = false;
        path.strokeWidth = 1;

        path.row = r;
        path.column = i;

        path.onMouseLeave =  function(event) {
            for (let i = 0; i < boxes[row(path.row)].length; i++) {
                boxes[row(path.row)][i].fillColor = '#fff';
                allPaces[row(path.row)][i].fillColor = 'black';
                allKms[row(path.row)][i].fillColor = 'black';
                circles[row(path.row)][i].visible = false;
            }
            let k = path.row * params.maxElementsPerLine + path.column;

            if (elevation[`${k}`] && elevation[`${k}`].upText) {
                elevation[`${k}`].upText.visible = false;
                elevation[`${k}`].downText.visible = false;
            }
        }

        path.onMouseEnter = function(event) {
            highlightBox(path);
        }

        path.onMouseDrag = function(event) {
            doTheThing(event, params, path);
        }

        path.onMouseDown = function(event) {
            doTheThing(event, params, path);
        }

        boxes[row(r)].push(path);

        path.opacity = 0.2;
    }
}

function highlightBox(path) {
    let s = path.column;

    if (boxes[row(path.row)][s]) {
        boxes[row(path.row)][s].fillColor = 'lightgray';
    }

    if (allPaces[row(path.row)][s]) {
        allPaces[row(path.row)][s].fillColor = '#fc5200';
    }
    

    if (allKms[row(path.row)][s]) {
        allKms[row(path.row)][s].fillColor = '#fc5200';
    }

    if (circles[row(path.row)][s]) {
        circles[row(path.row)][s].visible = true;
    }

    showElevationData(getParams(), path.row, s);
}

function drawPaceLabel(paper, params, r) {

    let segments = getSegmentsForRow(params, r);

    let text = new paper.PointText(new paper.Point((params.segmentLength * segments + params.margin * 2) / 2, params.margin - 15  + (params.margin * 2 + params.segmentHeight) * r));
    text.justification = 'center';
    text.fillColor = 'black';
    text.content = 'KM';
    text.fontWeight = 'bold';

    let pace = new paper.PointText(new paper.Point(0, params.margin - 15 + (params.margin * 2 + params.segmentHeight) * r));
    pace.justification = 'left';
    pace.fillColor = 'black';
    pace.content = 'PACE (m/km)';
    pace.fontWeight = 'bold';

    

    let fastestPace = new paper.PointText(new paper.Point(0, params.margin + 5 + (params.margin * 2 + params.segmentHeight) * r));
    fastestPace.justification = 'left';
    fastestPace.fillColor = 'black';
    fastestPace.content = secondsToLabel(params.fastestPace);

    let slowestPace = new paper.PointText(new paper.Point(0, params.margin + params.segmentHeight + 5 + (params.margin * 2 + params.segmentHeight) * r));
    slowestPace.justification = 'left';
    slowestPace.fillColor = 'black';
    slowestPace.content = secondsToLabel(params.slowestPace);

    let targetPace = new paper.PointText(new paper.Point(0, getPaceLine(params, params.pace)  + 5 + (params.margin * 2 + params.segmentHeight) * r));
    targetPace.justification = 'left';
    targetPace.fillColor = 'black';
    targetPace.content = secondsToLabel(params.pace);
    targetPace.fontWeight = 'bold';
    targetPace.opacity = 0.2;

    averagePace[row(r)] = new paper.PointText(new paper.Point(0, getPaceLine(params, params.pace) + 5 + (params.margin * 2 + params.segmentHeight) * r));
    averagePace[row(r)].justification = 'left';
    averagePace[row(r)].fillColor = '#fc5200';
    averagePace[row(r)].content = secondsToLabel(params.pace);
    averagePace[row(r)].fontWeight = 'bold';

    let targetPaceLine = new paper.Path();
    targetPaceLine.strokeColor = 'black';
    let start = new paper.Point(params.margin, getPaceLine(params, params.pace) + (params.margin * 2 + params.segmentHeight) * r);
    targetPaceLine.moveTo(start);
    targetPaceLine.lineTo(start.add([params.segmentLength * segments, 0]));
    targetPaceLine.opacity = 0.2;
    targetPaceLine.sendToBack();

    // enableHighlightingAndDragging

    currentPaceLine[row(r)] = new paper.Path();
    currentPaceLine[row(r)].strokeColor = '#fc5200';
    let start2 = new paper.Point(params.margin, getPaceLine(params, params.pace)+ (params.margin * 2 + params.segmentHeight) * r);
    currentPaceLine[row(r)].moveTo(start2);
    currentPaceLine[row(r)].lineTo(start2.add([params.segmentLength * segments, 0]));
    currentPaceLine[row(r)].opacity = 0.4;
    currentPaceLine[row(r)].sendToBack();
}

function getPaceLine(params, pace) {
    return params.margin + params.segmentHeight * (1 - (params.slowestPace - pace) / (params.slowestPace - params.fastestPace));
}

function doTheThing(event, params, box) {
    if (event.point.x < box.bounds.x || event.point.x > box.bounds.x + box.bounds.width) {
        return;
    }

    if (event.point.y < box.bounds.y || event.point.y > box.bounds.y + box.bounds.height) {
        return;
    }

    let r = box.row;
    let s = box.column;

    if (s > params.segments - 1 || s < 0) {
        return;
    }

    if (curves[row(r)][s] && curves[row(r)][s].p1) {
        curves[row(r)][s].p1.remove();
        curves[row(r)][s].p2.remove();
    } else {
        curves[row(r)][s] = {
            "p1": undefined,
            "p2": undefined,
        }
    }

    if (event.point.y < getPaceLine(params, params.pace) + (params.margin * 2 + params.segmentHeight) * r) {
        curves[row(r)][s].p1 = getNicerCurve1(
            new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y), 
            new paper.Point(params.margin + params.segmentLength + params.segmentLength * s, getPaceLine(params, params.pace)  + (params.margin * 2 + params.segmentHeight) * r));
        curves[row(r)][s].p2 = getNicerCurve2(
            new paper.Point(params.margin + params.segmentLength * s, getPaceLine(params, params.pace) +  (params.margin * 2 + params.segmentHeight) * r), 
            new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y));
    } else {
        curves[row(r)][s].p1 = getNicerCurve2(
            new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y), 
            new paper.Point(params.margin + params.segmentLength + params.segmentLength * s, getPaceLine(params, params.pace) +  (params.margin * 2 + params.segmentHeight) * r));
        curves[row(r)][s].p2 = getNicerCurve1(
            new paper.Point(params.margin + params.segmentLength * s, getPaceLine(params, params.pace) +  (params.margin * 2 + params.segmentHeight) * r), 
            new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y));
    }

    enableHighlightingAndDragging(curves[row(r)][s].p1, r, s, params)
    enableHighlightingAndDragging(curves[row(r)][s].p2, r, s, params)

    allPaces[row(r)][s].content = secondsToLabel(parseInt(params.fastestPace + (params.slowestPace - params.fastestPace) * ((event.point.y - box.bounds.y) / (params.segmentHeight))));

    let overallTotalTime = 0;

    for (let j = 0; j < params.rows; j++) {
        for(let i = 0; i < allPaces[row(j)].length; i++) {
            if (j === params.rows - 1 && i === allPaces[row(j)].length - 1 && params.distance % 1 > 0) {
                overallTotalTime += (paceFromLabel(allPaces[row(j)][i].content) * (params.distance % 1));
            } else {
                overallTotalTime += paceFromLabel(allPaces[row(j)][i].content);
            }
        }
    }

    let overallAveragePace = parseFloat(overallTotalTime / params.distance);

    for (let j = 0; j < params.rows; j++) {
        averagePace[row(j)].remove();
        currentPaceLine[row(j)].remove();
    }

    for (let j = 0; j < params.rows; j++) {
        let segments = getSegmentsForRow(params, j);

        averagePace[row(j)].remove();
        currentPaceLine[row(j)].remove();

        averagePace[row(j)] = new paper.PointText(new paper.Point(0, getPaceLine(params, overallAveragePace) + 5+  (params.margin * 2 + params.segmentHeight) * j));
        averagePace[row(j)].justification = 'left';
        averagePace[row(j)].fillColor = '#fc5200';
        averagePace[row(j)].content = secondsToLabel(params.pace);
        averagePace[row(j)].fontWeight = 'bold';
        // averagePace[row(j)].opacity = 0.4;

        averagePace[row(j)].content = secondsToLabel(overallAveragePace);

        currentPaceLine[row(j)] = new paper.Path();
        currentPaceLine[row(j)].strokeColor = '#fc5200';
        let start2 = new paper.Point(params.margin, getPaceLine(params, overallAveragePace)+ (params.margin * 2 + params.segmentHeight) * j);
        currentPaceLine[row(j)].moveTo(start2);
        currentPaceLine[row(j)].lineTo(start2.add([params.segmentLength * segments, 0]));
        currentPaceLine[row(j)].opacity = 0.4;
        currentPaceLine[row(j)].sendToBack();
    }
        
    let activeCircle = circles[row(r)][s];
    activeCircle.position = new paper.Point(activeCircle.position.x, event.point.y);
    
    setExactTime(overallTotalTime);
    setPace(getSelectedTime(), getDistance());
}

function showElevationData(params, r, c) {
    let k = r * params.maxElementsPerLine + c;

    if (elevation[`${k}`] && !elevation[`${k}`].upText) {
        let up = new paper.PointText(new paper.Point(20 + params.margin + (params.segmentLength * c) + params.segmentLength / 2, (2*params.margin + params.segmentHeight) * r+ params.segmentHeight / 1.2));
        up.justification = 'right';
        up.fillColor = 'black';
        up.content = `${Math.round(elevation[`${k}`].up)} m ➚`;
        up.sendToBack();
        elevation[`${k}`].upText = up;

        let down = new paper.PointText(new paper.Point(20 + params.margin + (params.segmentLength * c) + params.segmentLength / 2, 10 + (2*params.margin + params.segmentHeight ) * r+ params.segmentHeight / 1.2));
        down.justification = 'right';
        down.fillColor = 'black';
        down.content = `${Math.round(elevation[`${k}`].down)} m ➘`;
        down.sendToBack();
        elevation[`${k}`].downText = down;
    } else if (elevation[`${k}`] && elevation[`${k}`].upText) {
        elevation[`${k}`].downText.visible = true;
        elevation[`${k}`].upText.visible = true;
    }
}

function drawDefaultPaceLine(paper, params, r) {
    let segments = getSegmentsForRow(params, r);

    for (let i = 0; i < segments; i++) {
        var myCircle = new paper.Path.Circle({
            radius: 4,
            center: new paper.Point(
                params.margin + params.segmentLength / 2 + params.segmentLength * i, 
                getPaceLine(params, params.pace) + (params.margin * 2 + params.segmentHeight) * r),
                onMouseDrag: function(event) {
                    let s = boxes[row(r)][i].column;
                    doTheThing(event, params, boxes[row(r)][s]);
                },
                onMouseEnter: function(event) {
                    document.getElementById('myCanvas').style.setProperty('cursor', 'pointer');

                    highlightBox(boxes[row(r)][i]);
                }
        });
        myCircle.fillColor = '#fc5200';
        myCircle.visible = false;
        circles[row(r)].push(myCircle);

        let text = new paper.PointText(new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * i, params.margin - 5 + (params.margin * 2 + params.segmentHeight) * r));
        text.justification = 'center';
        text.fillColor = 'black';

        if (r === params.rows - 1 && i === segments - 1) {
            text.content = `${params.distance}`;
        } else {
            text.content = `${r * params.maxElementsPerLine + i + 1}`;
        }
        
        allKms[row(r)].push(text);
        

        let pace = new paper.PointText(new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * i, params.margin + params.segmentHeight + 15 + (params.margin * 2 + params.segmentHeight) * r));
        pace.justification = 'center';
        pace.fillColor = 'black';
        pace.content = secondsToLabel(params.pace);
        allPaces[row(r)].push(pace);

        curveSet = false;
    }
}

function enableHighlightingAndDragging(element, r, c, params) {
    element.onMouseDrag = function(event) {
        doTheThing(event, params, boxes[row(r)][c]);
    };
    element.onMouseEnter = function(event) {
        highlightBox(boxes[row(r)][c]);
    }
}


function getActiveSegment(position, params) {
    return Math.floor((position.x - params.margin) / params.segmentLength);
}

function getNicerCurve1(a, b) {
    var rc =  new paper.Rectangle(a, b);

    var h1 = new paper.Point(rc.topCenter.x - a.x, rc.topCenter.y - a.y);
    var h2 = new paper.Point(rc.bottomCenter.x - b.x, rc.bottomCenter.y - b.y);

    var r1seg = new paper.Segment(
        a,
        null,
        h1
        );

    var r2seg = new paper.Segment(
        b, 
        h2,
        null, 
        );

    let path3 = new paper.Path(r1seg, r2seg);
    path3.strokeColor = '#fc5200';

    return path3;
}

function getNicerCurve2(a, b) {
    var rc =  new paper.Rectangle(a, b);
    var h1 = new paper.Point(rc.topCenter.x - b.x, rc.topCenter.y - b.y);
    var h2 = new paper.Point(rc.bottomCenter.x - a.x, rc.bottomCenter.y - a.y);

    var r1seg = new paper.Segment(
        a,
        null,
        h2
        );

    var r2seg = new paper.Segment(
        b, 
        h1,
        null, 
        );

    let path3 = new paper.Path(r1seg, r2seg);
    path3.strokeColor = '#fc5200';

    return path3;
}

function display(paper) {
    paper.view.draw();
}

function paceFromLabel(pace) {
    let components = pace.split(':');

    result = parseInt(components[0]) * 60 + parseInt(components[1]);
    return result;
}