// Import Express and create a router for contact routes
const express = require("express");
const router = express.Router();

// Import the shared SQLite database connection
const db = require("../db");

// Import email function
const { sendContactToBakery } = require("../utils/mailer");


//Validate and store a contact form submission,
//then send email notification to bakery
router.post("/", async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Trim input values for cleaner validation and storage
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim() || "";
  const trimmedMessage = message?.trim();

  // Required fields
  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return res.status(400).json({
      error: "Name, email, and message are required.",
    });
  }

  // Name length
  if (trimmedName.length < 2) {
    return res.status(400).json({
      error: "Please enter a valid name.",
    });
  }

  // Email format
  if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  // Message length min
  if (trimmedMessage.length < 5) {
    return res.status(400).json({
      error: "Message must be at least 5 characters long.",
    });
  }

  // Message length max
  if (trimmedMessage.length > 200) {
    return res.status(400).json({
      error: "Message must be under 200 characters.",
    });
  }

  //Insert into database
  const query = `
    INSERT INTO contacts (name, email, phone, message)
    VALUES (?, ?, ?, ?)
  `;

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

      // Send success response FIRST
      res.status(201).json({
        message: "Contact message submitted successfully.",
        contactId: this.lastID,
      });
      //Send Email
      (async () => {
        try {
          await sendContactToBakery({
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            message: trimmedMessage,
          });
        } catch (emailErr) {
          console.error("Contact email error:", emailErr.message);
        }
      })();
    }
  );
});

// Export the router so it can be mounted in server.js
module.exports = router;