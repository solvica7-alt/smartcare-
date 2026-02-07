const https = require('https');

const options = {
    hostname: 'jsonblob.com',
    port: 443,
    path: '/api/jsonBlob',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    console.log('Location:', res.headers.location);
});

req.on('error', (e) => {
    console.error(e);
});

req.write('{}');
req.end();
