# Hello Docker: web, api and db

A "hello" app with Docker containers for a basic web application, including a web container (Nginx and React), an API container (Node and Express), and a database container (Postgres).

After cloning this repository,
run the hello app like this:

```sh
# In project root directory:
docker-compose up --build
```

Load the app at http://localhost:3000 to see "Hello from DB", and edit `web/src/App.js` to see live changes.

Load the API at http://localhost:4000/api/hello and expect `{"message": "Hello from DB"}`.

## Basic architecture

A simple "hello" application having a JavaScript frontend, a NodeJS API backend, and a database.

Three basic services are broken into three separate Docker containers:

- `web`: The JavaScript frontend (React, in this example), served by Nginx. Nginx also reverse proxies for the Node JS server in the `api` container over a private network. (In production, only the `web` container needs to be publicly accessible on the internet.)
- `api`: The REST API, served by Node JS. (Express, in this example.)
- `db`: A database. (Postgres, in this example.)

In development environments, the three Docker containers run on a single host workstation with `docker-compose`.
In production and testing environments,
the containers can all run on a single EC2 instance initially.
Resource monitoring will indicate what needs to scale and when.

To scale the app, the database can be moved into separate EC2 instances or a managed service,
and multiple api and web containers can be run on different EC2 instances, in different regions. Cloudflare can be used for (free) load balancing across web containers with round-robin DNS, and also for caching, DDoS protection and other security measures.

**File organization:**

- `api/`: The backend REST API
  - `Dockerfile`: Docker config for Node JS container
  - `index.js`: Node server for REST API (in Express.js)
  - `package.json`: NPM packages for backend app
- `web/`: The web server and React frontend
  - `nginx/`:
    - `nginx.conf`: Config for Nginx web server and reverse proxy.
  - `src/`
    - `App.js`: Basic React component that fetches `/api/hello` and renders the output.
  - `Dockerfile`: Docker config for Nginx container
  - `package.json`: NPM packages for frontend app
- `docker-compose.yml`: Orchestrate Docker containers in dev environments.

## Creating hello app

How this app was created.

### Prerequisites

A development environment with `npm`, `docker`, and `git`.

### Create the project directory

Create the project root directory and change into it.

```sh
mkdir hello-docker && cd $_
```

### Create the frontend React app

Open a terminal for your web service (`` ctl-` `` in vscode).

Create a skeleton React app in a new `web/` subdirectory:

```sh
# In the project root directory:
npx create-react-app web
```

Replace `web/src/App.js` with this:

```js
import React, { useEffect, useState } from "react";
import "./App.css";

const apiBaseUrl = process.env.API_BASEURL || "http://localhost:4000";

function App() {
  const [message, setMessage] = useState("Hello from React");

  // Fetch message from /api/hello
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>{message}</h1>
      </header>
    </div>
  );
}

export default App;
```

Test the React app:

```sh
# From the project root directory:
cd web/
npm start
```

Load https://localhost:3000 and expect to see "Hello from React".

Press `ctl-C` to stop the server.

### Create the backend API server

Create a skeleton Node JS app in an `api/` subdirectory.

```sh
# From the project root directory:
mkdir api
cd api
npm init -y
```

#### Create an API server with Express

```sh
npm install express cors nodemon
```

Add `api/index.js` with the following content:

```js
const express = require("express");
const cors = require("cors");

const port = process.env.PORT || 4000;

const app = express();
app.use(express.json());
app.use(cors());

app.get("/api/hello", async (req, res) => {
  res.json({ message: "Hello from Express" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

Test the api server.

```sh
# From the project root directory:
cd api
node index.js
```

Load http://localhost:4000/api/hello and expect this response:

```json
{ "message": "Hello from Express" }
```

Test the frontend app. Start the server by running this again in the web terminal:

```sh
# From the project root directory:
cd web
npm start
```

Load https://localhost:3000 and expect to see "Hello from Express".

Press `ctl-C` in both terminals to stop the servers.

#### Add a database (Postgres)

```sh
# From the project root directory:
cd api
npm install pg
```

Change `api/index.js` to the following:

```js
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
    const result = await db.query("SELECT $1 as message", ["Hello from DB"]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "DB error", error: "Internal Server Error" });
  }
});

// Start the node server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

## Containerizing the hello app

To simplify the orchestration of the different services,
put them in Docker containers and run them in development with `docker-compose`.

### Configure the api container

Create `api/Dockerfile` with the following contents:

```Dockerfile
# base image contains the dependencies and no application code
FROM node:20 as base

# build image inherits from base and adds application code for production
FROM base as prod
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000
CMD ["node", "index.js"]
```

### Configure the web container

Create `web/Dockerfile` with the following contents:

```Dockerfile
FROM node:20 as base

# Stage 1: Build the React application
FROM base as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create a lightweight container to serve the built React app with Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Copy Nginx configuration file
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Configure Nginx server

Create `web/nginx/nginx.conf`, to configure the Nginx web and proxy server:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
    }

    location /api {
        # Reverse proxy to the Node backend
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Additional Nginx configuration for SSL, security, etc. can go here if needed
}
```

### Configure docker compose

Create `docker-compose.yml` in the project root directory:

```yaml
version: "3.8"
services:
  api:
    build:
      context: "./api"
      target: "base"
    command: sh -c "npm install && npx nodemon index.js"
    depends_on:
      - db
    environment:
      NODE_ENV: development
      PORT: 4000
      DB_HOST: db
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: hello
    ports:
      - "4000:4000"
    volumes:
      - ./api:/app

  db:
    image: postgres
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hello
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data:delegated
      # - ./db/initdb.d:/docker-entrypoint-initdb.d/

  web:
    build:
      context: "./web"
      target: "base"
    command: sh -c "npm install && npm start"
    depends_on:
      - api
    environment:
      NODE_ENV: development
      API_BASEURL: http://localhost:4000
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - ./web:/app

volumes:
  postgres-data:
```

## Running hello app in development

Use `docker-compose` to run the app in development environments.
It builds and launches base versions of the `web`, `api`, and `db` containers,
and adds the development node servers and tooling.

Start the hello app containers (building them if necessary) like this:

```sh
# In the project root directory:
docker-compose up --build -d
```

Load http://localhost:3000/ to test the hello world application.

Expect a "Hello" message from React, Express, or the DB, depending on how far things are successfully wired up.
Check the browser console and the server output for any errors.
Edit `web/src/App.js` to see live changes.

You can also load the API directly at http://localhost:4000/api/hello and expect the following response if the database is working:

```
{ message: 'Hello from DB' }
```

To stop the containers:

```sh
# In the project root directory:
docker-compose down
```

## Deploying to production

See [Basic Docker and ECS]() for examples of deploying these containers to production and testing environments on AWS.
