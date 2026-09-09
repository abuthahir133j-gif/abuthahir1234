const fs = require('fs');

function getPngDimensions(buf) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h };
}

const p = fs.readFileSync('scratch/png_extracted.png');
const i = fs.readFileSync('scratch/ice_extracted.png');

console.log('PNG image dimensions:', getPngDimensions(p));
console.log('ICE image dimensions:', getPngDimensions(i));
