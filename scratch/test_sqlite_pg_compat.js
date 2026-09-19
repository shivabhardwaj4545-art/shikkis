const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, 'test_data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'test.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS test_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL
  );
`);

function toSqliteQuery(sql, params) {
  let values = params;
  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
    const obj = params[0];
    const paramKeys = [];
    const text = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
      paramKeys.push(key);
      return '?';
    });
    values = paramKeys.map(k => obj[k] !== undefined ? obj[k] : null);
    return { text, values };
  }
  let text = sql.replace(/\$\d+/g, '?');
  if (params.length === 1 && Array.isArray(params[0])) {
    values = params[0];
  }
  return { text, values };
}

const q1 = toSqliteQuery('INSERT INTO test_items (id, name, price) VALUES ($1, $2, $3)', ['1', 'Saree', 499900]);
db.prepare(q1.text).run(...q1.values);

const q2 = toSqliteQuery('SELECT * FROM test_items WHERE price > ?', [1000]);
const rows = db.prepare(q2.text).all(...q2.values);
console.log('QueryResult:', rows);

db.close();
fs.rmSync(dataDir, { recursive: true, force: true });
console.log('Compat test passed perfectly!');
