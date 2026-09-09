const fs = require('fs');

// Let's inspect the SVG clipPaths in PNg.svg
const pngSvg = fs.readFileSync('AI/PNg.svg', 'utf8');
const clipMatches = [...pngSvg.matchAll(/<clipPath id="([^"]+)">([\s\S]*?)<\/clipPath>/g)];

console.log('Clip paths in PNg.svg:');
clipMatches.forEach(m => {
    console.log(`- ${m[1]}: ${m[2].trim().replace(/\s+/g, ' ')}`);
});
