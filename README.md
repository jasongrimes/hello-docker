# Hello Docker: React, Express, and Postgres

A "hello" app used as a placeholder while setting up Docker containers for a web application.

The app has three simple containerized services in Docker: a web container (Nginx/Node and React), an API container (Node and Express), and a database container (Postgres).

The web app fetches a record from the database via the API, and renders a stack of hello messages received from each service along the way.

## Running the hello application in development

Requires [Docker Compose](https://docs.docker.com/compose/install/).

Clone this repository and run  docker compose:

```sh
# In the project root directory:
docker compose up --build
```

Then load the web app at http://localhost:3000. 

Edit `web/src/App.js` to see live changes.

![hello-docker-web1](https://github.com/jasongrimes/hello-docker/assets/847646/c0b295a1-ccaa-4fdc-9929-2571ce6d43fd)

Check the browser console and the server output for any errors.

In development, the API can be loaded at http://localhost:4001/api/hello.

![hello-docker-api](https://github.com/jasongrimes/hello-docker/assets/847646/08b7950b-a54c-4154-a193-ee9992525159)

Press `ctl-C` in the docker-compose terminal to stop the containers.

## Building and running for production and test

When building the containers, tag them with the current Git commit SHA.

```sh
# In the project root directory:
COMMIT_SHA=$(git rev-parse HEAD)
docker build -t hello-api:$COMMIT_SHA -t hello-api:latest api
docker build -t hello-web:$COMMIT_SHA -t hello-web:latest web
```

List the images:

```sh
docker image ls
```

Running the images:

```sh
docker network create --driver bridge hello-net
docker run --rm -d \
  --name=db \
  --network hello-net \
  -e POSTGRES_PASSWORD=postgres \
  postgres
docker run --rm -d --init \
  --name=api \
  --network hello-net \
  -p 4002:4000  \
  -e DB_HOST=db -e  DB_USER=postgres -e DB_PASSWORD=postgres \
  hello-api
docker run --rm -d \
  --name=web \
  -p 80:80 \
  -e API_BASEURL=http://localhost:4002 \
  hello-web
```

Load the production build at http://localhost.

## Infrastructure

In development environments, use docker compose to run all the containers on one development host.

In production and testing environments,
the containers can all run on a single EC2 instance initially.
Resource monitoring can indicate what needs to scale and when.

To scale the app later, the database can be moved into separate EC2 instances or a managed service; multiple api and web containers can be run on different EC2 instances, in different regions; and Cloudflare can be used for (free) load balancing across web containers with round-robin DNS, along with caching, DDoS protection and other security measures.

## File organization

- `api/`: The backend REST API
  - `Dockerfile`: Docker config for backend Node JS container
  - `index.js`: Node server for REST API (in Express.js)
  - `package.json`: NPM packages for backend app
- `db/`: Database configuration
  - `initdb.d/`: DB config scripts executed when the database is first initialized (i.e. when the data volume is empty)
- `web/`: The JavaScript frontend
  - `public/`
    - `env.js.template`: Environment variables replaced on the web server at runtime into a new file called `env.js`, to make them available for configuring the frontend app.
  - `src/`
    - `App.js`: Basic React component that fetches a record from the database and renders hello messages from each service along the way.
  - `Dockerfile`: Docker config for frontend Nginx/Node container
  - `package.json`: NPM packages for frontend app
- `docker-compose.yml`: Docker compose config to orchestrate containers in dev environments

## Creating the hello app

How this app was created.

### Prerequisites

A development environment with `npm`, `docker`, and `git`.

### Create the project directory

Create the project root directory and change into it.

```sh
mkdir hello-docker && cd $_
```

### Create the frontend React app

Open a terminal for the web service (`` ctl-` `` in vscode).

Create a skeleton React app in a new `web/` subdirectory:

```sh
# In the web terminal, in the project root directory:
npx create-react-app web
cd web
```

Replace `web/src/App.js` with this:

```js
import React, { useEffect, useState } from "react";
import "./App.css";

window.env = window.env || {};
const apiBaseUrl = window.env.API_BASEURL || "http://localhost:4000";

function App() {
  const [messages, setMessages] = useState([
    `Hello from web (${window.env.HOSTNAME})`,
  ]);

  // Fetch message from /api/hello
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/hello`)
      .then((response) => response.json())
      .then((data) => {
        setMessages([
          ...messages,
          `...web fetched api (${apiBaseUrl}/api/hello)`,
          ...data.messages,
        ]);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hello Docker</h1>
        <ul>
          {messages.map((message) => (
            <li style={{ textAlign: "left" }}>{message}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
```

Test the React app:

```sh
# In the web terminal, in the web/ directory:
npm start
```

Load http://localhost:3000 and expect to see "Hello from React".

Press `ctl-C` to stop the server.

### Create the backend API server

Open a terminal for the api service (`` ctl-shift-` `` in vscode).

Create a skeleton Node JS app in an `api/` subdirectory.

```sh
# In the api terminal, from the project root directory:
mkdir api
cd api
npm init -y
```

Create a simple API server with Express.

```sh
# In the api terminal, in the api/ directory
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
# In the api terminal, in the api/ directory:
npm start
```

Load http://localhost:4000/api/hello and expect `{ "message": "Hello from Express" }`.

Test the frontend app. Start the web server:

```sh
# In the web terminal, in the web/ directory:
npm start
```

Load https://localhost:3000 and expect "Hello from Express".

Press `ctl-C` in both terminals to stop the servers.

### Add a database (Postgres)

```sh
# In the api terminal, in the api/ directory:
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
    const { message } = result.rows[0];
    res.json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Hello from Express - DB error",
      error: "Internal Server Error",
    });
  }
});

// Start the node server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

Start the database. Open a new terminal for the db service (`` ctl-shift-` `` in vscode):

```sh
# In the db terminal, in any directory
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
```

Test the api server with the database:

```sh
# In the api terminal, in the api/ directory:
DB_USER=postgres DB_PASSWORD=postgres npm start
```

Load http://localhost:4000/api/hello and expect `{"message":"Hello from DB"}`.

Test the frontend app with the database:

```sh
# In the web terminal, in the web/ directory:
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
  web:
    image: node:20
    # build:
    #   context: "./web"
    #   target: "base"
    volumes:
      - ./web:/app
    working_dir: /app
    environment:
      NODE_ENV: development
      PORT: 3000
      API_BASEURL: http://localhost:4001
    init: true
    command: sh -c "npm install && npm run envsubst && npm start"
    ports:
      - "3000:3000"
    depends_on:
      - api

  api:
    image: node:20-slim
    # build:
    #   context: "./api"
    #   target: "base"
    volumes:
      - ./api:/app
    working_dir: /app
    environment:
      NODE_ENV: development
      PORT: 4001
      DB_HOST: db
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: hello
    init: true
    command: sh -c "npm install && npm start"
    ports:
      - "4001:4001"
    depends_on:
      - db

  db:
    image: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data:delegated
      - ./db/initdb.d:/docker-entrypoint-initdb.d/
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hello
    ports:
      - "5432:5432"
    restart: always

volumes:
  postgres-data:
```

Start the containers with `docker-compose up`.

## Customizing the container images

The `docker-compose` file above uses the standard official Docker images for `node` and `postgres`.

To prepare images for production deployment,
or to add custom operating system packages or other dependencies,
custom images need to be built.

This is done by adding a custom `Dockerfile` for an image,
and updating `docker-compose.yml` to describe the `build` context instead of just specifying an official `image`.

### Customize the web image

Since the web frontend is served as static files, best practice recommends the production image serve it with Nginx instead of Node. Additional customization is needed to share environment variables with the runtime JavaScript application, for easy configuration by the container orchestrator.

Create `web/Dockerfile` with the following contents:

```Dockerfile
# The "base" image contains the dependencies and no application code
FROM node:20 as base

# Specify any custom OS packages or other dependencies here.
# These dependencies will be available in development and build environments.
RUN apt-get update && apt-get install -y \
  gettext

# The "build" image inherits from "base", and adds application code for production
# Dev environments do not include this part--they run a separate startup command defined in docker-compose.yml.
#
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

# Create a docker-entrypoint.sh script to regenerate env.js when the container starts.
# The "envsubstr" tool is included in the official nginx image.
# (In the node image, it had to be installed separately with the gettext package.)
RUN echo '#!/bin/sh' > /docker-entrypoint.sh \
  && echo 'set -e' >> /docker-entrypoint.sh \
  && echo 'envsubst < /usr/share/nginx/html/env.js.template > /usr/share/nginx/html/env.js' >> /docker-entrypoint.sh \
  && echo 'exec "$@"' >> /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh

# Copy Nginx configuration file, if needed
#COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Make the web image configurable with environment variables

Docker containers need to be configurable by environment variables,
but a JavaScript frontend app runs in a client web browser,
and doesn't have access to environment in the server container.
To work around this,
a publicly accessible file called `env.js` is created that defines the needed environment variables as global JavaScript variables on the `window.env` object.

`env.js` is created by defining a `env.js.template` file with environment variable placeholders, which are replaced using the system tool `envsubstr`.

The production image generates the `env.js` file when the container starts, using `docker-entrypoint.sh`. For the dev image, `envsubstr` needs to be explicitly installed (with the "gettext" package), and npm scripts are customized to run it at build time.

Create `web/public/env.js.template` with the following contents:

```js
// Publicly visible runtime environment variable config for the JavaScript frontend.
//
// DO NOT EDIT env.js. YOUR CHANGES WILL BE OVERWRITTEN.
// Make changes in env.js.template instead.
//
// Generate env.js from env.js.template with "envsubst", like this:
//   envsubst < env.js.template > env.js
//
window.env = {
  HOSTNAME: "$HOSTNAME",
  API_BASEURL: "$API_BASEURL",
};
```

Add an `npm run config` script for populating the runtime environment variables in the devlopment environment. Add the following to the `scripts` section in `web/package.json`:

```js
  "scripts": {
    "envsubst": "envsubst < public/env.js.template > public/env.js",
    "prebuild": "npm run envsubst",
    // ...
```

### Customize the api image

Create `api/Dockerfile` with the following contents:

```Dockerfile
# "base" image contains the dependencies and no application code
FROM node:20 as base

# Specify any custom OS packages or other dependencies here.
# These dependencies will be available in all environments.
#
# RUN apt-get update && apt-get install ...
#


# "prod" image inherits from "base", and adds application code for production
# Dev environments do not include this part--they run a separate startup command defined in docker-compose.yml.
FROM base as prod
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 4000
CMD ["node", "index.js"]
```

### Initialize the database

The `postgres` image supports running custom initialization scripts when the database is first created.
(This is common in database Docker images.)

Create a `db/initdb.d/` directory, and add one or more _.sql, _.sql.gz, or \*.sh files to be run when the database is first created.
Note that postgres only runs the init scripts **if the postgres data directory is empty**.

To cause the init scripts to be run again, remove the `postgres-data` volume (_which deletes all data_):

```sh
# In the db terminal, in the project root directory:
docker compose rm
docker volume rm hello-docker_postgres-data
```

### Update docker-compose.yml to use customized images

```yaml
version: "3.8"
services:
  web:
    #image: node:20
    build:
      context: "./web"
      target: "base"
    volumes:
      - ./web:/app
    working_dir: /app
    environment:
      NODE_ENV: development
      PORT: 3000
      API_BASEURL: http://localhost:4001
    init: true
    command: sh -c "npm install && npm run envsubst && npm start"
    ports:
      - "3000:3000"
    depends_on:
      - api

  api:
    #image: node:20-slim
    build:
      context: "./api"
      target: "base"
    volumes:
      - ./api:/app
    working_dir: /app
    environment:
      NODE_ENV: development
      PORT: 4001
      DB_HOST: db
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_DATABASE: hello
    init: true
    command: sh -c "npm install && npm start"
    ports:
      - "4001:4001"
    depends_on:
      - db

  db:
    image: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data:delegated
      - ./db/initdb.d:/docker-entrypoint-initdb.d/
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hello
    ports:
      - "5432:5432"
    restart: always

volumes:
  postgres-data:
```

### Build and run custom images in development

```sh
# In project root directory:
docker-compose up --build
```

## Build stand-alone Docker images

Docker images should be tagged with the SHA of the current Git commit.

If necessary, create a Git repository with a initial commit in the project root directory.

```sh
# In the project root directory:
git init
git add .
git commit -m 'Initial commit: Hello app for Docker, web, api, and db (nginx, react, express, postgres).'
```

Get the current Git commit SHA and build the containers:

```sh
# In the project root directory:
COMMIT_SHA=$(git rev-parse HEAD)
docker build -t hello-api:$COMMIT_SHA -t hello-api:latest api
docker build -t hello-web:$COMMIT_SHA -t hello-web:latest web
```

List the images:

```sh
docker image ls
```

Running the images:

```sh
docker network create --driver bridge hello-net
docker run --rm -d --name=db --network hello-net -e POSTGRES_PASSWORD=postgres postgres
docker run --rm -d --name=api -p 4002:4000 --network hello-net --init -e DB_HOST=db -e  DB_USER=postgres -e DB_PASSWORD=postgres hello-api
docker run --rm -d --name=web -p 80:80 -e REACT_APP_API_BASEURL=http://localhost:4002 hello-web
```
