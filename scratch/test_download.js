const http = require('http');
const fs = require('fs');
const path = require('path');

const downloadUrl = 'http://187.52.116.48/api/lms/packages/2/download/';
console.log(`Testing download from ${downloadUrl}...`);

http.get(downloadUrl, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`Downloaded ${buffer.length} bytes`);
        const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 300));
        console.log('Sample content (first 300 chars):', str);
        
        // Test if zip (PK header: 0x50 0x4B)
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
            console.log('Header is ZIP/PK archive!');
        } else {
            try {
                const json = JSON.parse(buffer.toString('utf-8'));
                console.log('Header is direct JSON! Keys:', Object.keys(json));
            } catch(e) {
                console.log('Unknown format');
            }
        }
    });
});
