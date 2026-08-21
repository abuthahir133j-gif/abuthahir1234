const fs = require('fs');
const content = fs.readFileSync('AI/png.svg', 'utf8');
const nonB64 = content.replace(/data:image\/[^;]+;base64,[^"]+/g, '[BASE64_IMAGE_DATA]');
console.log(nonB64);
