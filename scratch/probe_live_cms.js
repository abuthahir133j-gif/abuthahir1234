const http = require('http');

const host = '187.52.116.48';
const endpoints = [
    '/',
    '/api/packages/',
    '/api/packages',
    '/api/lms/packages/',
    '/api/lms/packages',
    '/api/v1/lms/packages/',
    '/api/v1/lms/published-packages/',
    '/api/v1/content/experiences/',
    '/api/v1/sync/bootstrap/',
    '/api/v1/sync/lessons/package/',
    '/api/cms/packages/',
    '/api/schema/',
    '/api/docs/'
];

async function probe() {
    for (const ep of endpoints) {
        await new Promise((resolve) => {
            const req = http.get(`http://${host}${ep}`, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`[${res.statusCode}] ${ep} (${body.length} bytes) -> ${body.substring(0, 120).replace(/\n/g, ' ')}`);
                    resolve();
                });
            });
            req.on('error', (err) => {
                console.log(`[ERR] ${ep} -> ${err.message}`);
                resolve();
            });
            req.setTimeout(5000, () => {
                console.log(`[TIMEOUT] ${ep}`);
                req.destroy();
                resolve();
            });
        });
    }
}

probe();
