const mysql = require("mysql");
const pool = mysql.createPool({
    host: "localhost",
    database: "soal_tes_backend_intersolusi_teknologi_asia_db",
    user: "root",
    password: ""
});

function executeQuery(q) {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, conn) {
            if (err) {
                reject(err);
            }
            else {
                conn.query(q, function (err, results) {
                    conn.release();
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results);
                    }
                })
            }
        });
    });
}

module.exports = { executeQuery: executeQuery }