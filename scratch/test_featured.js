async function testFeatured() {
  const res = await fetch('http://localhost:3001/api/products?is_featured=true&limit=8');
  const json = await res.json();
  console.log('Featured products count:', json.data?.length, 'Total:', json.pagination?.total);
  if (json.data) {
    console.log('Sample product images:', json.data.map(p => ({ id: p.id, name: p.name, images: p.images })));
  }
}
testFeatured();
