const express = require("express");
const cors = require("cors");
const db = require("./db");

const port = process.env.PORT || 4000;

// Create Express app
const app = express();
app.use(express.json());
app.use(cors());

// Route GET:/api/hello
app.get("/api/hello", async (req, res) => {
  const messages = [`Hello from api (${process.env.HOSTNAME})`];
  try {
    const dbMessages = await db.getHelloMessages();
    messages.push(...dbMessages);
    res.json({ messages });

  } catch (error) {
    console.error(error);
    messages.push(`DB error, check server logs from api (${process.env.HOSTNAME})`)
    res.status(500).json({ messages, error: "Internal Server Error" });
  }
});

// Start the node server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});