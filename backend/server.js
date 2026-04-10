const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "musika_db",
});

const JWT_SECRET = "musika_ai_secret_2026";

//Fetch Genres on the registration form
app.get("/api/genres", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT genre_name FROM music_genre");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch genres" });
  }
});

//Register process
app.post("/api/register", async (req, res) => {
  const { username, email, age, genre, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (username, email, age, genre, password_hash) VALUES (?, ?, ?, ?, ?)",
      [username, email, age, genre, hashedPassword],
    );
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

//Login process
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, rows[0].password_hash);
    if (isMatch) {
      const token = jwt.sign({ id: rows[0].user_id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token, username: rows[0].username });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
