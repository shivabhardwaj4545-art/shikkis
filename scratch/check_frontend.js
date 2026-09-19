async function checkFrontend() {
  try {
    const res = await fetch('http://localhost:5173');
    console.log('Frontend status code:', res.status);
  } catch (err) {
    console.error('Frontend fetch error:', err.message);
  }
}
checkFrontend();
