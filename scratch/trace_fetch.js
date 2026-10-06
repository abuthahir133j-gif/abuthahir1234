const path = require('path');
const http = require('http');
const https = require('https');

function fetchJsonWithHeaders(reqPath, baseUrl, headers = {}, timeoutMs = 3500) {
    return new Promise((resolve, reject) => {
        try {
            const cleanBase = baseUrl || 'http://187.52.116.48';
            const parsedBase = new URL(cleanBase.startsWith('http') ? cleanBase : `http://${cleanBase}`);
            const isHttps = parsedBase.protocol === 'https:';
            const httpLib = isHttps ? https : http;
            const port = Number(parsedBase.port) || (isHttps ? 443 : 80);

            const options = {
                hostname: parsedBase.hostname,
                port: port,
                path: reqPath,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Host': parsedBase.port ? `${parsedBase.hostname}:${port}` : `${parsedBase.hostname}:${port}`,
                    ...headers
                },
                timeout: timeoutMs
            };

            console.log(`Fetching ${reqPath} with Host: ${options.headers.Host} ...`);

            const req = httpLib.request(options, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    console.log(`  -> Status: ${res.statusCode} | Length: ${data.length}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (e) {
                            console.log('  -> JSON parse error:', e.message);
                            resolve(null);
                        }
                    } else {
                        console.log(`  -> Non-2xx response: ${res.statusCode} (${data.substring(0, 80)})`);
                        resolve(null);
                    }
                });
            });

            req.on('error', (err) => {
                console.log(`  -> Request error: ${err.message}`);
                resolve(null);
            });
            req.on('timeout', () => {
                console.log('  -> Request timed out');
                req.destroy();
                resolve(null);
            });
            req.end();
        } catch (err) {
            console.log('  -> Exception:', err.message);
            resolve(null);
        }
    });
}

async function testAll() {
    const baseUrl = 'http://187.52.116.48';
    const clientIp = '192.168.1.13';
    const creds = { apiKey: 'cms_secure_secret_key_12345' };
    const headers = {
        'Authorization': `Bearer ${creds.apiKey}`,
        'X-API-Key': creds.apiKey,
        'X-Client-IP': clientIp,
        'X-Forwarded-For': clientIp
    };

    console.log('--- TEST 1: Bootstrap ---');
    const b = await fetchJsonWithHeaders('/api/v1/sync/bootstrap/', baseUrl, headers);
    console.log('Bootstrap users:', b && b.users ? b.users.length : b);

    console.log('\n--- TEST 2: Packages ---');
    const packageEndpoints = [
        '/api/packages/',
        '/api/v1/lms/published-packages/',
        '/api/v1/lms/packages/',
        '/api/cms/packages/published',
        '/api/v1/content/experiences/?page=1',
        '/api/v1/content/experiences/'
    ];
    for (const ep of packageEndpoints) {
        const p = await fetchJsonWithHeaders(ep, baseUrl, headers);
        console.log(`Endpoint ${ep} returned:`, Array.isArray(p) ? p.length + ' items' : p);
    }
}

testAll();
