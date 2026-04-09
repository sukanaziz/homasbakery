// Import Express and create a router for contact-related routes
const express = require("express");
const router = express.Router();

// Import shared database connection
const db = require("../db");

// Validates contact form input and stores the message in the database
router.post("/", (req, res) => {
  // Extract fields from request body
  const { name, email, phone, message } = req.body;

  // Trim input values for consistent validation and storage
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim() || "";
  const trimmedMessage = message?.trim();

  // Validate required fields
  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return res.status(400).json({
      error: "Name, email, and message are required.",
    });
  }

  // Validate name length
  if (trimmedName.length < 2) {
    return res.status(400).json({
      error: "Please enter a valid name.",
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  // Validate message length
  if (trimmedMessage.length < 10) {
    return res.status(400).json({
      error: "Message must be at least 10 characters long.",
    });
  }

  // Query to insert a new contact message
  const query = `
    INSERT INTO contacts (name, email, phone, message)
    VALUES (?, ?, ?, ?)
  `;

  // Execute query with validated and trimmed values
  db.run(
    query,
    [trimmedName, trimmedEmail, trimmedPhone, trimmedMessage],
    function (err) {
      // Handle database errors
      if (err) {
        console.error("Failed to save contact message:", err.message);
        return res.status(500).json({
          error: "Failed to save contact message.",
        });
      }

      // Return success response with new contact ID
      res.status(201).json({
        message: "Contact message submitted successfully.",
        contactId: this.lastID,
      });
    }
  );
});

// Export router for use in server.js
module.exports = router;