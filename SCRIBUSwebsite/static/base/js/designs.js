const useoriginal_btn = document.getElementById("useoriginal_btn");
const usegrouped_btn = document.getElementById("usegrouped_btn");


const selectDesign = (evt) => {
    //remove focused-card class from all Choices (usually the one that was clicked beforehand)
    let activeChoices = document.getElementsByClassName("focused-card");
    
    while (activeChoices[0]) {
        activeChoices[0].classList.remove("focused-card");
    }
    //add focused-card class to clicked el
    evt.currentTarget.classList.add("focused-card");
}
const useOriginal = (evt/*, existing_elements*/) => {
    let elements = JSON.parse(sessionStorage.getItem('elements'));

    activeDesigns = document.getElementsByClassName("focused-card");
    fetch('http://192.168.2.113:8000/gallery/getdesigns/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie('csrftoken'),
            'ContentType': 'application/json'},
        body: JSON.stringify({'designName': activeDesigns[0].getAttribute("id")}), //send the designname to the server
    })
    .then(response => response.json())
    .then(elementsData => {
        let new_elements = elements.concat(elementsData.elements);
        //save current elements list in session storage
        sessionStorage.setItem('elements', JSON.stringify(new_elements));
    });
    
    //let new_elements = elements.concat(existing_elements)
    //sessionStorage.setItem('elements', JSON.stringify(new_elements));
}
const useGrouped = (evt/*, existing_elements*/) => {
    let elements = JSON.parse(sessionStorage.getItem('elements'));

    activeDesigns = document.getElementsByClassName("focused-card");
    fetch('http://192.168.2.113:8000/gallery/getdesigns/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie('csrftoken'),
            'ContentType': 'application/json'},
        body: JSON.stringify({'designName': activeDesigns[0].getAttribute("id")}), //send the designname to the server
    })
    .then(response => response.json())
    .then(elementsData => {
        let grouped_elements = none;
        let new_elements = elements.concat(grouped_elements);
        
        //save current elements list in session storage
        sessionStorage.setItem('elements', JSON.stringify(new_elements));
    });
    
    //let new_elements = elements.concat(existing_elements)
    //sessionStorage.setItem('elements', JSON.stringify(new_elements));
}


useoriginal_btn.addEventListener('click', useOriginal, false);
usegrouped_btn.addEventListener('click', useGrouped, false);



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
