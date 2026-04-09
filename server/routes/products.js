// Import required dependencies
const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define the directory where uploaded product images will be stored
const uploadDir = path.join(__dirname, "../../public/uploads");

// Ensure the upload directory exists
fs.mkdirSync(uploadDir, { recursive: true });

// Configure how uploaded files are stored on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

// Restrict uploads to supported image formats only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
  }
};

// Initialize multer with storage rules, file validation, and size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

// Simple admin session guard for protected routes
function requireAdmin(req, res) {
  if (!req.session.isAdmin) {
    res.status(401).json({
      error: "Unauthorized. Admin login required.",
    });
    return false;
  }

  return true;
}

// Safely delete an uploaded image file if it exists
function deleteImageFile(imageValue) {
  if (!imageValue) return;

  const filePath = path.join(uploadDir, path.basename(imageValue));

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn("Failed to delete image file:", err.message);
    }
  });
}

// Public route: return all products sorted by category and name
router.get("/", (req, res) => {
  const query = `
    SELECT * FROM products
    ORDER BY
      CASE category
        WHEN 'pastry' THEN 1
        WHEN 'cookie' THEN 2
        WHEN 'cake' THEN 3
        WHEN 'drink' THEN 4
        WHEN 'creamer' THEN 5
        ELSE 6
      END,
      name
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Failed to fetch products:", err.message);
      return res.status(500).json({
        error: "Failed to fetch products.",
      });
    }

    res.json(rows);
  });
});

// Admin route: add a new product with optional image upload
router.post("/", upload.single("imageFile"), (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { name, category, description, price } = req.body;

  const trimmedName = name?.trim();
  const trimmedCategory = category?.trim().toLowerCase();
  const trimmedDescription = description?.trim();
  const numericPrice = Number(price);

  const validCategories = ["pastry", "cookie", "cake", "drink", "creamer"];

  // Validate required fields
  if (
    !trimmedName ||
    !trimmedCategory ||
    !trimmedDescription ||
    price === undefined ||
    price === ""
  ) {
    // Clean up uploaded file if validation fails after upload
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Name, category, description, and price are required.",
    });
  }

  // Validate category
  if (!validCategories.includes(trimmedCategory)) {
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Invalid category.",
    });
  }

  // Validate price
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Price must be 0 or greater.",
    });
  }

  const imagePath = req.file ? `uploads/${req.file.filename}` : "";

  const query = `
    INSERT INTO products (name, category, description, price, image)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [trimmedName, trimmedCategory, trimmedDescription, numericPrice, imagePath],
    function (err) {
      if (err) {
        console.error("Failed to add product:", err.message);

        // Remove uploaded file if DB insert fails
        if (req.file) deleteImageFile(req.file.filename);

        return res.status(500).json({
          error: "Failed to add product.",
        });
      }

      res.status(201).json({
        message: "Product added successfully.",
        productId: this.lastID,
      });
    }
  );
});

// Admin route: update an existing product with optional new image upload
router.put("/:id", upload.single("imageFile"), (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const { name, category, description, price } = req.body;

  const trimmedName = name?.trim();
  const trimmedCategory = category?.trim().toLowerCase();
  const trimmedDescription = description?.trim();
  const numericPrice = Number(price);

  const validCategories = ["pastry", "cookie", "cake", "drink", "creamer"];

  // Validate required fields
  if (
    !trimmedName ||
    !trimmedCategory ||
    !trimmedDescription ||
    price === undefined ||
    price === ""
  ) {
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Name, category, description, and price are required.",
    });
  }

  // Validate category
  if (!validCategories.includes(trimmedCategory)) {
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Invalid category.",
    });
  }

  // Validate price
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    if (req.file) deleteImageFile(req.file.filename);

    return res.status(400).json({
      error: "Price must be 0 or greater.",
    });
  }

  // Look up the current product first
  db.get(`SELECT * FROM products WHERE id = ?`, [id], (findErr, existingProduct) => {
    if (findErr) {
      console.error("Failed to find product:", findErr.message);

      if (req.file) deleteImageFile(req.file.filename);

      return res.status(500).json({
        error: "Failed to load product.",
      });
    }

    if (!existingProduct) {
      if (req.file) deleteImageFile(req.file.filename);

      return res.status(404).json({
        error: "Product not found.",
      });
    }

    const imagePath = req.file
      ? `uploads/${req.file.filename}`
      : existingProduct.image;

    const query = `
      UPDATE products
      SET name = ?, category = ?, description = ?, price = ?, image = ?
      WHERE id = ?
    `;

    db.run(
      query,
      [trimmedName, trimmedCategory, trimmedDescription, numericPrice, imagePath, id],
      function (err) {
        if (err) {
          console.error("Failed to update product:", err.message);

          // Remove newly uploaded image if update fails
          if (req.file) deleteImageFile(req.file.filename);

          return res.status(500).json({
            error: "Failed to update product.",
          });
        }

        if (this.changes === 0) {
          if (req.file) deleteImageFile(req.file.filename);

          return res.status(404).json({
            error: "Product not found.",
          });
        }

        // Delete old image only after successful update
        if (req.file && existingProduct.image) {
          deleteImageFile(existingProduct.image);
        }

        res.json({
          message: "Product updated successfully.",
        });
      }
    );
  });
});

// Admin route: delete a product and its stored image if present
router.delete("/:id", (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  // Get product first so its image path can be removed after deletion
  db.get(`SELECT image FROM products WHERE id = ?`, [id], (findErr, product) => {
    if (findErr) {
      console.error("Failed to find product:", findErr.message);
      return res.status(500).json({
        error: "Failed to load product.",
      });
    }

    if (!product) {
      return res.status(404).json({
        error: "Product not found.",
      });
    }

    db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
      if (err) {
        console.error("Failed to delete product:", err.message);
        return res.status(500).json({
          error: "Failed to delete product.",
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: "Product not found.",
        });
      }

      // Remove image file after successful deletion
      if (product.image) {
        deleteImageFile(product.image);
      }

      res.json({
        message: "Product deleted successfully.",
      });
    });
  });
});

// Handle upload errors cleanly
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "File upload error. The file may be too large.",
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message,
    });
  }

  next();
});

// Export router
module.exports = router;