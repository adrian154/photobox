const username = document.getElementById("username"),
      password = document.getElementById("password");

document.getElementById("signin-form").addEventListener("submit", event => {
    event.preventDefault();
    fetch("/api/signin", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    }).then(resp => {
        console.log(resp.status);
        if(resp.ok) {
            window.location.href = "/";
        } else if(resp.status == 401) {
            alert("Incorrect username or password");
        } else {
            alert("Internal error");
        }
    })
});