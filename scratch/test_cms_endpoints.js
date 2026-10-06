const http = require('http');

const endpoints = [
    '/api/packages/',
    '/api/v1/content/experiences/',
    '/api/v1/content/packages/',
    '/api/v1/lms/packages/',
    '/api/v1/lms/published-packages/',
    '/api/lms/packages/',
    '/api/v1/sync/lessons/package/',
    '/api/v1/sync/bootstrap/'
];

async function checkEndpoints() {
    for (const ep of endpoints) {
        await new Promise((resolve) => {
            http.get('http://127.0.0.1:8000' + ep, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`${ep} -> Status ${res.statusCode}: ${body.substring(0, 150)}`);
                    resolve();
                });
            }).on('error', (err) => {
                console.log(`${ep} -> Error: ${err.message}`);
                resolve();
            });
        });
    }
}
checkEndpoints();
