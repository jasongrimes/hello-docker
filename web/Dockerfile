# The "base" image contains the dependencies and no application code
FROM node:20 as base
WORKDIR /app

# Specify any custom OS packages or other dependencies here.
# These dependencies will be available in development and build environments.
RUN apt-get update && apt-get install -y \
  gettext

ENTRYPOINT [ "/app/docker-entrypoint.sh" ]

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

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT [ "/docker-entrypoint.sh" ]

# Create a docker-entrypoint.sh script to regenerate env.js when the container starts.
# The "envsubstr" tool is included in the official nginx image.
# (In the node image, it had to be installed separately with the gettext package.)
# RUN echo '#!/bin/sh' > /docker-entrypoint.sh \
#   && echo 'set -e' >> /docker-entrypoint.sh \
#   && echo 'envsubst < /usr/share/nginx/html/env.js.template > /usr/share/nginx/html/env.js' >> /docker-entrypoint.sh \
#   && echo 'exec "$@"' >> /docker-entrypoint.sh \
#   && chmod +x /docker-entrypoint.sh

# Copy Nginx configuration file, if needed
#COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]