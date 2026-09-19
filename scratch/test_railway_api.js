async function testRailwayApi() {
  try {
    const catUrl = 'https://shikkis-production-b372.up.railway.app/api/categories';
    console.log('Fetching:', catUrl);
    const catRes = await fetch(catUrl);
    console.log('Categories Status:', catRes.status);
    const catJson = await catRes.json();
    console.log('Categories Body:', JSON.stringify(catJson, null, 2));

    const prodUrl = 'https://shikkis-production-b372.up.railway.app/api/products';
    console.log('Fetching:', prodUrl);
    const prodRes = await fetch(prodUrl);
    console.log('Products Status:', prodRes.status);
    const prodJson = await prodRes.json();
    console.log('Products Body count:', prodJson.data?.length, 'total:', prodJson.pagination?.total);
  } catch (err) {
    console.error('Railway API Error:', err);
  }
}

testRailwayApi();
