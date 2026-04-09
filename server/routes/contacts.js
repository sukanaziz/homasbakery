// Import Express and create a router for contact routes
const express = require("express");
const router = express.Router();

// Import the shared SQLite database connection
const db = require("../db");

//Validate and store a contact form submission
router.post("/", (req, res) => {
  const { name, email, phone, message } = req.body;

  // Trim input values for cleaner validation and storage
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
  if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
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

  // Limit message length
  if (trimmedMessage.length > 1000) {
    return res.status(400).json({
      error: "Message must be under 1000 characters.",
    });
  }

  const query = `
    INSERT INTO contacts (name, email, phone, message)
    VALUES (?, ?, ?, ?)
  `;

  // Save values to the database
  db.run(
    query,
    [trimmedName, trimmedEmail, trimmedPhone, trimmedMessage],
    function (err) {
      if (err) {
        console.error("Failed to save contact message:", err.message);
        return res.status(500).json({
          error: "Failed to save contact message.",
        });
      }

      res.status(201).json({
        message: "Contact message submitted successfully.",
        contactId: this.lastID,
      });
    }
  );
});

// Export the router so it can be mounted in server.js
module.exports = router;