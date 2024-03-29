// Erstellt ein Objekt für alle Variablen, die global verwendet werden
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
    'sentCounter': 0,
    'shapes': {},
    'designs': {},
    'words': [],
    'std_line_height': 400,
    'word_lens': [],
    'total_words_len': undefined,
    'word_space_len': 150,
    'half_border_len': undefined,
}


// Definiert die Klasse pathElement als Blueprint für alle Grafikelemente
class pathElement {
    // Für das Erstellen eines p.E. wird benötigt: der Pfad
    // und der Koordinatenursprung zu dem der Pfad relativ ist
    constructor(path=[[[0, 0]]], origin={'x': 500, 'y': 500}, rotation=0, scale=1, smooth=0, translate='path_to_origin') {
        this.path = path; // Struktur des Pfads: [  [[x, y], [x, y], [x, y]], [[x, y], [x, y], [x, y]]  ]
        this.origin = {'x': undefined, 'y': undefined};
        this.rotation = rotation;
        this.scale = scale;
        this.smooth = smooth;

        this.min = {'x': Infinity, 'y': Infinity}
        this.max = {'x': -Infinity, 'y': -Infinity}
        // Sucht äußerste Punkte (min, max) des Pfades in X- und Y-Richtung
        for (let partpath of this.path) {
            for (let point of partpath) {

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

        // Damit eingefügte Formen sofort zentriert dargestellt werden:
        // Berechnet Abstand des Aktuell festgelegten Koordinatenursprungs zum Mittelpunkt der Form
        let orig_diff = {'x': (this.max.x + this.min.x) / 2, 'y': (this.max.y + this.min.y) / 2};


        // Verschiebt Extrempunkte um die Differenz
        this.min.x -= orig_diff.x;
        this.min.y -= orig_diff.y;
        this.max.x -= orig_diff.x;
        this.max.y -= orig_diff.y;

        // Verschiebt Pfadpunkte um die Differenz
        for (let partpath of this.path) {
            for (let point of partpath) {
                point[0] -= orig_diff.x;
                point[1] -= orig_diff.y;
            }
        }

        if (translate == 'origin_to_path') {
            this.origin.x = origin.x + orig_diff.x;
            this.origin.y = origin.y + orig_diff.y;
        } else if (translate == 'path_to_origin') {
            this.origin = origin;
        }


    }
}

// Um ein neues Element zur elements_list hinzuzufügen: global.elements.push(new pathElement(path, origin));


const cancelGeneral = () => {
    // cancel scribe
    document.getElementById("scribe-text-input").value = "";
    document.getElementById("ok").removeAttribute("disabled");

    // cancel shapes
    cards = document.getElementsByClassName("shape-card-cvs");
    for (card of cards) {
        card.dataset.state = "default";
    }

    // cancel gallery
    cards = document.getElementsByClassName("design-card-cvs");
    for (card of cards) {
        card.dataset.state = "default";
        card.nextElementSibling.innerHTML = card.dataset.name;
    }

    // cancel pen
    if (global.drawnEl != undefined){
        // remove last element (which is drawnEl)
        global.elements.pop();
        // no element is drawn now
        global.drawnEl = undefined;
    }

    // cancel focused
    if (global.focusedEl != undefined){
        global.focusedEl = undefined;
        document.getElementById("smoother").dataset.state = "off";
    }

    // draw canvas
    drawCvs("main-cvs", global.elements);
}

// Definiert Funktionen, die bei Buttonclicks ausgeführt werden sollen
const manageOk = () => {
    if (document.getElementById("pointer").checked) {
        let p = createPopup(["FINISH"], ["drawCvs('finish-cvs', global.elements, controls=false); document.getElementById('main-grid').dataset.state='finish_sub';"], ["green"]);
    }
    if (document.getElementById("pen").checked) {
        okPen();
    }
    if (document.getElementById("scribe").checked) {
        okScribe();
    }
    if (document.getElementById("shapes").checked) {
        okShapes();
    }
    if (document.getElementById("gallery").checked) {
        okGallery();
    }
    document.getElementById("pointer").checked = true;
}
const manageCancel = () => {
    if (document.getElementById("pointer").checked) {
        let p = createPopup(["MENU", "CLEAR"], ["window.location.href = window.location.origin + menu_url;", "global.elements = []; sessionStorage.setItem('elements', JSON.stringify(global.elements)); drawCvs('main-cvs', global.elements);"], ["blue", "red"]);
    }
    document.getElementById("pointer").checked = true;
}

// functions used by draw control

const okGallery = () => {
    // Bekommt alle aktiven Formen (normalerweise ist das nur eine oder keine)
    let groupedDesigns = document.querySelectorAll('.design-card-cvs[data-state="grouped"]');
    let originalDesigns = document.querySelectorAll('.design-card-cvs[data-state="original"]');

    for (design of groupedDesigns) {
        let groupedPath = groupElements(JSON.parse(JSON.stringify(global.designs[design.dataset.name])));
        global.elements.push(new pathElement(groupedPath));
    }
    for (design of originalDesigns) {
        let designObject = JSON.parse(JSON.stringify(global.designs[design.dataset.name]));
        for (element of designObject) {
            global.elements.push(new pathElement(element.path, element.origin, element.rotation, element.scale, element.smooth));
        }
    }


    // definiert das letzte zugefügte Element als fokussiertes Element
    global.focusedEl = global.elements[global.elements.length - 1];

    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));

    // Aktualisiert die Zeichenfläche
    drawCvs("main-cvs", global.elements);
}

const toggleDesign = (evt) => {
    if (evt.currentTarget.dataset.state == "default") {
        evt.currentTarget.dataset.state = "grouped";
        evt.currentTarget.nextElementSibling.innerHTML = "GROUPED";
    } else if (evt.currentTarget.dataset.state == "grouped") {
        evt.currentTarget.dataset.state = "original";
        evt.currentTarget.nextElementSibling.innerHTML = "ORIGINAL";
    } else {
        evt.currentTarget.dataset.state = "default";
        evt.currentTarget.nextElementSibling.innerHTML = evt.currentTarget.dataset.name;
    }
}

// update warning
const updateTextWarning = (evt) => {
    let warning = document.getElementById("text-warning");
    // Wenn Leerzeichen enthalten
    const regex = new RegExp('^[a-zA-Z0-9 ]*$');
    // Wenn kein wort
    if (evt.target.value.split(" ").length == 0) {
        warning.innerHTML = " ";
    } else if (!regex.test(evt.target.value)) {
        warning.innerHTML = "Text must not contain special characters!";
    } else {
        warning.innerHTML = "";
    }
}

const generateHandwriting = (evt) => {
    let textInput = document.getElementById("scribe-text-input");
    if (document.getElementById("text-warning").innerHTML == "") {
        fetch(window.location.origin + generate_url, {
            method: 'POST',
            headers: {
                "X-CSRFToken": getCookie('csrftoken'),
                'ContentType': 'application/json'},
            body: JSON.stringify({'words': textInput.value.split(" ")}),
        })
        .then(response => response.json())
        .then(wordsData => {
            // Fügt den erhaltenen Formpfad als neues Element zur elements_list hinzu
            for (word_path of wordsData.words) {
                global.words.push(new pathElement(word_path));
            }

            for (word of global.words) {
                global.word_lens.push(word.max.x - word.min.x);
            }
            global.total_words_len = global.word_lens.reduce((total, current) => {return total + current;}, 0) // produce sum

            let x_rng = document.getElementById("adjust-x-range");

            document.getElementById("left-radio").checked = true;
            //x_rng.value = 50;

            let max_word_len = Math.max(...global.word_lens)
            let max_line_num = global.word_lens.length;
            /*let max_line_num = 1;
            let current_len = 0;
            for (let l of global.word_lens) {
                current_len += l;
                if (current_len > max_word_len) {
                    max_line_num++;
                    current_len = l;
                }
            }*/

            global.half_border_len = document.getElementById("adjust-cvs-placeholder").offsetWidth;
            /*x_rng.min = global.half_border_len / ((global.total_words_len / global.std_line_height) +1) ;
            x_rng.max = global.half_border_len / ((max_word_len / (global.std_line_height * max_line_num)) +1) ;  ;
            */
            // x_canvas = x_words*half_border_len/(y_words + x_words)
            x_rng.min = max_word_len * global.half_border_len / (global.std_line_height * max_line_num + max_word_len) ;
            x_rng.max = global.total_words_len * global.half_border_len / (global.std_line_height + global.total_words_len) ;  ;


            updateAdjustCvs();
            document.getElementById("scribe-overlay").dataset.state = "adjust_sub";
        });
    } else {
        textInput.focus()
    }
}

const updateAdjustCvs = () => {
    console.log("update");
    let adCvs = document.getElementById("adjust-cvs");

    let align = document.querySelector('input[name="align"]:checked').value;

    let adjust_x = document.getElementById("adjust-x-range").value;
    let adjust_y = global.half_border_len - adjust_x;
    adCvs.width = adjust_x;
    adCvs.height = adjust_y;
    adCvs.style.width = adjust_x + "px";
    adCvs.style.height = adjust_y + "px";

    

    // calculate min line number
    //let n_lines = Math.floor(Math.sqrt((global.total_words_len*adCvs.height)/(global.std_line_height*adCvs.width)));
    //n_lines = 1;
    //let fits = false;

    // find the fitting number of lines
    for (let n_lines=1; n_lines<=global.words.length; n_lines++) { // increase line number until it fits
        
        let word_lens = JSON.parse(JSON.stringify(global.word_lens)); // copies array
        let line_height = adCvs.height / n_lines;
        let scale = line_height / global.std_line_height;
        let current_word_idx = 0;
        console.log("lines: "+ n_lines);

        for (let i=0; i<n_lines; i++) { // for each line fill it with words
            console.log("lin: " + i);
            if (current_word_idx == global.words.length) {break;}
            let line_y = global.std_line_height*i + global.std_line_height / 2;
            let line_len = 0;
            let n_words = 0;
            do { // while line isn't full add another word
                console.log("word: " + current_word_idx);
                if (line_len != 0) {  // if its not the first word add a space
                    line_len += global.word_space_len;
                }

                // position and scale current word
                global.words[current_word_idx].scale = scale;

                if (align == "left") {
                    global.words[current_word_idx].origin.x = (line_len + word_lens[0]/2) * scale;
                } else if (align == "right") {
                    global.words[current_word_idx].origin.x = parseFloat(adCvs.width) - word_lens[0]*scale/2;
                    for (let i=1; i<=n_words; i++) {
                        global.words[current_word_idx-i].origin.x -= (word_lens[0]+global.word_space_len)*scale;
                    }
                    // reduce all originx of words of this line by the half width of the current word
                    n_words++;
                } else {
                    global.words[current_word_idx].origin.x = parseFloat(adCvs.width)/2;
                    if (line_len != 0) {
                        global.words[current_word_idx].origin.x += line_len*scale/2;
                    }
                    for (let i=1; i<=n_words; i++) {
                        global.words[current_word_idx-i].origin.x -= (word_lens[0]+global.word_space_len)*scale/2;
                    }
                    // reduce all originx of words of this line by the half width of the current word
                    n_words++;
                }
                global.words[current_word_idx].origin.y = line_y * scale;
                current_word_idx++;

                line_len += word_lens.shift();

            } while (scale * (line_len + word_lens[0] + global.word_space_len) <= adCvs.width)
        }
        if (word_lens.length == 0) {
            //fits = true;
            break;
        }
        //n_lines++;
    }

    drawCvs("adjust-cvs", global.words, controls=false);
}

const okScribe = () => {
    document.getElementById("scribe-overlay").dataset.state = "generate_sub";
    scribing = groupElements(global.words);
    global.elements.push(new pathElement(scribing));
    global.words = [];
    global.word_lens= [];
    global.total_words_len = undefined;
}

const toggleShape = (evt) => {
    if (evt.currentTarget.dataset.state == "default") {
        evt.currentTarget.dataset.state = "selected";
    } else {
        evt.currentTarget.dataset.state = "default";
    }
}

const okShapes = () => {

    // Bekommt alle aktiven Formen (normalerweise ist das nur eine oder keine)
    let selectedShapes = document.querySelectorAll('.shape-card-cvs[data-state="selected"]');
    for (let shape of selectedShapes) {
        global.elements.push(JSON.parse(JSON.stringify(global.shapes[shape.dataset.name][0])));
    }
    // definiert das letzte zugefügte Element als fokussiertes Element
    global.focusedEl = global.elements[global.elements.length - 1];

    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));

    // Aktualisiert die Zeichenfläche
    drawCvs("main-cvs", global.elements);
}

// activate pen function
const startPen = () => {
    // remove focus from any element
    global.focusedEl = undefined;

    drawCvs("main-cvs", global.elements);
}

const okPen = () => {
    // creating a new element from the path to shift the origin to the center
    global.elements.push(new pathElement(global.drawnEl.path, global.drawnEl.origin, undefined, undefined, 1, translate="origin_to_path"));

    // no element is drawn now
    global.drawnEl = undefined;
    // remove old drawn element from the list
    global.elements.splice(-2, 1);
    // focus the newly created element with the drawn elements path
    global.focusedEl = global.elements[global.elements.length - 1];

    drawCvs("main-cvs", global.elements);

    // save elements in browser
    sessionStorage.setItem('elements', JSON.stringify(global.elements));
}

const updateSmoothness = (evt) => {
    global.elements[global.elements.indexOf(global.focusedEl)].smooth = document.getElementById("smooth-range").value;
    drawCvs("main-cvs", global.elements);
}


// Helperfunctions

const createPopup = (buttons, onclicks, colors) => {
    let p = document.createElement("div");
    p.className = "popup-body";
    p.setAttribute('onclick',"event.stopPropagation();event.currentTarget.remove();document.getElementById('popup-cancel').remove();");


    for (let i=0; i<buttons.length; i++) {
        let b = document.createElement("div");
        b.innerHTML = buttons[i];
        b.className = "popup-btn";
        b.setAttribute('onclick', onclicks[i]);
        b.style.backgroundColor = colors[i];
        p.appendChild(b);
    }

    let c = document.createElement("div");
    c.innerHTML = "tap anywhere to cancel";
    c.id = "popup-cancel";

    document.body.appendChild(p);
    document.body.appendChild(c);
    return p;
}

const groupElements = (elements) => {
    let els = JSON.parse(JSON.stringify(elements));
    let groupedPath = [];
    // relates all points to global origin and appends them to the groupedPath
    for (el of els) {
        for (let partpath of el.path) {
            groupedPath.push([]);
            for (let point of partpath) {
                let poc = getPointOnCvs({"x":point[0], "y":point[1]}, el);
                groupedPath[groupedPath.length-1].push([poc.x, poc.y]);
            }
        }
    }
    console.log(groupedPath);
    return groupedPath
}

// update warning
const updateNameWarning = (evt, all_names) => {
    let warning = document.getElementById("name-warning");
    // Wenn sonder/Leerzeichen enthalten
    const regex = new RegExp('^[a-zA-Z0-9]*$');
        // Wenn weniger als 4 Buchstaben lang
    if (evt.target.value.length < 4) {
        warning.innerHTML = "Name must have at least 4 letters!";
    } else if (!regex.test(evt.target.value)) {
        warning.innerHTML = "Name must not contain special characters or whitespaces!";
    // Wenn Name schon vergeben
    } else if (all_names.indexOf(evt.target.value)>-1) {
        warning.innerHTML = "This name already exists!";
    // Wenn Name OK
    } else {
        warning.innerHTML = "";
    }
}

//update title
const updateTitle = (evt) => {
    document.getElementById("draw-title").innerHTML = evt.target.value;
}

const saveNamedDesign = (evt) => {
    let nameInput = document.getElementById('name-input');
    let nameWarning = document.getElementById('name-warning');
    let saveValid = true;
    let name;

    if (nameWarning.innerHTML == "") {
        if (document.getElementById("save-grid").dataset.state == "before") {
            // Übernimmt den Namen aus dem Inputfeld
            name = nameInput.value;
            nameInput.setAttribute("disabled", "disabled");
            // Sendet Name und elements_list an den Server
            fetch(window.location.origin + save_url, {
                method : "POST",
                headers : {
                    "X-CSRFToken": getCookie('csrftoken'),
                    "ContentType" : "application/json"},
                body : JSON.stringify({
                    "name": name,
                    "elements": global.elements,
                    })
                }
            ).then(response => response.json())
            .then(saveData => console.log("saved"));

            evt.currentTarget.dataset.state='after';
        }
    } else {
        nameInput.focus()
    }
}

const downloadNamedDesign = (evt) => {
    evt.currentTarget.dataset.state='after'
    let nameInput = document.getElementById('name-input');
    //download
    // get canvas data
    var image = document.getElementById('finish-cvs').toDataURL();

    // create temporary link
    var tmpLink = document.createElement('a');
    tmpLink.download = nameInput.value + '.png';
    tmpLink.href = image;

    // temporarily add link to body and initiate the download
    document.body.appendChild(tmpLink);
    tmpLink.click();
    document.body.removeChild(tmpLink);
}

// Grafik an den Roboter senden...
const sendDesignToRobot = (evt) => {
    event.currentTarget.dataset.state='after';
    global.sentCounter += 1;
    document.getElementById('sent-count').innerHTML = global.sentCounter + "x";
    // Sendet elements_list an den Server
    fetch(window.location.origin + robodraw_url, {
        method : "POST",
        headers : {
            "X-CSRFToken": getCookie('csrftoken'),
            "ContentType" : "application/json"},
        body : JSON.stringify({
            "elements": {"elements": global.elements}
            })
        }
    ).then(response => response.json())
    .then(saveData => console.log("drawing"))
}

const resetOnLeave = () => {
    global.sentCounter = 0;
    document.getElementById('name-input').removeAttribute("disabled");
}
// Definiert Funktionen, die bei Touchevents ausgeführt werden sollen

// Beim Touch Start...
const Tstart = (evt) => {
    // Verhindert, dass das Touchevent anders als hier definiert Wirkung zeigt (z.B. scrollen)
    evt.preventDefault();

    // Um später feststellen zu können, ob es ein click oder ein move ist
    global.touchHasNotMoved = true;

    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;

    // Ermittelt die X- und Y-Abstände des canvas-Elements zum Rand des Bildschirms
    let cvsRect = evt.currentTarget.getBoundingClientRect();
    global.cvsOffset = {'left': cvsRect.left, 'top': cvsRect.top};

    // Berechnet die Position des Touchs auf dem canvas-Element
    // unter Berücksichtigung von canvas-Offset, CSS-Skalierung und canvas-Breite von 1000 Einheiten
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).height))};

    // Wenn Freihandzeihnen aktiv:
    if (document.getElementById('pen').checked) {
        // Wenn Zeichnung noch nicht begonnen:
        if (global.drawnEl == undefined) {
            // Fügt ein neues Element zur elements_list hinzu
            // ohne Pfad, mit Koordinatenursprung am aktuellen Touch
            global.elements.push(new pathElement(undefined, {'x': global.posOnCvs.x, 'y': global.posOnCvs.y}, 0, 1, 1));
            // Definiert das neu hinzugefügte Element als das, das gerade gezeichnet wird
            global.drawnEl = global.elements[global.elements.length - 1];
        } else {
            // Fügt einen neuen, leeren Teilpfad zum gerade gezeichneten Element hinzu
            global.drawnEl.path.push([]);
            // Fügt die aktuelle Touchposition als ersten Punkt zum Teilpfad hinzu
            addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl));
        }

    // Wenn Freihand nicht aktiv --> der Touch will Elemente Verändern (verschieben, skalieren+rotieren, löschen),
    // kann ein click oder ein move sein
    } else {
        // Wenn es ein move sein sollte, festgelegt sein,
        // was genau der move machen will(verschieben, skalieren, rotieren)

        // Wenn ein Element fokussiert ist:
        if (global.focusedEl != undefined) {

            // Definiert die Position des rotscale-Buttons
            let rsButtonCenter = getPointOnCvs(global.focusedEl.max, global.focusedEl);

            // Wenn der aktuelle Touch auf dem rotscale-Button liegt:
            if (pointIsOnArea(global.posOnCvs, rsButtonCenter, 30, 30)) {
                // Definiert, dass der Touch rotscalen will
                global.touchMoveAction = 'rotscale';
            // Wenn der aktuelle Touch auf dem fokussierten Element liegt:
            } else if (pointIsOnArea(getPointOnEl(global.posOnCvs, global.focusedEl), {'x': 0, 'y': 0}, global.focusedEl.max.x + 10, global.focusedEl.max.y + 10)) {
                // Definiert, dass der Touch verschieben will
                global.touchMoveAction = 'pan';

            } else { //touchstart is not on the focused element
                // Definiert, dass der Touch keine Aktion durchführt
                global.touchMoveAction = undefined;
            }
        // Wenn kein Element fokussiert ist:
        } else {
            // Definiert, dass der Touch keine Aktion durchführt
            global.touchMoveAction = undefined;
        }

        // Definiert für spätere Berechnungen
        // die aktuelle Touchposition als vorherige Touchposition
        global.prevPosOnCvs = {'x': global.posOnCvs.x, 'y': global.posOnCvs.y};
    }
}

const Tmove = (evt) => {
    // Verhindert, dass das Touchevent anders als hier definiert Wirkung zeigt (z.B. scrollen)
    evt.preventDefault();

    // Wenn der Touch vorher noch nich bewegt wurde:
    if (global.touchHasNotMoved) {
        // Definiert, dass der Touch bewegt wurde
        global.touchHasNotMoved = false;
    }

    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;

    // Berechnet die Position des Touchs auf dem canvas-Element
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).height))};

    // Wenn Freihandzeihnen aktiv:
    if (document.getElementById('pen').checked) {
        // Fügt die aktuelle Touchposition als weiteren Punkt zum aktuellen Teilpfad hinzu
        addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl));

    // Wenn Freihand nicht aktiv --> der Touch ist ein move will Elemente Verändern -->(verschieben, skalieren+rotieren)
    } else {
        // Wenn Touch verschieben will:
        if (global.touchMoveAction == 'pan') {
            // Verschiebt den Koordinatenursprung des fokussierten elements genau so,
            // wie der Touch von seiner vorherigen Position bewegt wurde
            global.focusedEl.origin.x += global.posOnCvs.x - global.prevPosOnCvs.x;
            global.focusedEl.origin.y += global.posOnCvs.y - global.prevPosOnCvs.y;

        }
        // Wenn Touch rotscalieren will:
        if (global.touchMoveAction == 'rotscale') {
            // skalieren...
            // berechnet Abstand von Touch zum Koordinatenursprung (im Canvas-koordinatensystem)
            let centerToTouchHyp = Math.sqrt(Math.pow(global.posOnCvs.x - global.focusedEl.origin.x, 2) + Math.pow(global.posOnCvs.y - global.focusedEl.origin.y, 2));
            // berechnet Abstand von Rotscale-Button zum Koordinatenursprung (im Element-koordinatensystem)
            let centerToRotscaleHyp = Math.sqrt(Math.pow(global.focusedEl.max.x, 2) + Math.pow(global.focusedEl.max.y, 2));

            // Berechnet die resultierende Skalierung des Elements
            global.focusedEl.scale = centerToTouchHyp / centerToRotscaleHyp;

            // rotieren...siehe KoL-Arbeit
            let angleOfRotscaleCorner = Math.atan2(global.focusedEl.max.y, global.focusedEl.max.x) * 180/Math.PI;
            global.focusedEl.rotation = -angleOfRotscaleCorner + Math.atan2(global.posOnCvs.y - global.focusedEl.origin.y, global.posOnCvs.x - global.focusedEl.origin.x)*180/Math.PI;
        }

        // Definiert für spätere Berechnungen
        // die aktuelle Touchposition als vorherige Touchposition
        global.prevPosOnCvs = {'x': global.posOnCvs.x, 'y': global.posOnCvs.y};
    }

    // Aktualisiert die Zeichenfläche
    drawCvs("main-cvs", global.elements);
}


const Tend = (evt) => {
    // Verhindert, dass das Touchevent anders als hier definiert Wirkung zeigt (z.B. scrollen)
    evt.preventDefault();

    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;

    // Berechnet die Position des Touchs auf dem canvas-Element
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(evt.currentTarget).height))};

    // Initialisiert Variablen ........................................
    let XOnButton;
    let YOnButton;

    // Wenn Freihandzeihnen aktiv und der Touch endet: Tut garnichts
    if (document.getElementById('pen').checked) {
        if (global.touchHasNotMoved) {
            console.log("touchHasNotMoved");
            let partpath = global.drawnEl.path[global.drawnEl.path.length-1];
            partpath.push(partpath[0]);
        }
    // Wenn der Touch sich nicht bewegt hat, also ein click war:
    } else if (global.touchHasNotMoved) {
        //-->if element was clicked make it focused, if delete button on focused element was clicked remove it from global.elements

        // Initialisiert Variable für ob der Lösch-Button geklickt wurde oder nicht
        let delBtnClicked;

        // Wenn ein Element fokussiert ist, also der Lösch-Button gedrückt werden könnte:
        if (global.focusedEl != undefined) {
            // Berechnet Position des Lösch-Buttons
            let delButtonCenter = getPointOnCvs(global.focusedEl.min, global.focusedEl);
            // Berechnet, ob die Touchposition auf dem Button ist
            delBtnClicked = pointIsOnArea(global.posOnCvs, delButtonCenter, 30, 30);

        // Wenn kein Element fokussiert ist
        } else {
            // Lösch-Button kann nicht geklickt werden
            delBtnClicked = false;
        }

        // Wenn der Lösch-Button geklickt wurde:
        if (delBtnClicked) {
            // Entfernt das fokussierte Element
            global.elements.splice(global.elements.indexOf(global.focusedEl), 1);
            // Definiert kein Element als fokussiert
            global.focusedEl = undefined;

        // Element wurde nicht gelöscht, also könnte ein anderes Element ausgewählt worden sein
        } else {
            // Sucht das nächste Element zur Touchposition...

            // Initialisiert ein Objekt für das nächste Element
            let closestEl = {
                'element': undefined,
                'distance': Infinity
            }

            // Iteriert durch alle Elemente
            for (let el of global.elements) {

                // Berechnet die Position des Touchs auf dem Element
                let touchOnEl = getPointOnEl(global.posOnCvs, el);

                // Iteriert durch alle Teilpfade
                for (let partpath of el.path) {

                    // Initialisiert die Variable für den vorherigen Punkt
                    let prevPoint = partpath[0]

                    // Iteriert durch alle Punkte
                    for (let point of partpath) {

                        // Wenn die Verbindung vom vorherigen zum Aktuellen Punkt vertikal ist:
                        if (prevPoint[0] == point[0]) {
                            // Wenn die Senkrechte zur Strecke vom vorherigen Punkt zum aktuellen Punkt diese Strecke schneidet:
                            if (isBetween(touchOnEl.y, prevPoint[1], point[1])) {
                                // Berechnet Abstand der Touchposition zur Strecke vom vorherigen Punkt zum aktuellen Punkt
                                let distance = Math.abs(point[0] - touchOnEl.x) * el.scale
                                // Entscheidet, ob das aktuelle Element das nächste Element ist
                                if (distance < closestEl.distance) {
                                    closestEl.element = el;
                                    closestEl.distance = distance;

                                }
                            }

                        // Wenn die Verbindung vom vorherigen zum Aktuellen Punkt horizontal ist:
                        } else if (prevPoint[1] == point[1]) {
                            // Wenn die Senkrechte zur Strecke vom vorherigen Punkt zum aktuellen Punkt diese Strecke schneidet:
                            if (isBetween(touchOnEl.x, prevPoint[0], point[0])) {
                                // Berechnet Abstand der Touchposition zur Strecke vom vorherigen Punkt zum aktuellen Punkt
                                let distance = Math.abs(point[1] - touchOnEl.y) * el.scale
                                // Entscheidet, ob das aktuelle Element das nächste Element ist
                                if (distance < closestEl.distance) {
                                    closestEl.element = el;
                                    closestEl.distance = distance;

                                }
                            }

                        // Wenn die Verbindung vom vorherigen zum Aktuellen Punkt nicht vertikal und nicht horizontal ist:
                        } else {
                            // Berechnet Anstieg und yAchsenabschnitt der Gerade durch den vorherigen Punkt und den aktuellen Punkt (m=deltaY/deltaX; n=y-m*x)
                            let m = (prevPoint[1]-point[1])/(prevPoint[0]-point[0])
                            let n = point[1] - m * point[0]
                            // Berechnet Anstieg und yAchsenabschnitt der Senkrechten der Geraden durch die Touchposition (mOrth=negatives Reziproke von m; nOrth=y-m*x)
                            let mOrth = -1/m
                            let nOrth = touchOnEl.y - mOrth * touchOnEl.x
                            // Löst Gleichungssystem, findet Schnittpunkt der Gerade durch den vorherigen Punkt und den aktuellen Punkt und deren Senkrechte durch die Touchposition
                            let intersectX = (n-nOrth)/(mOrth-m)
                            let intersect = {'x': intersectX, 'y': m * intersectX + n}

                            // Wenn die Senkrechte zur Strecke vom vorherigen Punkt zum aktuellen Punkt diese Strecke schneidet:
                            if (isBetween(intersect.x, prevPoint[0], point[0])) {
                                if (isBetween(intersect.y, prevPoint[1], point[1])) {

                                    // Berechnet Abstand der Touchposition zur Strecke vom vorherigen Punkt zum aktuellen Punkt
                                    let distance = Math.sqrt(Math.pow(intersect.x*el.scale - touchOnEl.x*el.scale, 2) + Math.pow(intersect.y*el.scale - touchOnEl.y*el.scale, 2));/* abstand zwischen intersect und touch */

                                    // Entscheidet, ob das aktuelle Element das nächste Element ist
                                    if (distance < closestEl.distance) {
                                        closestEl.element = el;
                                        closestEl.distance = distance;

                                    }
                                }
                            }
                        }
                        // definiert aktuellen Punkt als vorherigen Punkt
                        prevPoint = point
                    }
                }
            }
            // Wenn das nächste Element einen kleineren Abstand als 30 Einheiten besitzt:
            if (closestEl.distance < 30) {
                // Das nächste Element wird Fokussiert
                global.focusedEl = closestEl.element;
                document.getElementById("smoother").dataset.state = "button";
            // Wenn das nächste Element weiter entfernt ist:
            } else {
                // Kein Element wird Fokussiert
                global.focusedEl = undefined;
            }
        }
    }

    if (global.focusedEl == undefined) {
        document.getElementById("smoother").dataset.state = "off";
    }

    // Aktualisiert die Zeichenfläche
    drawCvs("main-cvs", global.elements);

    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));
}

// Helferfunktionen...
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const getCookie = (name) => { // kopiert von: https://docs.djangoproject.com/en/3.1/ref/csrf/#acquiring-the-token-if-csrf-use-sessions-and-csrf-cookie-httponly-are-false
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

const isBetween = (x, a, b) => {
    return (a<x && x<b) || (a>x && x>b)
}

const pointIsOnArea = (point, areaCenter, Xradius, Yradius) => { //point and area center must be in the same coordinate system
    let XOnArea = point.x < areaCenter.x + Xradius && point.x > areaCenter.x - Xradius;
    let YOnArea = point.y < areaCenter.y + Yradius && point.y > areaCenter.y - Yradius;

    return XOnArea && YOnArea;
}

const addPointToFreehand = (pointOnEl) => {
        global.drawnEl.path[global.drawnEl.path.length - 1].push([pointOnEl.x, pointOnEl.y]); //push the point to the last partpath of drawnEl

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

const middle = (a, b) => {
    return [Math.round((a[0]+b[0])/2), Math.round((a[1]+b[1])/2)];
}
const percent_between = (p, a, b) => {
    return [a[0]+Math.round((b[0]-a[0])*p), a[1]+Math.round((b[1]-a[1])*p)];
}

//Function that draws a canvas
const drawCvs = (id, elements, controls=true) => {
    cvs = document.getElementById(id);
    ctx = cvs.getContext("2d");

    //clear draw_canvas
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    //redraw
    for (let el of elements) {
        ctx.save();

        //do the transformations
        ctx.translate(el.origin.x, el.origin.y);
        ctx.scale(el.scale, el.scale);
        ctx.rotate(el.rotation*Math.PI/180);


        // make path settings
        ctx.beginPath();
        ctx.lineCap = 'round'; ///nice trick! makes partpaths with only one point appear as a point on the canvas
        ctx.strokeStyle = "black";
        ctx.lineJoin = 'round';
        if (el == global.drawnEl) {
            ctx.lineWidth = 5 / el.scale;
        } else {
            let f = 3;
            if (id != "main-cvs" && id != "finish-cvs") {
                f = 12;
            }
            ctx.lineWidth = f / el.scale;

        }


        // draw the path
        for (let partpath of el.path) {
            ctx.moveTo(...partpath[0]);

            if (el.smooth == 0) {  // keine Abrundung
                for (let point of partpath.slice(1, partpath.length)) {
                    ctx.lineTo(point[0], point[1]);
                }
            } else if (el.smooth == 1) {  // vollständige Abrundung
                if (JSON.stringify(partpath[0]) === JSON.stringify(partpath[partpath.length-1])) {
                    ctx.moveTo(...middle(partpath[0], partpath[1]));
                } else {
                    ctx.lineTo(...middle(partpath[0], partpath[1]));
                }

                for (let i=1; i<partpath.length-1; i++) {
                    let ctrl_point = partpath[i];
                    let next_point = partpath[i+1];

                    ctx.quadraticCurveTo(...ctrl_point, ...middle(ctrl_point, next_point));
                }
                if (JSON.stringify(partpath[0]) === JSON.stringify(partpath[partpath.length-1])) {
                    ctx.quadraticCurveTo(...partpath[0], ...middle(partpath[0], partpath[1]));
                } else {
                    ctx.lineTo(...partpath[partpath.length-1]);
                }
            } else {  // teilweise Abrundung
                if (JSON.stringify(partpath[0]) === JSON.stringify(partpath[partpath.length-1])) {
                    ctx.moveTo(...percent_between(0.5 + (1 - el.smooth) / 2, partpath[0], partpath[1]));
                } else {
                    ctx.lineTo(...percent_between(0.5 + (1 - el.smooth) / 2, partpath[0], partpath[1]));
                }

                for (let i=1; i<partpath.length-1; i++) {
                    let ctrl_point = partpath[i];
                    let next_point = partpath[i+1];

                    ctx.quadraticCurveTo(...ctrl_point, ...percent_between(el.smooth/2, ctrl_point, next_point));
                    ctx.lineTo(...percent_between((1-el.smooth)/(1-el.smooth/2), percent_between(el.smooth/2, ctrl_point, next_point), next_point));
                }
                if (JSON.stringify(partpath[0]) === JSON.stringify(partpath[partpath.length-1])) {
                    ctx.quadraticCurveTo(...partpath[0], ...percent_between(el.smooth/2, partpath[0], partpath[1]));
                    ctx.lineTo(...percent_between((1 - el.smooth) / (1 - el.smooth / 2), percent_between(el.smooth/2, partpath[0], partpath[1]), partpath[1]));
                } else {
                    ctx.lineTo(...partpath[partpath.length-1])
                }
            }
        }
        ctx.stroke();
        //Draw the container-rect delete-button and transform-btn if focused
        if (el == global.focusedEl && controls) {
            //container-rect
            ctx.lineWidth = 0.5 / el.scale;
            ctx.strokeRect(el.min.x, el.min.y, el.max.x-el.min.x, el.max.y-el.min.y);

            //delete-circle
            ctx.beginPath();
            ctx.strokeStyle = "red";
            ctx.fillStyle = "red";
            ctx.arc(el.min.x, el.min.y, 30 / el.scale, 0, 2*Math.PI);
            ctx.fill();
            ctx.stroke();

            //transform-button circle
            ctx.beginPath();
            ctx.strokeStyle = "gray";
            ctx.fillStyle = "gray";
            ctx.arc(el.max.x, el.max.y, 30 / el.scale, 0, 2*Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    ctx.restore();
    }
}
