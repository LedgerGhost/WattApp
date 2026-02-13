#! /bin/bash

npm install
npm install pm2
pm2 delete server
pm2 start server.js
