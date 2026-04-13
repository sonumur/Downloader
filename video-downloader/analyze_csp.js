const http = require('http');

http.get('http://localhost:3000', (res) => {
  const csp = res.headers['content-security-policy'];
  if (!csp) {
    console.log('No CSP header found');
    return;
  }
  console.log('CSP Length:', csp.length);
  // Print hex of first 50 chars
  console.log('Hex (first 100):', Buffer.from(csp.slice(0, 100)).toString('hex'));
  // Check for \r or \n
  const hasCR = csp.includes('\r');
  const hasLF = csp.includes('\n');
  console.log('Has CR (\\r):', hasCR);
  console.log('Has LF (\\n):', hasLF);
  
  // Find where it might be broken
  if (hasCR || hasLF) {
      console.log('Found newline at:', csp.indexOf('\r'), csp.indexOf('\n'));
  }
}).on('error', (err) => {
  console.error('Error:', err.message);
});
