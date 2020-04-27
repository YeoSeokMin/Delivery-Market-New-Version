const mysql = require('mysql2');
const dbConnection = mysql.createPool({
    host     : '공백', // heroku ClearDB HOST NAME
    port     :  3306,
    user     : '공백', // heroku ClearDB MYSQL USERNAME
    password : '공백', // heroku ClearDB MYSQL PASSWORD
    database : 'heroku_edcf1d74c2eff41' // heroku ClearDB MYSQL DB NAME
}).promise();

module.exports = dbConnection;