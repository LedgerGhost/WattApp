#!/bin/bash
cp -r front-end/dist/* /usr/share/nginx/html/

chown -R nginx:nginx /usr/share/nginx/html/ 

cp deployment/nginx/nginx.conf /etc/nginx/nginx.conf

nginx -t
systemctl restart nginx
