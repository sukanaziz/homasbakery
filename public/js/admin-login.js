// Get references to form and status message elements
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");

// Attach submit event listener to login form
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission 

  // Extract and trim user input values
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();

  // Basic validation 
  if (!username || !password) {
    loginStatus.textContent = "Please enter both username and password.";
    loginStatus.className = "form-status error-text";
    return;
  }

  // Prepare data to send to backend
  const formData = {
    username,
    password,
  };

  try {
    // Send POST request to backend login endpoint
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Tell server we're sending JSON
      },
      body: JSON.stringify(formData), // Convert JS object to JSON string
    });

    // Parse response from server
    const result = await response.json();
    
    // If login failed
    if (!response.ok) {
      loginStatus.textContent = result.error || "Login failed.";
      loginStatus.className = "form-status error-text";
      return;
    }

    // If login successful
    loginStatus.textContent = result.message;
    loginStatus.className = "form-status success-text";

    // Redirect admin to dashboard
    window.location.href = "/admin";

  } catch (error) {
    // Handle network or server errors
    console.error("Login failed:", error);

    loginStatus.textContent = "Unable to log in right now.";
    loginStatus.className = "form-status error-text";
  }
});