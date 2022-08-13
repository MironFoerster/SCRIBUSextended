// Ertellt Variablen, die die HTML-Elemente repräsentieren,
// auf die im Code zugegriffen werden muss
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

// Erstellt das context-Objekt, mit dem auf dem canvas gezeichnet werden kann
const ctx = cvs_elem.getContext('2d');

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
}


// Definiert die Klasse pathElement als Blueprint für alle Grafikelemente
class pathElement {
    // Für das Erstellen eines p.E. wird benötigt: der Pfad
    // und der Koordinatenursprung zu dem der Pfad relativ ist
    constructor(path=[[[0, 0]]], origin={'x': cvs_elem.width/2, 'y': cvs_elem.height/2}) {
        this.path = path; // Struktur des Pfads: [  [[x, y], [x, y], [x, y]], [[x, y], [x, y], [x, y]]  ]
        this.origin = origin;
        this.rotation = 0;
        this.scale = 1;

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
    }
}

// Um ein neues Element zur elements_list hinzuzufügen: global.elements.push(new pathElement(path, origin));

// Definiert Funktionen, die bei Buttonclicks ausgeführt werden sollen

// Grafik aus Gelerie einfügen...
const useExisting = () => {
    // Zeigt "Weiter zur Galerie?"-Popup an
    exist_pop.classList.remove("hidden");
}
const okExisting = () => {
    // Button ist von sich aus ein Link zur Gallerie
    // Trifft Vorkehrungen:
    
    // Bricht eventuell laufende Freihandzeichnung ab
    cancelFreehand();
    
    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));
    
    // Versteckt "Weiter zur Galerie?"-Popup
    exist_pop.classList.add("hidden");
}
const cancelExisting = () => {
    // Versteckt "Weiter zur Galerie?"-Popup
    exist_pop.classList.add("hidden");
}
// KI-Handschrift einfügen...
const insScribing = () => {
    // Funktion noch nicht implementiert, Platzhalter
}

// Form einfügen...
const insShape = () => {
    // Bricht eventuell laufende Freihandzeichnung ab
    cancelFreehand();
    
    // Zeigt "Form einfügen"-Popup an
    shape_pop.classList.remove("hidden");
}
const selectShape = (evt) => {
    // Beim Auswählen einer Form:
    
    // Bekommt alle aktiven Formen (normalerweise ist das nur eine oder keine)
    let activeChoices = document.getElementsByClassName("focused-card");
    // Deaktiviert alle aktiven Formen
    while (activeChoices[0]) {
        activeChoices[0].classList.remove("focused-card");
    }
    // Aktiviert die gewählte Form
    evt.currentTarget.classList.add("focused-card");
}
const okShape = () => {
    // Bekommt alle aktiven Formen (normalerweise ist das nur eine oder keine)
    let activeShapes = document.getElementsByClassName("focused-card");
    // Fordert die aktive Form vom Server
    fetch('http://192.168.2.113:8000/draw/shapes/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie('csrftoken'),
            'ContentType': 'application/json'},
        body: JSON.stringify({'shapeName': activeShapes[0].getAttribute("id")}), //send the shapename to the server
    })
    // Wartet auf die Serverantwort und konvertiert sie von JSON zu einem JavaScript-Object
    .then(response => response.json())
    .then(pathData => {
        // Fügt den erhaltenen Formpfad als neues Element zur elements_list hinzu
        global.elements.push(new pathElement(pathData.path));
        // definiert das zugefügte Element als fokussiertes Element
        global.focusedEl = global.elements[global.elements.length - 1]
        
        // Speichert aktuelle elements_list in der sessionStorage
        sessionStorage.setItem('elements', JSON.stringify(global.elements));
        
        // Aktualisiert die Zeichenfläche
        redraw_canvas();
    });

    // Versteckt "Form einfügen"-Popup
    shape_pop.classList.add("hidden");
}
const cancelShape = () => {
    // Versteckt "Form einfügen"-Popup
    shape_pop.classList.add("hidden");
}

// Freihand einfügen...
const drwFreehand = () => {
    // Ersetzt Freihand-Button durch Abbruch-Button
    free_btn.classList.add("hidden");
    freecancel_btn.classList.remove("hidden");

    // Sagt über die globale Variable dem Rest des Programms, dass jetzt Freihandgezeichnet wird
    global.freehand = true;
    
    // Definiert kein Element als das, das gerade fokussiert ist
    global.focusedEl = undefined;
    
    // Aktualisiert die Zeichenfläche
    redraw_canvas();
}
const okFreehand = () => {
    // Ersetzt Abbruch- und evtl. OK-Button durch Freihand-Button
    free_btn.classList.remove("hidden");
    freeok_btn.classList.add("hidden");
    freecancel_btn.classList.add("hidden");
    
    // Dupliziert den Punkt von Teilpfaden mit nur einem Punkt,
    // damit 2 verbindendbare Punkte vorhanden sind, da sonst kein Zeichnen möglich
    for (let partpath of global.drawnEl.path) {
        if (partpath.length == 1) {
            partpath.push(partpath[0])
        }
    }
    ////////////////////////////////////////////////////////////////////////////////////
    global.drawnEl.min = {'x': Infinity, 'y': Infinity}
    global.drawnEl.max = {'x': -Infinity, 'y': -Infinity}
    
    // Sucht äußerste Punkte (min, max) des Pfades in X- und Y-Richtung
    for (let partpath of global.drawnEl.path) {
        for (let point of partpath) {

            if (point[0] < global.drawnEl.min.x) {
                global.drawnEl.min.x = point[0];
            }
            if (point[1] < global.drawnEl.min.y) {
                global.drawnEl.min.y = point[1];
            }
            if (point[0] > global.drawnEl.max.x) {
                global.drawnEl.max.x = point[0];
            }
            if (point[1] > global.drawnEl.max.y) {
                global.drawnEl.max.y = point[1];
            }
        }
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
    
    // definiert das gerade gezeichnete Element als fokussiertes Element
    global.focusedEl = global.drawnEl;
    // Definiert kein Element als das, das gerade gezeichnet wird
    global.drawnEl = undefined;
    // Aktiviert Freihandzeichnung
    global.freehand = false;
    
    // Aktualisiert die Zeichenfläche
    redraw_canvas();
    
    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));
}
const cancelFreehand = () => {
    // Ersetzt Abbruch- und evtl. OK-Button durch Freihand-Button
    free_btn.classList.remove("hidden");
    freeok_btn.classList.add("hidden");
    freecancel_btn.classList.add("hidden");

    // Löscht bisher gezeichnete Freihandzeichnung,
    // wenn die Zeichnung schon begonnen wurde
    if (global.drawnEl != undefined){
        // Entfernt letztes Element der elements_list
        global.elements.splice(global.elements.indexOf(global.drawnEl), 1);
        // Definiert kein Element als das, das gerade gezeichnet wird
        global.drawnEl = undefined;
    }
    
    // Deaktiviert Freihandzeichnung
    global.freehand = false;
    
    // Aktualisiert die Zeichenfläche
    redraw_canvas();
}

// Abhängig von gewählter Speicheroption Namens-Input und Warntext verstecken oder zeigen...
const switchNameInput = (evt) => {
    // Wenn "nicht speichern" ausgewählt:
    if (evt.currentTarget.id == "dontsave_radio") {
        // Verstecken
        designname_input.classList.add("hidden");
        designname_warning.classList.add("hidden");
    // Wenn "öffentlich/privat speichern" ausgewählt:
    } else {
        // Zeigen
        designname_input.classList.remove("hidden");
        designname_warning.classList.remove("hidden");
    }
}

// Warntext aktualisieren...
const getNameWarning = (evt, all_names) => {
    // Wenn weniger als 4 Buchstaben lang
    if (designname_input.value.length < 4) {
        designname_warning.innerHTML = "Name must have at least 4 letters!";
    // Wenn Leerzeichen enthalten
    } else if (designname_input.value.includes(' ')) {
        designname_warning.innerHTML = "Name must not contain whitespaces!";
    // Wenn Name schon vergeben
    } else if (all_names.indexOf(designname_input.value)>-1) {
        console.log(all_names.indexOf(designname_input.value));
        designname_warning.innerHTML = "This name already exists!";
    // Wenn Name OK
    } else {
        designname_warning.innerHTML = "";
    }

}
// Grafik an den Roboter senden...
const sbmtDrawing = () => {
    // Initialisiert den Submit als korrekt
    let submitValid = true;
    // Initialisiert Variablen für Grafikname und Speicheroption
    let name;
    let save;
    
    // Ermittelt gewählte Speicheroption
    for (let i of save_options) {
        if (i.checked) {
            save = i.value;
        }
    }
    
    // Wenn gespeichert werden soll...
    if (save == 'saveprivate' || save == 'savepublic') {
        // ...und kein Warntext vorhanden ist:
        if (designname_warning.innerHTML == "") {
            // Übernimmt den Namen aus dem Inputfeld
            name = designname_input.value;
        // ...und ein Warntext vorhanden ist:
        } else {
            // Definiert den Submit als inkorrekt
            submitValid = false;
        }
    // Wenn nicht gespeichert werden soll:
    } else {
        // Definiert den Namen als null
        name = null;
    }

    // Wenn der Submit korrekt ist:
    if (submitValid) {
        // Sendet Name, elements_list und Speicheroption an den Server
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
    // Wenn der Submit inkorrekt ist:
    } else {
        // Fokussiert den Namensinput
        designname_input.focus()
    }
}

// Fügt jedem HTML-Element einen click-Event-Listener mit der entsprechenden Funktion zu
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


// Definiert Funktionen, die bei Touchevents ausgeführt werden sollen

// Beim Touch Start...
const Tstart = (evt) => {
    // Verhindert, dass das Touchevent anders als hier definiert Wirkung zeigt (z.B. scrollen)
    evt.preventDefault();
    
    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;
    
    // Ermittelt die X- und Y-Abstände des canvas-Elements zum Rand des Bildschirms 
    let cvsRect = cvs_elem.getBoundingClientRect();
    global.cvsOffset = {'left': cvsRect.left, 'top': cvsRect.top};
    
    // Berechnet die Position des Touchs auf dem canvas-Element
    // unter Berücksichtigung von canvas-Offset, CSS-Skalierung und canvas-Breite von 1000 Einheiten
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};

    // Wenn Freihandzeihnen aktiv:
    if (global.freehand == true) {
        
        // Wenn Zeichnung noch nicht begonnen:
        if (global.drawnEl == undefined) {
            
            // Zeigt den Freihand OK-Button
            freeok_btn.classList.remove("hidden");
            
            // Fügt ein neues Element zur elements_list hinzu
            // ohne Pfad, mit Koordinatenursprung am aktuellen Touch
            global.elements.push(new pathElement(undefined, {'x': global.posOnCvs.x, 'y': global.posOnCvs.y}));
            // Definiert das neu hinzugefügte Element als das, das gerade gezeichnet wird
            global.drawnEl = global.elements[global.elements.length - 1];
        }
        
        // Fügt einen neuen, leeren Teilpfad zum gerade gezeichneten Element hinzu
        global.drawnEl.path.push([]);
        // Fügt die aktuelle Touchposition als ersten Punkt zum Teilpfad hinzu
        addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl));
        
    // Wenn Freihand nicht aktiv --> der Touch will Elemente Verändern (verschieben, skalieren+rotieren, löschen),
    // kann ein click oder ein move sein
    } else {
        // Um später feststellen zu können, ob es ein click oder ein move ist
        global.touchHasNotMoved = true;

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
    
    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;
    
    // Berechnet die Position des Touchs auf dem canvas-Element
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};
    
    // Wenn Freihandzeihnen aktiv:
    if (global.freehand == true) {
        // Fügt die aktuelle Touchposition als weiteren Punkt zum aktuellen Teilpfad hinzu
        addPointToFreehand(getPointOnEl(global.posOnCvs, global.drawnEl));
    
    // Wenn Freihand nicht aktiv --> der Touch ist ein move will Elemente Verändern -->(verschieben, skalieren+rotieren)
    } else {
        // Wenn der Touch vorher noch nich bewegt wurde:
        if (global.touchHasNotMoved) {
            // Definiert, dass der Touch bewegt wurde
            global.touchHasNotMoved = false;
        }
        
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
    redraw_canvas();
}

const Tend = (evt) => {
    // Verhindert, dass das Touchevent anders als hier definiert Wirkung zeigt (z.B. scrollen)
    evt.preventDefault();
    
    // Bekommt Liste von Touch-Objekten, die durch aktuelles Touch-Event verändert wurden
    // (normalerweise nur ein Touch-Objekt)
    let touches = evt.changedTouches;
    
    // Berechnet die Position des Touchs auf dem canvas-Element
    global.posOnCvs = {'x': (touches[0].pageX - global.cvsOffset.left) * (1000/parseInt(window.getComputedStyle(cvs_elem).width)), 'y': (touches[0].pageY - global.cvsOffset.top) * (1000/parseInt(window.getComputedStyle(cvs_elem).height))};
    
    // Initialisiert Variablen ........................................
    let XOnButton;
    let YOnButton;
    
    // Wenn Freihandzeihnen aktiv und der Touch endet: Tut garnichts
    if (global.freehand == true) {
    
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
            // Wenn das nächste Element weiter entfernt ist:
            } else {
                // Kein Element wird Fokussiert
                global.focusedEl = undefined;
            }
        }
    }
    
    // Aktualisiert die Zeichenfläche
    redraw_canvas();
    
    // Speichert aktuelle elements_list in der sessionStorage
    sessionStorage.setItem('elements', JSON.stringify(global.elements));
}


// Fügt dem canvas-Element Event-Listener für alle Touch-Events mit der entsprechenden Funktion zu.
cvs_elem.addEventListener('touchstart', Tstart, false);
cvs_elem.addEventListener('touchmove', Tmove, false);
cvs_elem.addEventListener('touchend', Tend, false);


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
    return [int((a[0]+b[0])/2), int((a[1]+b[1])/2)];
}
const percent_between = (p, a, b) => {
    return [a[0]+int((a[0]-b[0])*p), a[1]+int((a[1]-b[1])*p)];
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

    
    // make path settings
    ctx.beginPath();
    ctx.lineCap = 'round'; ///nice trick! makes partpaths with only one point appear as a point on the canvas
    ctx.strokeStyle = "black";
    ctx.lineJoin = 'round';
    if (el == global.drawnEl) {
        ctx.lineWidth = 5 / el.scale;
    } else {
        ctx.lineWidth = 3 / el.scale;
    }

    // draw the path
    for (let partpath of el.path) {
        ctx.moveTo(...partpath[0]);

        if (el.smooth == 0) {  // keine Abrundung
            for (let point of partpath.slice(1, partpath.length)) {
                ctx.lineTo(point[0], point[1]);
            }
        } else if (el.smooth == 1) {  // vollständige Abrundung
            if (partpath[0] == partpath[-1]) {
                ctx.moveTo(...middle(partpath[0], partpath[1]));
            } else {
                ctx.lineTo(...middle(partpath[0], partpath[1]));
            }

            for (let i=1; i<partpath.length-1; i++) {
                let ctrl_point = partpath[i];
                let next_point = partpath[i+1];

                ctx.quadraticCurveTo(...ctrl_point, ...middle(ctrl_point, next_point));
            }
            if (partpath[0] == partpath[-1]) {
                ctx.quadraticCurveTo(...partpath[0], ...middle(partpath[0], partpath[1]));
            } else {
                ctx.lineTo(...partpath[-1]);
            }
        } else {  // teilweise Abrundung
            if (partpath[0] == partpath[-1]) {
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
            ctx.lineTo(...partpath[-1]);
            if (partpath[0] == partpath[-1]) {
                ctx.quadraticCurveTo(...partpath[0], ...percent_between(el.smooth/2, partpath[0], partpath[1]));
                ctx.lineTo(...percent_between((1 - el.smooth) / (1 - el.smooth / 2), percent_between(el.smooth/2, partpath[0], partpath[1]), partpath[1]));
            } else {
                ctx.lineTo(...partpath[-1])
            }
        }
      }
    }
    ctx.stroke();
    //Draw the container-rect delete-button and transform-btn if focused
    if (el == global.focusedEl) {
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

// Wenn die Seite geladen ist: Aktualisiert die Zeichenfläche,
// damit die noch in der session-storage vorhandene elements-list
// nicht erst bei der ersten Aktion, die ein redraw auslöst, zu sehen ist,
// sondern sofort.
redraw_canvas()
