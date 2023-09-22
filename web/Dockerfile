# base image contains the dependencies and no application code
FROM node:20 as base
WORKDIR /app

# build image inherits from base and adds application code
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