// Import Express and create a router for order routes
const express = require("express");
const router = express.Router();

// Import shared database connection
const db = require("../db");

// Import email helpers
const {
  sendOrderToBakery,
  sendOrderToCustomer,
} = require("../utils/mailer");


//Validate request data, create order and order items using a transaction,
//then send confirmation emails after a successful commit
router.post("/", async(req, res) => {
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

  // Trim key fields for safer validation and cleaner storage
  const trimmedName = customer_name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim();
  const trimmedStreet = delivery_street?.trim() || "";
  const trimmedApt = delivery_apt?.trim() || "";
  const trimmedCity = delivery_city?.trim() || "";
  const trimmedState = delivery_state?.trim() || "";
  const trimmedPostalCode = delivery_postal_code?.trim() || "";
  const trimmedInstructions = special_instructions?.trim() || "";

  // Validate required customer info
  if (
    !trimmedName ||
    !trimmedEmail ||
    !trimmedPhone ||
    !pickup_date ||
    !fulfillment_type
  ) {
    return res.status(400).json({
      error: "Please fill in all required customer details.",
    });
  }

  // Email validation
  if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
    return res.status(400).json({
      error: "Please enter a valid email address.",
    });
  }

  // Ensure fulfillment type
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

  // If delivery is selected, require full address
  if (fulfillment_type === "delivery") {
    if (!trimmedStreet || !trimmedCity || !trimmedState || !trimmedPostalCode) {
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

  const itemQuery = `
    INSERT INTO order_items (order_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?)
  `;

  const orderValues = [
    trimmedName,
    trimmedEmail,
    trimmedPhone,
    pickup_date,
    fulfillment_type,
    trimmedStreet,
    trimmedApt,
    trimmedCity,
    trimmedState,
    trimmedPostalCode,
    trimmedInstructions,
  ];

  //Transaction
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(orderQuery, orderValues, function (orderErr) {
      if (orderErr) {
        console.error("Failed to save order:", orderErr.message);

        return db.run("ROLLBACK", () => {
          res.status(500).json({
            error: "Failed to submit order.",
          });
        });
      }

      const orderId = this.lastID;
      const stmt = db.prepare(itemQuery);

      let insertFailed = false;
      let pendingItems = items.length;

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

            pendingItems--;

            if (pendingItems === 0) {
              stmt.finalize((finalizeErr) => {
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

                db.run("COMMIT", (commitErr) => {
                  if (commitErr) {
                    console.error("Failed to commit:", commitErr.message);

                    return db.run("ROLLBACK", () => {
                      res.status(500).json({
                        error: "Failed to finalize order.",
                      });
                    });
                  }

                  // Send success response first so email issues do not block the order
                  res.status(201).json({
                    message: "Custom order submitted successfully.",
                    orderId,
                  });

                  // Send emails after commit and response
                  (async () => {
                    try {
                      await sendOrderToBakery(
                        {
                          customer_name: trimmedName,
                          email: trimmedEmail,
                          phone: trimmedPhone,
                          pickup_date,
                          fulfillment_type,
                          delivery_street: trimmedStreet,
                          delivery_apt: trimmedApt,
                          delivery_city: trimmedCity,
                          delivery_state: trimmedState,
                          delivery_postal_code: trimmedPostalCode,
                          special_instructions: trimmedInstructions,
                        },
                        items
                      );

                      await sendOrderToCustomer({
                        customer_name: trimmedName,
                        email: trimmedEmail,
                      });
                    } catch (emailErr) {
                      console.error("Order email error:", emailErr.message);
                    }
                  })();
                });
              });
            }
          }
        );
      }
    });
  });
});

module.exports = router;