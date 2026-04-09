// Import required dependencies
const express = require("express");
const bcrypt = require("bcrypt");

// Create a router instance for authentication routes
const router = express.Router();

//Authenticate admin user
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Validate required fields FIRST
  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required.",
    });
  }

  try {
    // Check if username matches stored admin username
    const usernameMatch = username === process.env.ADMIN_USERNAME;

    // Compare provided password with hashed password from environment
    const passwordMatch = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    // If both username and password match → authenticate
    if (usernameMatch && passwordMatch) {
      req.session.isAdmin = true;

      return res.json({
        message: "Login successful.",
      });
    }

    // Invalid credentials
    return res.status(401).json({
      error: "Invalid username or password.",
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "Something went wrong during login.",
    });
  }
});

//Log Out
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err.message);

      return res.status(500).json({
        error: "Failed to log out.",
      });
    }

    res.json({
      message: "Logged out successfully.",
    });
  });
});

//Check if user is authenticated
router.get("/check", (req, res) => {
  res.json({
    isAdmin: !!req.session.isAdmin,
  });
});

// Export router for use in server.js
module.exports = router;