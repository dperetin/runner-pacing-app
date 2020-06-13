let boxes = [];
let allPaces = [];
let allKms = [];
let averagePace;
let currentPaceLine;
let circles = [];
let curves = [];

let scopes = []

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

let supportedDistances = {
    "10k": 10,
    "6k": 6,
    "5k": 5,
    "4k": 4,
    "3k": 3,
    "2k": 2
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

    distanceElement.onchange = function() {
        renderPacePlanningWidget();

        setTime(getSelectedPace(), getDistance());
        renderPacePlanningWidget();
    }

    renderPacePlanningWidget();
};

function onPaceChange() {
    setTime(getSelectedPace(), getDistance());
    renderPacePlanningWidget();
}

function onTimeChange() {
    setPace(getSelectedTime(), getDistance());
    renderPacePlanningWidget();
}

function setTime(pace, distance) {
    let time = pace * distance;

    let h = Math.floor(time / (60 * 60));
    timeHoursElement.value = h;

    let m = Math.floor((time - h * 60 * 60) / (60));
    timeMinutesElement.value = m;

    let s = time % (60);
    timeSecondsElement.value = s;
}

function setExactTime(time) {
    let h = Math.floor(time / (60 * 60));
    timeHoursElement.value = h;

    let m = Math.floor((time - h * 60 * 60) / (60));
    timeMinutesElement.value = m;

    let s = time % (60);
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

    return supportedDistances[distanceElement.options[distanceElement.selectedIndex].innerText];
}

main();

function renderPacePlanningWidget() {
    let availableWidth = document.querySelector("#canvas-holder").clientWidth;

    let selectedDistance = getDistance();

    this.console.log(`Height: ${window.screen.availHeight}`);
    this.console.log(`Width: ${window.screen.availWidth}`);
    this.console.log(`devicePixelRatio: ${window.devicePixelRatio}`);

    let margin = 30;

    let segmentWidth = (availableWidth - 2 * margin) / selectedDistance > 140 ? 140 : (availableWidth - 2 * margin) / selectedDistance;

    const params = {
        segments: selectedDistance,
        segmentLength: segmentWidth,
        segmentHeight: segmentWidth * 1.5,
        margin: margin,
        pace: getSelectedPace(),
        fastestPace: getSelectedPace() - 60,
        slowestPace: getSelectedPace() + 90,
        distance: selectedDistance,
        scalingFactor: 1
    }

    createPacePlanningWidget(params);
}

function clearCanvas(paper) {
    if (paper.project) {
        paper.project.activeLayer.removeChildren();
    }   

    boxes = [];
    allPaces = [];
    allKms = [];
    averagePace;
    currentPaceLine;
    circles = [];
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

    let paper = init(params);

    drawMainRectangle(paper, params);
    drawPerSegmentRectangle(paper, params);

    let averagePace = drawPaceLabel(paper, params);
    drawDefaultPaceLine(paper, params, averagePace);

    display(paper);
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
    canvas.setAttribute('height', params.segmentHeight + 2 * params.margin);
    // Create an empty project and a view for the canvas:

    let scope  = new paper.PaperScope;
    scope.setup(canvas);
    scope.activate();

    scopes.push(scope);

    return scope;
}

function drawMainRectangle(paper, params) {
    let topLeft = new paper.Point(params.margin, params.margin);
    let rectSize = new paper.Size(params.segmentLength * params.segments, params.segmentHeight);
    let rect = new paper.Rectangle(topLeft, rectSize);

    let path = new paper.Path.Rectangle(rect);
    path.fillColor = '#ffffff';
    path.strokeColor = '#000000';
    path.selected = false;
    path.strokeWidth = params.scalingFactor;
}

function drawPerSegmentRectangle(paper, params) {
    for (let i = 0; i < params.segments; i++) {
        let topLeft = new paper.Point(params.margin + i * params.segmentLength, params.margin);
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

        boxes.push(path);
    }
}

function drawPaceLabel(paper, params) {
    let text = new paper.PointText(new paper.Point((params.segmentLength * params.segments + params.margin * 2) / 2, params.margin - 15));
    text.justification = 'center';
    text.fillColor = 'black';
    text.content = 'KM';
    text.fontWeight = 'bold';

    let pace = new paper.PointText(new paper.Point(30, params.margin - 15));
    pace.justification = 'center';
    pace.fillColor = 'black';
    pace.content = 'PACE';
    pace.fontWeight = 'bold';

    let fastestPace = new paper.PointText(new paper.Point(0, params.margin + 5));
    fastestPace.justification = 'left';
    fastestPace.fillColor = 'black';
    fastestPace.content = secondsToLabel(params.fastestPace);

    let slowestPace = new paper.PointText(new paper.Point(0, params.margin + params.segmentHeight + 5));
    slowestPace.justification = 'left';
    slowestPace.fillColor = 'black';
    slowestPace.content = secondsToLabel(params.slowestPace);

    averagePace = new paper.PointText(new paper.Point(16 + params.margin + params.segments * params.segmentLength, getPaceLine(params, params.pace) + 5));
    averagePace.justification = 'center';
    averagePace.fillColor = '#fc5200';
    averagePace.content = secondsToLabel(params.pace);
    averagePace.fontWeight = 'bold';

    let targetPace = new paper.PointText(new paper.Point(0, getPaceLine(params, params.pace) + 5));
    targetPace.justification = 'left';
    targetPace.fillColor = 'black';
    targetPace.content = secondsToLabel(params.pace);
    targetPace.fontWeight = 'bold';

    let targetPaceLine = new paper.Path();
    targetPaceLine.strokeColor = 'black';
    let start = new paper.Point(params.margin, getPaceLine(params, params.pace));
    targetPaceLine.moveTo(start);
    targetPaceLine.lineTo(start.add([params.segmentLength * params.segments, 0]));
    targetPaceLine.opacity = 0.4;

    currentPaceLine = new paper.Path();
    currentPaceLine.strokeColor = '#fc5200';
    let start2 = new paper.Point(params.margin, getPaceLine(params, params.pace));
    currentPaceLine.moveTo(start2);
    currentPaceLine.lineTo(start2.add([params.segmentLength * params.segments, 0]));
    currentPaceLine.opacity = 0.4;

    return averagePace;
}

function getPaceLine(params, pace) {
    return params.margin + params.segmentHeight * (1 - (params.slowestPace - pace) / (params.slowestPace - params.fastestPace));
}

function drawDefaultPaceLine(paper, params, averagePace) {
    

    for (let i = 0; i < params.segments; i++) {

        var myCircle = new paper.Path.Circle({
            radius: 4,
            center: new paper.Point(
                params.margin + params.segmentLength / 2 + params.segmentLength * i, 
                getPaceLine(params, params.pace)),
                onMouseEnter: function() {
                    document.getElementById('myCanvas').style.setProperty('cursor', 'pointer');
                }
        });
        myCircle.fillColor = '#fc5200';
        myCircle.visible = false;
        circles.push(myCircle);


        

        let text = new paper.PointText(new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * i, params.margin - 5));
        text.justification = 'center';
        text.fillColor = 'black';
        text.content = `${i + 1}`;
        allKms.push(text);
        

        let pace = new paper.PointText(new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * i, params.margin + params.segmentHeight + 15));
        pace.justification = 'center';
        pace.fillColor = 'black';
        pace.content = secondsToLabel(params.pace);
        allPaces.push(pace);

        var tool = new paper.Tool();

        curveSet = false;

        tool.onMouseMove = function(event) {

            activateTool(paper, event.point, params);

            let s = getActiveSegment(event.point, params);

            for (let i = 0; i < boxes.length; i++) {
                boxes[i].fillColor = '#fff';
                allPaces[i].fillColor = 'black';
                allKms[i].fillColor = 'black';
                circles[i].visible = false;
            }

            if (boxes[s]) {
                boxes[s].fillColor = '#f7f7fa';
            }

            if (allPaces[s]) {
                allPaces[s].fillColor = '#fc5200';
            }
            

            if (allKms[s]) {
                allKms[s].fillColor = '#fc5200';
            }

            if (circles[s]) {
                circles[s].visible = true;
            }
            
            
        }

        let doTheThing = function doTheThing(event) {
            if (event.point.x < params.margin
                || event.point.x > params.margin + params.segmentLength * params.segments
                || event.point.y < params.margin 
                || event.point.y > params.margin + params.segmentHeight) {
                    curveSet = false;
                    return;
            } else if (curveSet) {
                return;
            }
        
            let s = getActiveSegment(event.point, params);

            if (s > params.segments - 1) {
                return;
            }

            for (let i = 0; i < boxes.length; i++) {
                boxes[i].fillColor = '#fff';
                allPaces[i].fillColor = 'black';
                allKms[i].fillColor = 'black';
                circles[i].visible = false;
            }

            if (boxes[s]) {
                boxes[s].fillColor = '#f7f7fa';
            }

            if (allPaces[s]) {
                allPaces[s].fillColor = '#fc5200';
            }
            

            if (allKms[s]) {
                allKms[s].fillColor = '#fc5200';
            }

            if (circles[s]) {
                circles[s].visible = true;
            }

            if (curves[s] && curves[s].p1) {
                curves[s].p1.remove();
                curves[s].p2.remove();
            } else {
                curves[s] = {
                    "p1": undefined,
                    "p2": undefined,
                }
            }
        
            if (event.point.y < getPaceLine(params, params.pace)) {
                curves[s].p1 = getNicerCurve1(
                    new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y), 
                    new paper.Point(params.margin + params.segmentLength + params.segmentLength * s, getPaceLine(params, params.pace)));
                curves[s].p2 = getNicerCurve2(
                    new paper.Point(params.margin + params.segmentLength * s, getPaceLine(params, params.pace)), 
                    new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y));
            } else {
                curves[s].p1 = getNicerCurve2(
                    new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y), 
                    new paper.Point(params.margin + params.segmentLength + params.segmentLength * s, getPaceLine(params, params.pace)));
                curves[s].p2 = getNicerCurve1(
                    new paper.Point(params.margin + params.segmentLength * s, getPaceLine(params, params.pace)), 
                    new paper.Point(params.margin + params.segmentLength / 2 + params.segmentLength * s, event.point.y));
            }
        
            allPaces[s].content = secondsToLabel(parseInt(params.fastestPace + (params.slowestPace - params.fastestPace) * ((event.point.y - params.margin) / (params.segmentHeight))));
        
            let overallTotalTime = 0;
        
            for(let i = 0; i < allPaces.length; i++) {
                overallTotalTime += paceFromLabel(allPaces[i].content);
            }
        
            let overallAveragePace = parseFloat(overallTotalTime / params.distance);
        
            
        
            averagePace.remove();
            currentPaceLine.remove();
        
            averagePace = new paper.PointText(new paper.Point(16 + params.margin + params.segments * params.segmentLength, getPaceLine(params, overallAveragePace) + 5));
            averagePace.justification = 'center';
            averagePace.fillColor = '#fc5200';
            averagePace.content = secondsToLabel(params.pace);
            averagePace.fontWeight = 'bold';
        
            averagePace.content = secondsToLabel(overallAveragePace);
        
            currentPaceLine = new paper.Path();
            currentPaceLine.strokeColor = '#fc5200';
            let start2 = new paper.Point(params.margin, getPaceLine(params, overallAveragePace));
            currentPaceLine.moveTo(start2);
            currentPaceLine.lineTo(start2.add([params.segmentLength * params.segments, 0]));
            currentPaceLine.opacity = 0.4;
        
            
            let activeCircle = circles[s];
            activeCircle.position = new paper.Point(activeCircle.position.x, event.point.y);

            setExactTime(overallTotalTime);
            setPace(getSelectedTime(), getDistance());
            
        }
        

        tool.onMouseDrag = function(event) {
            doTheThing(event);
        }

        tool.onMouseDown = function(event) {
            activateTool(paper, event.point, params);

            let s = getActiveSegment(event.point, params);

            for (let i = 0; i < boxes.length; i++) {
                boxes[i].fillColor = '#fff';
                allPaces[i].fillColor = 'black';
                allKms[i].fillColor = 'black';
                circles[i].visible = false;
            }

            if (boxes[s]) {
                boxes[s].fillColor = '#f7f7fa';
            }

            if (allPaces[s]) {
                allPaces[s].fillColor = '#fc5200';
            }
            

            if (allKms[s]) {
                allKms[s].fillColor = '#fc5200';
            }

            if (circles[s]) {
                circles[s].visible = true;
            }

            doTheThing(event);
        }
    }
}


function getActiveSegment(position, params) {
    return Math.floor((position.x - params.margin) / params.segmentLength);
}

function activateTool(paper, position, params) {
    y = getActiveSegment(position, params);

    if (paper.tools[y]) {
        paper.tools[y].activate();
    }
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
    // Draw the view now:
    paper.view.draw();
}

function paceFromLabel(pace) {
    let components = pace.split(':');

    result = parseInt(components[0]) * 60 + parseInt(components[1]);
    return result;
}


// fc5200