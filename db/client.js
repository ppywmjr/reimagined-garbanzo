const { Pool } = require('pg');
const debug = require('debug')('subscription-management:db');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(
      process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            user: process.env.DB_USER || 'dev',
            password: process.env.DB_PASSWORD || 'dev',
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'myapp',
          }
    );

    pool.on('error', (err) => {
      debug('Unexpected error on idle client', err);
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
  getClient: () => getPool().connect(),
  end: () => pool && pool.end(),
};
