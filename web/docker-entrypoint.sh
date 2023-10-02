#!/bin/sh

set -e

# To pass server environment variables to the frontend app config,
# we create outfile attach certain environment variables to the window.env object.
#  outfile will be created from the infile template, with environment variables replaced from the current environment.
[ -d /app/public ] && envsubst_dir=/app/public || envsubst_dir=/usr/share/nginx/html
envsubst_infile=env.js.template
envsubst_outfile=env.js

if command -v envsubst >/dev/null 2>&1; then
  # Use envsubst if available
  echo "Rendering $envsubst_dir/$envsubst_outfile"
  envsubst < "$envsubst_dir/$envsubst_infile" > "$envsubst_dir/$envsubst_outfile"
else
  # Print a warning to stderr
  echo "Warning: 'envsubst' not found. Unable to render '$envsubst_outfile'." >&2
  echo "Note: 'envsubst' can be installed on Debian with 'apt-get install gettext'." >&2
fi

# Start the main application
exec "$@"