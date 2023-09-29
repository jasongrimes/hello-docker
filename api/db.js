const { Pool } = require("pg");

// Create Postgres connection
const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const getHelloMessages = async () => {
  const messages = [];
  messages.push(`Connecting to DB (${process.env.DB_HOST}) from api (${process.env.HOSTNAME})`);

  let result = await db.query('SELECT $1 AS message', ["Connected to DB"]);
  messages.push(result.rows[0]['message'] + ` from api (${process.env.HOSTNAME})`);

  result = await db.query('SELECT * FROM hello');
  const { message } = result.rows[0];
  messages.push(message);

  return messages;
};

module.exports = {
  getHelloMessages,
};