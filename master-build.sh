#!/bin/bash
./wattapp_restore.sh
npm install
cd back-end/api || exit 1
./run-backend.sh
cd ../../
./frontend-build.sh  
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh