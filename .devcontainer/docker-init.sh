#!/usr/bin/env bash

if docker volume create --name dev-app &> /dev/null; then
  echo "Created volume dev-app"
else
  echo "Failed to create volume dev-app"
fi

docker network create dev-app-network &> /dev/null
if [ "$?" -ne "0" ]; then
  echo "Network dev-app-network already exists"
else
  echo "Created docker network dev-app-network"
fi
