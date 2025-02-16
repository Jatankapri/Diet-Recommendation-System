// Validate Login Form
function validateLogin(event) {
    let username = document.getElementById("login-username").value.trim();
    let password = document.getElementById("login-password").value.trim();
    
    // Check if any field is empty
    if (username === "" || password === "") {
        displayError("login-error", "All fields are required!");
        event.preventDefault(); // Prevent form submission
        return false;
    }
    return true;
}

// Validate Signup Form
function validateSignup(event) {
    let username = document.getElementById("signup-username").value.trim();
    let email = document.getElementById("signup-email").value.trim();
    let password = document.getElementById("signup-password").value;
    let confirmPassword = document.getElementById("confirm-password").value;

    // Retrieve stored users from localStorage
    let users = JSON.parse(localStorage.getItem("users")) || [];

    // Check if the username or email already exists
    let userExists = users.some(user => user.username === username || user.email === email);
    if (userExists) {
        displayError("signup-error", "User already exists!");
        event.preventDefault();
        return false;
    }

    // Check for empty fields
    if (!username || !email || !password || !confirmPassword) {
        displayError("signup-error", "All fields are required!");
        event.preventDefault();
        return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        displayError("signup-error", "Passwords do not match!");
        event.preventDefault();
        return false;
    }
    // Save new user if validation passes
    users.push({ username, email, password }); // Store password as plaintext only for demo; use hashing in production
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup successful! You can now log in.");
    return true;
}

// Function to display error messages
function displayError(id, message) {
    let errorElement = document.getElementById(id);
    errorElement.innerText = message;
    errorElement.style.color = "red";
}
// To stay logged out
document.addEventListener("DOMContentLoaded", function () {
    let stayLoggedOutButton = document.getElementById("stay-logged-out");

    stayLoggedOutButton.addEventListener("click", function () {
        localStorage.setItem("stayLoggedOut", "true"); // Mark user as staying logged out
        localStorage.removeItem("loggedInUser"); // Ensure no login session
        window.location.href = "{{ url_for('index') }}"; // Redirect to index.html
    });
});

    // Handle login
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        let username = document.getElementById("login-username").value.trim();
        let password = document.getElementById("login-password").value.trim();

        let users = JSON.parse(localStorage.getItem("users")) || [];
        let user = users.find(user => user.username === username && user.password === password);

        if (user) {
            localStorage.setItem("loggedInUser", username);
            localStorage.removeItem("stayLoggedOut"); // Allow saving after login
            alert("Login successful!");
            window.location.href = "index.html"; 
        } else {
            alert("Invalid username or password.");
        }
    });
// Attach validation to forms
document.getElementById("login-form").addEventListener("submit", validateLogin);
document.getElementById("signup-form").addEventListener("submit", validateSignup);
