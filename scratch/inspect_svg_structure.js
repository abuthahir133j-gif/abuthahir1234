const fs = require('fs');

const svgContent = fs.readFileSync('AI/PNg.svg', 'utf8');

console.log('=== SVG CLIPS & ELEMENTS INSPECTION ===');
const lines = svgContent.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('<clipPath') || line.startsWith('<g id=') || line.startsWith('<ellipse') || line.startsWith('<path') || line.startsWith('<rect') || line.startsWith('<image')) {
        if (!line.includes('base64')) {
            console.log(`L${i + 1}: ${line}`);
        } else {
            console.log(`L${i + 1}: <image id="buddy-char-asset" width="672" height="1024" ... (base64 embedded png) />`);
        }
    }
}
