// REGISTER

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("registerMessage");

        if (password !== confirmPassword) {

            message.innerText = "Passwords do not match.";
            message.style.color = "red";

            return;
        }

        const user = {
            name: name,
            email: email,
            phone: phone,
            password: password
        };

        localStorage.setItem(
            "campusUser",
            JSON.stringify(user)
        );

        message.innerText =
            "Registration successful! Redirecting...";

        message.style.color = "green";

        setTimeout(function() {
            window.location.href = "login.html";
        }, 1500);

    });
}


// LOGIN

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();

        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");

        const savedUser =
            JSON.parse(localStorage.getItem("campusUser"));

        if (!savedUser) {

            message.innerText =
                "No account found. Please register first.";

            message.style.color = "red";

            return;
        }

        if (
            email === savedUser.email &&
            password === savedUser.password
        ) {

            localStorage.setItem("loggedIn", "true");

            window.location.href = "dashboard.html";

        } else {

            message.innerText =
                "Invalid email or password.";

            message.style.color = "red";
        }

    });
}