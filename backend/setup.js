const mysql = require("mysql2/promise");

//DB creation if DB does not exist
async function init() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS musika_db`);
  await connection.query(`USE musika_db`);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS music_genre (
      id INT AUTO_INCREMENT PRIMARY KEY,
      genre_name VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  //Genres
  const genres = ["Lofi / Chill", "Classical", "Synthwave", "Jazz", "Ambient"];
  for (const g of genres) {
    await connection.query(
      `INSERT IGNORE INTO music_genre (genre_name) VALUES (?)`,
      [g],
    );
  }

  //Table User creattion
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      age INT,
      genre VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database initialized.");
  process.exit();
}

init().catch(console.error);
