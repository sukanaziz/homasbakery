// Main server file for the Homas Bakery application.
// Configures middleware, sessions, static files, API routes, admin page protection,
// and starts the Express server.

require("dotenv").config();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error("Admin credentials are missing from .env");
}
// Import core dependencies and middleware
const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

// Import database connection
const db = require("./db");

// Import route modules
const productRoutes = require("./routes/products");
const contactRoutes = require("./routes/contacts");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionDbDir =
  process.env.NODE_ENV === "production"
    ? "/var/data"
    : path.join(__dirname, "../data");

app.set("trust proxy", 1);

app.use(
  session({
    // Store session data in a SQLite database file
    store: new SQLiteStore({
      db: "sessions.db",
      dir: sessionDbDir,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Configure session cookie settings
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// Serve frontend files from the "public" directory
app.use(express.static(path.join(__dirname, "../public")));

// Mount route handlers under specific API paths
app.use("/api/products", productRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

app.get("/api", (req, res) => {
  res.json({ message: "Homas Bakery backend is running!" });
});

// Middleware to protect admin-only pages
function requireAdminPage(req, res, next) {
  if (!req.session.isAdmin) {
    return res.redirect("/admin-login.html");
  }

  next();
}

// Serve admin dashboard only if authenticated
app.get("/admin", requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin.html"));
});
// Start server and listen on defined port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

