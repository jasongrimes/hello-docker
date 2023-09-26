#!/bin/sh

#
# Custom database initialization script.
#
# Run by the build process when the data directory is empty.
#

NOW=$(date +%Y-%m-%dT%H:%M:%SZ)
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "INSERT INTO hello (message) VALUES ('Hello from db data (${HOSTNAME} wrote at ${NOW})');"
