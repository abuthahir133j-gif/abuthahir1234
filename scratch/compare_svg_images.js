const fs = require('fs');

const pngContent = fs.readFileSync('AI/PNg.svg', 'utf8');
const iceContent = fs.readFileSync('AI/ICE BLUE ROBOT.svg', 'utf8');

// Check the base64 image dimensions or headers
const pngMatch = pngContent.match(/<image[^>]+xlink:href="([^"]+)"/);
const iceMatch = iceContent.match(/<image[^>]+xlink:href="([^"]+)"/);

console.log('PNG img found:', !!pngMatch);
console.log('ICE img found:', !!iceMatch);

// Extract width and height attributes
const pngTag = pngContent.match(/<image[^>]+>/)[0];
const iceTag = iceContent.match(/<image[^>]+>/)[0];
console.log('PNG image tag:', pngTag.substring(0, 120));
console.log('ICE image tag:', iceTag.substring(0, 120));
