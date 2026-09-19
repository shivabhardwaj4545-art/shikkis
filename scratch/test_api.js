async function testApi() {
  try {
    const catRes = await fetch('http://localhost:3001/api/categories');
    const catJson = await catRes.json();
    console.log('API /api/categories response:', JSON.stringify(catJson, null, 2));

    const prodRes = await fetch('http://localhost:3001/api/products');
    const prodJson = await prodRes.json();
    console.log('API /api/products response count:', prodJson?.data?.length, 'total:', prodJson?.pagination?.total);

    const womenRes = await fetch('http://localhost:3001/api/products?gender=women');
    const womenJson = await womenRes.json();
    console.log('API /api/products?gender=women response count:', womenJson?.data?.length, 'total:', womenJson?.pagination?.total);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testApi();
