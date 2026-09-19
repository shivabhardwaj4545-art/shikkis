async function testViteProxy() {
  try {
    const catRes = await fetch('http://localhost:5173/api/categories');
    console.log('Vite proxy /api/categories status:', catRes.status);
    const catJson = await catRes.json();
    console.log('Vite proxy /api/categories body:', JSON.stringify(catJson, null, 2));

    const prodRes = await fetch('http://localhost:5173/api/products?is_featured=true&limit=8');
    console.log('Vite proxy /api/products status:', prodRes.status);
    const prodJson = await prodRes.json();
    console.log('Vite proxy /api/products length:', prodJson.data?.length);
  } catch (err) {
    console.error('Vite proxy fetch error:', err);
  }
}

testViteProxy();
