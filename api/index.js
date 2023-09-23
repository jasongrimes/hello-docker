const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const port = process.env.PORT || 4000;

// Create Postgres connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Create Express app
const app = express();
app.use(express.json());
app.use(cors());

// Route GET:/api/hello
app.get("/api/hello", async (req, res) => {
  // res.json({ message: 'Hello from Express' });
  try {
    const result = await db.query('SELECT $1 as message', ['Hello from DB']);
    const { message } = result.rows[0];
    res.json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Hello from Express - DB error", error: "Internal Server Error" });
  }
});

// Start the node server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});