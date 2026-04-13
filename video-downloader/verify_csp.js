const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('Status Code:', res.statusCode);
  const csp = res.headers['content-security-policy'];
  console.log('CSP Header Length:', csp ? csp.length : 0);
  console.log('CSP Header:', csp);
}).on('error', (err) => {
  console.error('Error:', err.message);
});
