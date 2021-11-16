/* INITIAL DEFIFNITIONS */
/* HTML-Element vars */
const exist_btn = document.getElementById("useExisting_btn");
const scrib_btn = document.getElementById("insScribing_btn");
const shape_btn = document.getElementById("insShape_btn");
const free_btn = document.getElementById("drwFreehand_btn");
const freeok_btn = document.getElementById("freeOk_btn");
const freecancel_btn = document.getElementById("freeCancel_btn");
const exist_pop = document.getElementById("insExisting_pop");
const existok_btn = document.getElementById("existOk_btn");
const existcancel_btn = document.getElementById("existCancel_btn");
const scrib_pop = document.getElementById("insScribing_pop");
const shape_pop = document.getElementById("insShape_pop");
const shapeok_btn = document.getElementById("shapeOk_btn");
const shapecancel_btn = document.getElementById("shapeCancel_btn");
const savepublic_radio = document.getElementById("savepublic_radio");
const saveprivate_radio = document.getElementById("saveprivate_radio");
const dontsave_radio = document.getElementById("dontsave_radio");
const designname_input = document.getElementById("designName_input");
const designname_warning = document.getElementById("designName_warning");
const save_options = document.getElementsByName("saveoptions");
const submit_btn = document.getElementById("sbmtDrawing_btn");
const cvs_elem = document.getElementById("drawing_cvs");

/* Other vars */
const ctx = cvs_elem.getContext('2d');

let global = {
    'elements': JSON.parse(sessionStorage.getItem('elements')) || [],
    'cvsOffset': undefined,
    'posOnCvs': undefined,
    'posOnElem': undefined,
    'focusedEl': undefined,
    'drawnEl': undefined,
    'freehand': false,
    'prevPosOnCvs': undefined,
    'touchHasNotMoved': undefined,
}


/* Class */
class pathElement {
  constructor(path=[[[0, 0]]], origin={'x': cvs_elem.width/2, 'y': cvs_elem.height/2}, rotation=0, scale=1) {
    this.path = path; //path is an array: [  [[x, y], [x, y], [x, y]], [[x, y], [x, y], [x, y]]  ]
    this.origin = origin; //position of the element´s origin
    this.rotation = rotation;
    this.scale = scale;
    
    this.min = {'x': Infinity, 'y': Infinity}
    this.max = {'x': -Infinity, 'y': -Infinity}
    //find min and max at initialization
    for (let partpath of this.path) { //partpaths
        for (let point of partpath) { //points

            if (point[0] < this.min.x) {
                this.min.x = point[0];
            }
            if (point[1] < this.min.y) {
                this.min.y = point[1];
            }
            if (point[0] > this.max.x) {
                this.max.x = point[0];
            }
            if (point[1] > this.max.y) {
                this.max.y = point[1];
            }
        }
    }


    // rearrange path points to relate to the origin
    let orig_diff = {'x': (this.max.x + this.min.x) / 2, 'y': (this.max.y + this.min.y) / 2};
    //translate min and max points
    this.min.x -= orig_diff.x;
    this.min.y -= orig_diff.y;
    this.max.x -= orig_diff.x;
    this.max.y -= orig_diff.y;


    //translate path points
    for (let partpath of this.path) { //partpaths
        for (let point of partpath) { //points
            point[0] -= orig_diff.x;
            point[1] -= orig_diff.y;
        }
    }
}
}// syntax for adding a new element to the elements list: global.elements.push(new pathElement(path, ))

/* Functions */
//click event handler
//EXISTING
const useExisting = () => {
    exist_pop.classList.remove("hidden");
}
const okExisting = () => {
    //save current elements list in session storage

    sessionStorage.setItem('elements', JSON.stringify(global.elements));
    console.log(JSON.parse(sessionStorage.getItem('elements')));
    /*//request gallery from the server
    fetch('http://192.168.2.111:8000/gallery/designs/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie('csrftoken'),
            'ContentType': 'application/json'},
        body: JSON.stringify({'shapeName': activeShapes[0].getAttribute("id")}), //send the shapename to the server
    })
    .then(response => response.json())
    .then(pathData => {
        global.elements.push(new pathElement(pathData.path));
        global.focusedEl = global.elements[global.elements.length - 1]
        redraw_canvas();
    }); //add recieved path to elements*/

    exist_pop.classList.add("hidden");
}
const cancelExisting = () => {
    exist_pop.classList.add("hidden");
}
//SCRIBING
const insScribing = () => {
}

//SHAPES
const insShape = () => {
    shape_pop.classList.remove("hidden");
}
const selectShape = (evt) => {
    //remove focused-card class from all Choices (usually the one that was clicked beforehand)
    let activeChoices = document.getElementsByClassName("focused-card");
    while (activeChoices[0]) {
        activeChoices[0].classList.remove("focused-card");
    }
    //add focused-card class to clicked el
    evt.currentTarget.classList.add("focused-card");
}
const okShape = () => {
    //get the active shape (first element of list)
    activeShapes = document.getElementsByClassName("focused-card");
    //request the shape from the server
    fetch('http://192.168.2.113:8000/draw/shapes/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie('csrftoken'),
            'ContentType': 'application/json'},
        body: JSON.stringify({'shapeName': activeShapes[0].getAttribute("id")}), //send the shapename to the server
    })
    .then(response => response.json())
    .then(pathData => {
        global.elements.push(new pathElement(pathData.path));
        global.focusedEl = global.elements[global.elements.length - 1]
        redraw_canvas();
    }); //add recieved path to elements

    shape_pop.classList.add("hidden");

}
const cancelShape = () => {
    shape_pop.classList.add("hidden");
}

//FREEHAND
const drwFreehand = () => {
    //replace draw button with cancel and ok
    free_btn.classList.add("hidden");
    freeok_btn.classList.remove("hidden");
    freecancel_btn.classList.remove("hidden");

    //start a freehand drawing
    global.freehand = true;
    global.focusedEl = undefined;
    redraw_canvas();
}
const okFreehand = () => {
    //replace cancel and ok with draw button
    free_btn.classList.remove("hidden");
    freeok_btn.classList.add("hidden");
    freecancel_btn.classList.add("hidden");
    
    //if drawing has paths with only one point !!!!!!!!!!!!!!!!!!!!!!!!!
    for (let partpath of global.drawnEl.path) {
        if (partpath.length == 1) {
            partpath.push(partpath[0]) //duplicate the single point
        }
    }
    //finish freehand drawing
    alert()
    global.focusedEl = global.drawnEl;
    global.drawnEl = undefined;
    global.freehand = false;
    redraw_canvas();
}
const cancelFreehand = () => {
    //replace cancel and ok with draw button
    free_btn.classList.remove("hidden");
    freeok_btn.classList.add("hidden");
    freecancel_btn.classList.add("hidden");

    //delete freehand drawing
    global.elements.splice(global.elements.indexOf(global.drawnEl), 1);
    global.drawnEl = undefined;
    global.freehand = false;
    redraw_canvas();

}

//RADIOS
const switchNameInput = (evt) => {
    if (evt.currentTarget.id == "dontsave_radio") {
        designname_input.classList.add("hidden");
        designname_warning.classList.add("hidden");

    } else {
        designname_input.classList.remove("hidden");
        designname_warning.classList.remove("hidden");
    }
}
//NAME_INPUT
const getNameWarning = (evt, all_names) => {
    if (designname_input.value.length < 4) {
        designname_warning.innerHTML = "Name must have at least 4 letters!";
    } else if (designname_input.value.includes(' ')) {
        designname_warning.innerHTML = "Name must not contain whitespaces!";
    } else if (all_names.indexOf(designname_input.value)>-1) {
        console.log(all_names.indexOf(designname_input.value));
        designname_warning.innerHTML = "This name already exists!";
    } else {
        designname_warning.innerHTML = "";
    }

}
//SUBMIT
const sbmtDrawing = () => {
    let submitValid = true;
    let save;
    for (let i of save_options) {
        if (i.checked) {
            save = i.value;
        }
    }
    let name;
    if (save == 'saveprivate' || save == 'savepublic') {
        if (designname_warning.innerHTML == "") {
            name = designname_input.value;
        } else {
            submitValid = false;
        }
    } else {
        name = null;
    }
    alert()
    if (submitValid) {
        fetch("http://192.168.2.113:8000/draw/submit/",
            {method : "POST",
            headers : {
                "X-CSRFToken": getCookie('csrftoken'),
                "ContentType" : "application/json"},
            body : JSON.stringify({
                "name": name,
                "elements": {"elements": global.elements},
                "save": save

                })
            }
        )
        //.then(response => response.json())
        //.then(data => console.log(data));
    } else {
        designname_input.focus()
    }
}

//click event listener
exist_btn.addEventListener('click', useExisting, false);
existok_btn.addEventListener('click', okExisting, false);
existcancel_btn.addEventListener('click', cancelExisting, false);
scrib_btn.addEventListener('click', insScribing, false);
shape_btn.addEventListener('click', insShape, false);
shapeok_btn.addEventListener('click', okShape, false);
shapecancel_btn.addEventListener('click', cancelShape, false);
free_btn.addEventListener('click', drwFreehand, false);
freeok_btn.addEventListener('click', okFreehand, false);
freecancel_btn.addEventListener('click', cancelFreehand, false);
submit_btn.addEventListener('click', sbmtDrawing, false);


//touch event handler
const Tstart = (evt) => {
    evt.preventDefault();
    let touches = evt.changedTouches;

    let cvsRect = cvs_elem.getBoundingClientRect();
    let bodyRect = document.body.getBoundingClientRect();
    global.cvsOffset = {'left': cvsRect.left - bodyRect.left + 8, 'top': cvsRect.top - bodyRect.top + 8}; //8 is body margin

    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};

    //if freehand add a new partpath
    if (global.freehand == true) {
        if (global.drawnEl == undefined) { //detect the start of freehand drawing
            global.elements.push(new pathElement(undefined, {'x': global.posOnCvs.x, 'y': global.posOnCvs.y})); //add new element
            global.drawnEl = global.elements[global.elements.length - 1]; //let drawnEl be the added element
        }

        global.drawnEl.path.push([]); //add new, empty path
        addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl)); //add first point to the partpath
    } else { // a transforming touch: either click or move
        global.touchHasNotMoved = true; //needed for detecting a click later

        //needed for a possible touchmove after touchstart: find the action to perform when touch moves
        if (global.focusedEl != undefined) { //one element is focused
            let rsButtonCenter = getPointOnCvs(global.focusedEl.max, global.focusedEl);
            console.log('rs btn:', rsButtonCenter);
            console.log('touchpos:', global.posOnCvs);
            if (pointIsOnArea(global.posOnCvs, rsButtonCenter, 10, 10)) { //touchstart is on the rotscale button of the focused element
                global.touchMoveAction = 'rotscale';
            } else if (pointIsOnArea(getPointOnEl(global.posOnCvs, global.focusedEl), {'x': 0, 'y': 0}, global.focusedEl.max.x + 10, global.focusedEl.max.y + 10)) { //touchstart is on the focused element
                global.touchMoveAction = 'pan';
            } else { //touchstart is not on the focused element
                global.touchMoveAction = undefined; //OhOh...DRY
            }
        } else { //no focused element
            global.touchMoveAction = undefined; //OhOh...DRY
        }

        global.prevPosOnCvs = {'x': global.posOnCvs.x, 'y': global.posOnCvs.y}; //needed for calculating moved distances later
    }
}

const Tmove = (evt) => {
    evt.preventDefault();
    let touches = evt.changedTouches;
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};
    console.log(global.posOnCvs);
    console.log(parseInt(window.getComputedStyle(cvs_elem).width));

    if (global.freehand == true) {
        addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl));
    } else { //touch is transforming, has been moved -> touch is a movement: either pan or rotscale
        if (global.touchHasNotMoved) { //if is better than every time assigning false to the var
            global.touchHasNotMoved = false; //touch has moved
        }
        //THE HARD PART...lets see
        if (global.touchMoveAction == 'pan') {
            //move the origin of focusedEl the same way the touch position has moved
            global.focusedEl.origin.x += global.posOnCvs.x - global.prevPosOnCvs.x;
            global.focusedEl.origin.y += global.posOnCvs.y - global.prevPosOnCvs.y;

        }
        if (global.touchMoveAction == 'rotscale') {
            //do the scaling
            let centerToTouchHyp = Math.sqrt(Math.pow(global.posOnCvs.x - global.focusedEl.origin.x, 2) + Math.pow(global.posOnCvs.y - global.focusedEl.origin.y, 2));
            let centerToMaxHyp = Math.sqrt(Math.pow(global.focusedEl.max.x, 2) + Math.pow(global.focusedEl.max.y, 2));
            global.focusedEl.scale = centerToTouchHyp / centerToMaxHyp;

            //do the rotation
            let angleOfMaxCorner = Math.atan2(global.focusedEl.max.y, global.focusedEl.max.x) * 180/Math.PI;
            global.focusedEl.rotation = -angleOfMaxCorner + Math.atan2(global.posOnCvs.y - global.focusedEl.origin.y, global.posOnCvs.x - global.focusedEl.origin.x)*180/Math.PI;
        }

        global.prevPosOnCvs = {'x': global.posOnCvs.x, 'y': global.posOnCvs.y};
    }

    redraw_canvas();
}

const Tend = (evt) => {
    evt.preventDefault();
    let touches = evt.changedTouches;
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};

    let XOnButton;
    let YOnButton;

    if (global.freehand == true) {/* dont do anything when freehand touch ends */}
    else if (global.touchHasNotMoved) { // touch is transforming, hasn't been moved -> touch is a click
        //-->if element was clicked make it focused, if delete button on focused element was clicked remove it from global.elements

        let delBtnClicked;
        if (global.focusedEl != undefined) {
            let delButtonCenter = getPointOnCvs(global.focusedEl.min, global.focusedEl);
            delBtnClicked = pointIsOnArea(global.posOnCvs, delButtonCenter, 10, 10);
        } else {
            delBtnClicked = false;
        }

        if (delBtnClicked) {//check if del button of focused element is clicked

            global.elements.splice(global.elements.indexOf(global.focusedEl), 1);
            global.focusedEl = undefined;
        } else {//find the closet element to the touchpoint
            let closestEl = {
                'element': undefined,
                'distance': Infinity
            }
            for (let el of global.elements) {
                console.log(getPointOnEl(global.posOnCvs, el));
                let touchOnEl = getPointOnEl(global.posOnCvs, el);
                for (let partpath of el.path) {
                    for (let point of partpath) {

                        let distance = Math.sqrt(Math.pow(point[0]*el.scale - touchOnEl.x*el.scale, 2) + Math.pow(point[1]*el.scale - touchOnEl.y*el.scale, 2));/* abstand zwischen point und touch */
                        console.log('distance',distance);
                        if (distance < closestEl.distance) {
                            closestEl.element = el;
                            closestEl.distance = distance;

                        }
                    }
                }
            }

            if (closestEl.distance < 30) {
                global.focusedEl = closestEl.element;

            } else {
                global.focusedEl = undefined;
            }
        }
    }
    redraw_canvas();
}


const Tcancel = (evt) => {
    evt.preventDefault();
    let touches = evt.changedTouches;
}





//touch event listener
cvs_elem.addEventListener('touchstart', Tstart, false);
cvs_elem.addEventListener('touchend', Tend, false);
cvs_elem.addEventListener('touchcancel', Tcancel, false);
cvs_elem.addEventListener('touchmove', Tmove, false);

/* helper functions */
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const addPathElement = (path) => {
     global.elements.push(new pathElement(path));
}

const pointIsOnArea = (point, areaCenter, Xradius, Yradius/*, scale=1, rotation=0*/) => { //point and area center must be in the same coordinate system
    //let rotatedPoint = {'x': point.x*Math.cos(-rotation*Math.PI/180) - point.y*Math.sin(-rotation*Math.PI/180), 'y': point.x*Math.sin(-rotation*Math.PI/180) + point.y*Math.cos(-rotation*Math.PI/180)}
    let XOnArea = point/*rotatedPoint*/.x < areaCenter.x + Xradius && point/*rotatedPoint*/.x > areaCenter.x - Xradius;
    let YOnArea = point/*rotatedPoint*/.y < areaCenter.y + Yradius && point/*rotatedPoint*/.y > areaCenter.y - Yradius;

    return XOnArea && YOnArea;
}

const addPointToFreehand = (pointOnEl) => {
        global.drawnEl.path[global.drawnEl.path.length - 1].push([pointOnEl.x, pointOnEl.y]); //push the point to the last partpath of drawnEl

        if (pointOnEl.x < global.drawnEl.min.x) {
            global.drawnEl.min.x = pointOnEl.x;
        }
        if (pointOnEl.y < global.drawnEl.min.y) {
            global.drawnEl.min.y = pointOnEl.y;
        }
        if (pointOnEl.x > global.drawnEl.max.x) {
            global.drawnEl.max.x = pointOnEl.x;
        }
        if (pointOnEl.y > global.drawnEl.max.y) {
            global.drawnEl.max.y = pointOnEl.y;
        }

        let orig_diff = {'x': (global.drawnEl.max.x + global.drawnEl.min.x) / 2, 'y': (global.drawnEl.max.y + global.drawnEl.min.y) / 2};

        for (let partpath of global.drawnEl.path) {
            for (let point of partpath) {
                point[0] -= orig_diff.x;
                point[1] -= orig_diff.y;
            }
        }
        global.drawnEl.min.x -= orig_diff.x;
        global.drawnEl.min.y -= orig_diff.y;
        global.drawnEl.max.x -= orig_diff.x;
        global.drawnEl.max.y -= orig_diff.y;


        global.drawnEl.origin.x += orig_diff.x;
        global.drawnEl.origin.y += orig_diff.y;
}
const getPointOnCvs = (pointOnEl, element) => {
    // s...scaled; r...rotated; t...translated
    let xs = pointOnEl.x * element.scale;
    let ys = pointOnEl.y * element.scale;

    let xsr = xs*Math.cos(element.rotation*Math.PI/180) - ys*Math.sin(element.rotation*Math.PI/180);
    let ysr = xs*Math.sin(element.rotation*Math.PI/180) + ys*Math.cos(element.rotation*Math.PI/180);

    let xsrt = xsr + element.origin.x;
    let ysrt = ysr + element.origin.y;
    return {'x': xsrt, 'y': ysrt};
}

const getPointOnEl = (pointOnCvs, element) => {
    let xt = pointOnCvs.x - element.origin.x;
    let yt = pointOnCvs.y - element.origin.y;

    let xtr = xt*Math.cos(-element.rotation*Math.PI/180) - yt*Math.sin(-element.rotation*Math.PI/180);
    let ytr = xt*Math.sin(-element.rotation*Math.PI/180) + yt*Math.cos(-element.rotation*Math.PI/180);

    let xtrs = xtr / element.scale;
    let ytrs = ytr / element.scale;

    return {'x': xtrs, 'y': ytrs};
}

//Function that redraws the canvas
const redraw_canvas = () => {

  //clear draw_canvas
  ctx.clearRect(0, 0, cvs_elem.width, cvs_elem.height);
  //redraw
  for (let el of global.elements) {
    ctx.save();

    //do the transformations
    ctx.translate(el.origin.x, el.origin.y);
    ctx.scale(el.scale, el.scale);
    ctx.rotate(el.rotation*Math.PI/180);

    //Draw the container-rect delete-button and transform-btn if focused
    if (el == global.focusedEl) {
        //container-rect
        ctx.lineWidth = 0.25 / el.scale;
        ctx.strokeRect(el.min.x, el.min.y, el.max.x-el.min.x, el.max.y-el.min.y);

        //delete-circle
        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.fillStyle = "red";
        ctx.arc(el.min.x, el.min.y, 5 / el.scale, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();

        //transform-button circle
        ctx.beginPath();
        ctx.strokeStyle = "gray";
        ctx.fillStyle = "gray";
        ctx.arc(el.max.x, el.max.y, 5 / el.scale, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    // make path settings
    ctx.beginPath();
    ctx.lineCap = 'round'; ///nice trick! makes partpaths with only one point appear as a point on the canvas
    ctx.strokeStyle = "black";
    ctx.lineJoin = 'round';
    if (el == global.drawnEl) {
        ctx.lineWidth = 5 / el.scale;
    } else {
        ctx.lineWidth = 1 / el.scale;
    }

    // draw the path
    for (let partpath of el.path) {
      ctx.moveTo(partpath[0][0], partpath[0][1]);
      for (let point of partpath) {
        ctx.lineTo(point[0], point[1]);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ONLOAD ... solve problem nicer!!!

redraw_canvas()
