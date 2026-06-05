const axios = require('axios');

async function reproduce400() {
    const testUrl = 'https://www.instagram.com/p/DZKHK9aE4Nun6JjLBEfJzrASMjiwXEZ-sPh2Gw0/?img_index=1&igsh=MXVycGdkcmZoazlhYQ==';
    
    console.log(`Sending POST /formats with URL: ${testUrl}`);
    try {
        const res = await axios.post('http://localhost:3000/formats', { url: testUrl });
        console.log('✅ Success: Received 200 OK');
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.log(`❌ Failed: Received ${err.response.status}`);
            console.log('Error Data:', err.response.data);
        } else {
            console.log('❌ Failed: Connection error:', err.message);
        }
    }
}

reproduce400();
