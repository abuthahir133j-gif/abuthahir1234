const fs = require('fs');
const zlib = require('zlib');

function decodePng(buf) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const depth = buf[24];
    const colorType = buf[25];
    
    // Find all IDAT chunks
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
    const compressed = Buffer.concat(idatChunks);
    const uncompressed = zlib.inflateSync(compressed);
    
    return { w, h, depth, colorType, uncompressed };
}

try {
    const pngInfo = decodePng(fs.readFileSync('scratch/png_extracted.png'));
    console.log('PNG decoded:', pngInfo.w, 'x', pngInfo.h, 'colorType:', pngInfo.colorType);
    const iceInfo = decodePng(fs.readFileSync('scratch/ice_extracted.png'));
    console.log('ICE decoded:', iceInfo.w, 'x', iceInfo.h, 'colorType:', iceInfo.colorType);
} catch (e) {
    console.error('Error decoding:', e.message);
}
