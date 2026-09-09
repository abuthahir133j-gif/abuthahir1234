const fs = require('fs');

function getBase64Png(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/data:image\/png;base64,([a-zA-Z0-9+/=]+)/);
    return Buffer.from(match[1], 'base64');
}

const pngBuffer = getBase64Png('AI/PNg.svg');
const iceBuffer = getBase64Png('AI/ICE BLUE ROBOT.svg');

fs.writeFileSync('scratch/png_extracted.png', pngBuffer);
fs.writeFileSync('scratch/ice_extracted.png', iceBuffer);
console.log('PNG size:', pngBuffer.length);
console.log('ICE size:', iceBuffer.length);
