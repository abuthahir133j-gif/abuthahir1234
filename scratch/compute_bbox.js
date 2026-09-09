const fs = require('fs');
const zlib = require('zlib');

function getAlphaBoundingBox(buf) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    
    let offset = 8;
    const idatChunks = [];
    while (offset < buf.length) {
        const len = buf.readUInt32BE(offset);
        const type = buf.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') {
            idatChunks.push(buf.slice(offset + 8, offset + 8 + len));
        }
        offset += 12 + len;
    }
    const uncompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    
    // Each row has 1 filter byte + w * 4 bytes
    const rowStride = 1 + w * 4;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    
    for (let y = 0; y < h; y++) {
        const rowStart = y * rowStride + 1;
        for (let x = 0; x < w; x++) {
            const alpha = uncompressed[rowStart + x * 4 + 3];
            if (alpha > 20) { // non-transparent
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    return { w, h, minX, maxX, minY, maxY, bboxWidth: maxX - minX + 1, bboxHeight: maxY - minY + 1 };
}

console.log('PNG BBox:', getAlphaBoundingBox(fs.readFileSync('scratch/png_extracted.png')));
console.log('ICE BBox:', getAlphaBoundingBox(fs.readFileSync('scratch/ice_extracted.png')));
