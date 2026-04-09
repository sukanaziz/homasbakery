// Import Express and create a new router instance for admin-related routes
const express = require("express");
const router = express.Router();
// Import the shared SQLite database connection
const db = require("../db");

// Middleware that restricts access to authenticated admin users only
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({
      error: "Unauthorized. Admin login required.",
    });
  }

  next();
}

// Returns all orders and attaches their related order items
router.get("/orders", requireAdmin, (req, res) => {
  const orderQuery = `
    SELECT * FROM orders
    ORDER BY created_at DESC
  `;
  // Execute the query to fetch order items
  db.all(orderQuery, (err, orders) => {
    if (err) {
      console.error("Failed to fetch orders:", err.message);
      return res.status(500).json({
        error: "Failed to fetch orders.",
      });
    }

    const itemsQuery = `
      SELECT * FROM order_items
    `;

    db.all(itemsQuery, (itemsErr, items) => {
      // Handle database errors when retrieving order items
      if (itemsErr) {
        console.error("Failed to fetch order items:", itemsErr.message);
        return res.status(500).json({
          error: "Failed to fetch order items.",
        });
      }

      const ordersWithItems = orders.map((order) => {
        const matchingItems = items.filter(
          (item) => item.order_id === order.id
        );

        // Return a new order object that includes its related items
        return {
          ...order,
          items: matchingItems,
        };
      });
      // Send the completed order data back to the admin dashboard
      res.json(ordersWithItems);
    });
  });
});

// Returns all contact form submissions for admin review
router.get("/contacts", requireAdmin, (req, res) => {
  const query = `
    SELECT * FROM contacts
    ORDER BY created_at DESC
  `;

  db.all(query, (err, rows) => {
    // Handle database errors when retrieving contact info
    if (err) {
      console.error("Failed to fetch contacts:", err.message);
      return res.status(500).json({
        error: "Failed to fetch contacts.",
      });
    }
    // Send the completed contact data back to the admin dashboard
    res.json(rows);
  });
});

//Delete an order and its related order items
router.delete("/orders/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run(`DELETE FROM order_items WHERE order_id = ?`, [id], (itemsErr) => {
      if (itemsErr) {
        console.error("Failed to delete order items:", itemsErr.message);
        return res.status(500).json({
          error: "Failed to delete order items.",
        });
      }

      db.run(`DELETE FROM orders WHERE id = ?`, [id], function (orderErr) {
        if (orderErr) {
          console.error("Failed to delete order:", orderErr.message);
          return res.status(500).json({
            error: "Failed to delete order.",
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            error: "Order not found.",
          });
        }

        res.json({
          message: "Order deleted successfully.",
        });
      });
    });
  });
});


//Delete a contact message
router.delete("/contacts/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM contacts WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Failed to delete contact:", err.message);
      return res.status(500).json({
        error: "Failed to delete contact message.",
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Contact message not found.",
      });
    }

    res.json({
      message: "Contact message deleted successfully.",
    });
  });
});

// Export the router so it can be mounted in server.js
module.exports = router;