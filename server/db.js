//Database Setup

//Load environment variables
require("dotenv").config();

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

//Use dbpath from environment if provided
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "../database/bakery.db");

console.log("Using database path:", dbPath);

// Ensure database directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});


db.serialize(() => {
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      price REAL,
      image TEXT
    )
  `);

  // Contact messages
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      pickup_date TEXT NOT NULL,
      fulfillment_type TEXT NOT NULL,
      delivery_street TEXT,
      delivery_apt TEXT,
      delivery_city TEXT,
      delivery_state TEXT,
      delivery_postal_code TEXT,
      special_instructions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order items 
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  //Delete order items after 30 days 
  db.run(`
    DELETE FROM order_items
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE created_at < datetime('now', '-30 days')
    )
  `);

  db.run(`
    DELETE FROM orders
    WHERE created_at < datetime('now', '-30 days')
  `);

  //Delete contact messages after 30 days
  db.run(`
    DELETE FROM contacts
    WHERE created_at < datetime('now', '-30 days')
  `);
});


db.get("SELECT COUNT(*) AS count FROM products", (err, row) => {
  if (err) {
    console.error("Failed to check products table:", err.message);
    return;
  }

  if (row.count > 0) return;

  console.log("Seeding sample bakery products...");

  const insert = db.prepare(`
    INSERT INTO products (name, category, description, price, image)
    VALUES (?, ?, ?, ?, ?)
  `);

  const products = [
    ["Cream Rolls", "pastry", "A crispy rolled pastry filled with sweet cream and topped with powdered sugar and pistachios (Dozen)", 40, "cream_rolls.jpeg"],
    ["Goshe Feel", "pastry", "Crispy pastry that melts in your mouth (50 pieces)", 60, "goshe_feel.jpeg"],
    ["Baklava", "pastry", "Sweet pastry made of thin layers of dough filled with nuts and soaked in honey or syrup (30 pieces)", 50, "baklava.jpeg"],
    ["Kishmish Paneer", "pastry", "Sweet Afghan dessert made with fresh cheese and raisins", 35, "kishmish_paneer.jpeg"],
    ["Sheer Pera", "pastry", "Soft Afghan milk-based sweet made from condensed milk, sugar, and butter topped with pistachios (Dozen)", 30, "sheer_pera.jpeg"],
    ["Kulche Tandoori", "cookie", "Type of cookie that goes well with tea (4 pieces)", 12, "kulche_tandoori.jpeg"],
    ["Kulche Shor", "cookie", "Salty cookie that pairs well with milk tea (20 pieces)", 25, "kulche_shor.jpeg"],
    ["Khajoor", "cookie", "Crunchy exterior with soft interior and perfectly sweet (25 pieces)", 27, "khajoor.jpeg"],
    ["Kulche Nowruzi", "cookie", "Powdered cookies topped with honey and pistachio (6 pieces)", 15, "kulche_nowruzi.jpeg"],
    ["Nashtayee", "cookie", "Soft and fluffy version of Kulche Shor (15 pieces)", 25, "nashtayee.jpeg"],
    ["Kulche Asaali", "cookie", "Cookie with the perfect honey and sweetness ratio (18 pieces)", 25, "kulche_asaali.jpeg"],
    ["Kulche Shireen", "cookie", "Sweet cookie topped with honey and pistachio (20 pieces)", 25, "kulche_shireen.jpeg"],
    ["Kulche Khetayee", "cookie", "Soft textured cookie that melts in your mouth topped with pistachio and honey (25 pieces)", 25, "kulche_khetayee.jpeg"],
    ["Samosa", "pastry", "Puff pastry filled with HALAL ground beef and peas topped with powdered sugar and pistachio (Dozen)", 40, "samosa.jpeg"],
    ["Strawberry Jam Cake", "cake", "Cake filled with jam and topped with strawberry and nuts", 30, "strawberry_jam_cake.jpeg"],
    ["Pistachio Jam Cake", "cake", "Cake filled with jam and topped with pistachio and nuts", 30, "poista_cake.jpeg"],
    ["Roat", "cookie", "Large sweet cookie (12in-$10, 14in-$15, 16in-$20)", 20, "roat.jpeg"],
    ["Sheer Chai", "drink", "Milk tea (Gallon)", 25, "sheerchai.jpeg"],
    ["Qaimagh", "creamer", "Creamer that can be eaten with Sheer Chai or by itself (1 lb.)", 30, "qaimagh.jpeg"],
    ["Maleeda", "pastry", "Made with bread, sugar, cardamom, and pistachio (large tray)", 150, "maleeda.jpeg"],
    ["Fruit Cake", "cake", "A soft, jiggly treat filled with fresh fruit bursts in every bite", 120, "fruit_cake.jpeg"],
  ];

  products.forEach((p) => insert.run(...p));

  insert.finalize((finalizeErr) => {
    if (finalizeErr) {
      console.error("Failed to seed products:", finalizeErr.message);
    } else {
      console.log("Sample bakery products added.");
    }
  });
});

//Export Database
module.exports = db;