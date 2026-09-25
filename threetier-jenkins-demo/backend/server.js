// server.js - Application tier
// Talks to the frontend over REST/JSON, and to MySQL over the mysql2 driver.

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// --- Database connection pool (Tier 3) ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "contactsdb",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// --- Health check (used by Docker/Jenkins/load balancer) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "backend" });
});

// --- Get all contacts ---
app.get("/api/contacts", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, phone FROM contacts ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Add a contact ---
app.post("/api/contacts", async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)",
      [name, email, phone || null]
    );
    res.status(201).json({ id: result.insertId, name, email, phone });
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Delete a contact ---
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contacts WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error("DB error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
