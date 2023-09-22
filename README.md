# Hello Docker: web, api and db

A "hello" app with Docker containers for a basic web application, including a web container (Nginx and React), an API container (Node and Express), and a database container (Postgres).

After cloning this repository,
run the hello app development environment like this:

```sh
# In project root directory:
docker-compose up --build
```

Load the web app at http://localhost:3000 to see "Hello from DB", and edit `web/src/App.js` to see live changes.

Load the API at http://localhost:4000/api/hello and expect `{"message": "Hello from DB"}`.

Press `ctl-C` in the docker-compose terminal to stop the containers.

## Basic architecture

This is a simple "hello" application with a JavaScript frontend, a NodeJS API backend, and a database.

These three basic services are broken into three separate Docker containers:

- `api`: The REST API, served by Node JS. (Express, in this example.)
- `db`: A database. (Postgres, in this example.)
- `web`: The JavaScript frontend (React, in this example), served by Nginx. Nginx also reverse proxies for the Node JS server in the `api` container over a private network. In production, only the `web` container needs to be publicly accessible on the internet.

In development environments, use `docker-compose` to run all the containers on the one development host.
In production and testing environments,
the containers can all run on a single EC2 instance initially.
Resource monitoring can indicate what needs to scale and when.

To scale the app later, the database can be moved into separate EC2 instances or a managed service; multiple api and web containers can be run on different EC2 instances, in different regions; and Cloudflare can be used for (free) load balancing across web containers with round-robin DNS, plus caching, DDoS protection and other security measures.

**File organization:**

- `api/`: The backend REST API
  - `Dockerfile`: Docker config for Node JS container
  - `index.js`: Node server for REST API (in Express.js)
  - `package.json`: NPM packages for backend app
- `db/`:
  - `initdb.d/`: DB config scripts executed when the db container volume is first created.
- `web/`: The web server and React frontend
  - `nginx/`:
    - `nginx.conf`: Config for Nginx web server and reverse proxy.
  - `src/`
    - `App.js`: Basic React component that fetches a hello message from the api server and renders the output.
  - `Dockerfile`: Docker config for Nginx container
  - `package.json`: NPM packages for frontend app
- `docker-compose.yml`: Orchestrate Docker containers in dev environments.

## Creating a hello app

How this app was created.

### Prerequisites

A development environment with `npm`, `docker`, and `git`.

### Create the project directory

Create the project root directory and change into it.

```sh
mkdir hello-docker && cd $_
```

### Create the frontend React app

Create a skeleton React app in a new `web/` subdirectory:

Open a terminal for the web service (`` ctl-` `` in vscode).

```sh
# In the web terminal, in the project root directory:
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
# In the web terminal, from the project root directory:
cd web
npm start
```

Load https://localhost:3000 and expect to see "Hello from React".

Press `ctl-C` to stop the server.

### Create the backend API server

Create a skeleton Node JS app in an `api/` subdirectory.

Open a terminal for the api service (`` ctl-shift-` `` in vscode)

```sh
# In the api terminal, from the project root directory:
mkdir api
cd api
npm init -y
```

#### Create an API server with Express

```sh
# In the api terminal
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

Configure an `npm start` command in `api/package.json`:

```.json
  "scripts": {
    "start": "nodemon index.js"
  },
```

Test the api server.

```sh
# In the api terminal, from the project root directory:
cd api
npm start
```

Load http://localhost:4000/api/hello and expect `{ "message": "Hello from Express" }`.

Test the frontend app. Start the web server:

```sh
# In the web terminal, from the project root directory:
cd web
npm start
```

Load https://localhost:3000 and expect "Hello from Express".

Press `ctl-C` in both terminals to stop the servers.

### Add a database (Postgres)

```sh
# In the api terminal, from the project root directory:
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

Start the database. Open a new terminal for the db service (`` ctl-shift-` `` in vscode):

```sh
# In the db terminal
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

Test the api server with the database:

```sh
# In the api terminal, from the project root directory:
cd api
DB_USER=postgres DB_PASSWORD=postgres npm start
```

Load http://localhost:4000/api/hello and expect `{"message":"Hello from DB"}`.

Test the frontend app with the database:

```sh
# In the web terminal, from the project root directory:
cd web
npm start
```

Load https://localhost:3000 and expect "Hello from DB".

Press `ctl-C` in all three terminals to shut down the servers.

## Containerizing the hello app

To simplify orchestration of the different services,
put them in Docker containers and run them in development with `docker-compose`.

### Configure docker compose

Create `docker-compose.yml` in the project root directory:

```yaml
version: "3.8"
services:
  api:
    # build:
    #   context: "./api"
    #   target: "base"
    image: node:20
    command: sh -c "npm install && npm start"
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
    # build:
    #   context: "./web"
    #   target: "base"
    image: node:20
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


## Deploying to production

See [Basic Docker and ECS]() for examples of deploying these containers to production and testing environments on AWS.
