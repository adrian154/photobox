const username = document.getElementById("username"),
      password = document.getElementById("password");

document.getElementById("signin-form").addEventListener("submit", event => {
    event.preventDefault();
    fetch("/signin", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    }).then(resp => {
        if(resp.ok) {
            window.location.href = "/";
        } else if(resp.status == 401) {
            password.setCustomValidity("Incorrect username or password");
            password.reportValidity();
        } else {
            alert("Internal error");
        }
    })
});