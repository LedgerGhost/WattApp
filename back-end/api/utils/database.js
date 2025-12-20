/* this is for mysql
const mysql = require('mysql2');

 //create connection and export it 
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,
});

module.exports = { pool }; 
*/

const sessions = [];
const reservations=[];
module.exports = {
  points: [
    { pointid: 1, lon:"23.73", lat:"37.98", status:"available", cap:50 },
    { pointid: 2, lon:"23.72", lat:"37.97", status:"charging",  cap:22 },
    { pointid: 3, lon:"23.71", lat:"37.96", status:"reserved",  cap:11 }
  ], sessions, reservations
};
