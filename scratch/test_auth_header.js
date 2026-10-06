const http = require('http');

function testFetch(authHeader) {
    return new Promise((resolve) => {
        const headers = { 'Accept': 'application/json' };
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        const req = http.request({
            hostname: '187.52.116.48',
            port: 80,
            path: '/api/v1/lms/published-packages/',
            method: 'GET',
            headers
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`Auth "${authHeader || 'NONE'}": Status = ${res.statusCode} | Data length = ${data.length}`);
                resolve();
            });
        });
        req.end();
    });
}

async function run() {
    await testFetch(null);
    await testFetch('Bearer cms_secure_secret_key_12345');
}
run();
