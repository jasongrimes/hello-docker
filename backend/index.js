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
  let messages = [`Hello from api (${process.env.HOSTNAME})`];
  try {
    let result = await db.query('SELECT $1 AS message', [`Hello from api connected to db (${process.env.DB_HOST})`]);
    messages.push(result.rows[0]['message']);

    result = await db.query('SELECT * FROM hello');
    const { message } = result.rows[0];
    messages.push(message);

    res.json({ messages });

  } catch (error) {
    console.error(error);
    messages.push('DB error (check server logs)')
    res.status(500).json({ messages, error: "Internal Server Error" });
  }
});

// Start the node server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});