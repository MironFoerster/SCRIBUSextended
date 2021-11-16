const username_input = document.getElementById("username_input");
const password_input = document.getElementById("password_input");
const login_btn = document.getElementById("login_btn");

const username = () => {
	
}

const password = () => {
	
}

const login = () => {
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
    if (submitValid) {
        fetch("http://192.168.2.113:8000/home/submit/",
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


username_input.addEventListener('input', username, false);
password_input.addEventListener('input', password, false);
login_btn.addEventListener('click', login, false);
