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
  console.log('Triggering live database seed...');
  try {
    const seed = await fetchUrl('https://shikkis-production-b372.up.railway.app/api/health/seed');
    console.log('Seed response:', seed.status, JSON.stringify(seed.json || seed.raw, null, 2));

    const health = await fetchUrl('https://shikkis-production-b372.up.railway.app/api/health');
    console.log('Health response:', health.status, JSON.stringify(health.json || health.raw, null, 2));
  } catch (e) {
    console.error('Error fetching:', e.message);
  }
}

testLive();
