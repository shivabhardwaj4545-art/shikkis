const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', err => reject(err));
  });
}

async function testLive() {
  console.log('Testing live Railway health endpoint...');
  try {
    const health = await fetchUrl('https://shikkis-production-b372.up.railway.app/api/health');
    console.log('Health status:', health.status);
    console.log('Health response:', JSON.stringify(health.json || health.raw, null, 2));

    const categories = await fetchUrl('https://shikkis-production-b372.up.railway.app/api/categories');
    console.log('Categories status:', categories.status);
    console.log('Categories response:', JSON.stringify(categories.json || categories.raw, null, 2));
  } catch (e) {
    console.error('Error fetching:', e.message);
  }
}

testLive();
