// Import Express and create a router for order-related routes
const express = require("express");
const router = express.Router();

// Import shared database connection
const db = require("../db");


// Validates request data, creates order + order items using a transaction
router.post("/", (req, res) => {
  // Extract request body fields
  const {
    customer_name,
    email,
    phone,
    pickup_date,
    fulfillment_type,
    delivery_street,
    delivery_apt,
    delivery_city,
    delivery_state,
    delivery_postal_code,
    special_instructions,
    items,
  } = req.body;

  // Trim key fields for safe validation
  const trimmedName = customer_name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim();

  // Validate required customer info
  if (!trimmedName || !trimmedEmail || !trimmedPhone || !pickup_date || !fulfillment_type) {
    return res.status(400).json({
      error: "Please fill in all required customer details.",
    });
  }

  // Ensure fulfillment type is valid
  if (!["pickup", "delivery"].includes(fulfillment_type)) {
    return res.status(400).json({
      error: "Invalid fulfillment type.",
    });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: "Please add at least one order item.",
    });
  }

  // If delivery is selected, ensure full address is provided
  if (fulfillment_type === "delivery") {
    if (
      !delivery_street?.trim() ||
      !delivery_city?.trim() ||
      !delivery_state?.trim() ||
      !delivery_postal_code?.trim()
    ) {
      return res.status(400).json({
        error: "Please complete the full delivery address.",
      });
    }
  }

  // Validate each order item
  for (const item of items) {
    if (
      !item.product_name?.trim() ||
      Number(item.quantity) < 1 ||
      item.price === undefined ||
      item.price === null ||
      Number.isNaN(Number(item.price)) ||
      Number(item.price) < 0
    ) {
      return res.status(400).json({
        error: "Each order item must have a valid product, quantity, and price.",
      });
    }
  }

  // Main order insert query
  const orderQuery = `
    INSERT INTO orders (
      customer_name,
      email,
      phone,
      pickup_date,
      fulfillment_type,
      delivery_street,
      delivery_apt,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      special_instructions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Order items insert query
  const itemQuery = `
    INSERT INTO order_items (order_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?)
  `;

  // Prepare values for order insert
  const orderValues = [
    trimmedName,
    trimmedEmail,
    trimmedPhone,
    pickup_date,
    fulfillment_type,
    delivery_street?.trim() || "",
    delivery_apt?.trim() || "",
    delivery_city?.trim() || "",
    delivery_state?.trim() || "",
    delivery_postal_code?.trim() || "",
    special_instructions?.trim() || "",
  ];

  // Serialize ensures queries run in order
  db.serialize(() => {
    // Start transaction
    db.run("BEGIN TRANSACTION");

    // Insert main order
    db.run(orderQuery, orderValues, function (orderErr) {
      if (orderErr) {
        console.error("Failed to save order:", orderErr.message);

        // Rollback if order fails
        return db.run("ROLLBACK", () => {
          res.status(500).json({
            error: "Failed to submit order.",
          });
        });
      }

      // Get newly created order ID
      const orderId = this.lastID;

      // Prepare statement for inserting items
      const stmt = db.prepare(itemQuery);

      let insertFailed = false; // Track item insert failures
      let pendingItems = items.length; // Track remaining inserts

      // Insert each order item
      for (const item of items) {
        stmt.run(
          orderId,
          item.product_name.trim(),
          Number(item.quantity),
          Number(item.price),
          (itemErr) => {
            if (itemErr) {
              insertFailed = true;
              console.error("Failed to save order item:", itemErr.message);
            }

            // Decrease pending counter
            pendingItems--;

            // When all items processed
            if (pendingItems === 0) {
              // Finalize statement
              stmt.finalize((finalizeErr) => {
                // If any item failed OR finalize failed → rollback
                if (insertFailed || finalizeErr) {
                  console.error(
                    "Failed to finalize order items:",
                    finalizeErr?.message || "Unknown error"
                  );

                  return db.run("ROLLBACK", () => {
                    res.status(500).json({
                      error: "Failed to submit order.",
                    });
                  });
                }

                // Commit transaction if everything succeeded
                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    console.error("Failed to commit:", commitErr.message);

                    return db.run("ROLLBACK", () => {
                      res.status(500).json({
                        error: "Failed to finalize order.",
                      });
                    });
                  }

                  // Success response
                  res.status(201).json({
                    message: "Custom order submitted successfully.",
                    orderId,
                  });
                });
              });
            }
          }
        );
      }
    });
  });
});

// Export router
module.exports = router;