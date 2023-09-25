#!/bin/sh

# Custom database initialization
# Run by the build process when $PGDATA directory is empty.

NOW=$(date +%Y-%m-%dT%H:%M:%S)
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "CREATE TABLE IF NOT EXISTS hello (id SERIAL PRIMARY KEY, message TEXT);"
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "INSERT INTO hello (message) VALUES ('Hello from db data (written ${NOW} by ${HOSTNAME})');"
