const fs = require('fs');
const zlib = require('zlib');

function inspectCorners(buf) {
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
    const rowStride = 1 + w * 4;
    
    // Samples: top-left (50, 50), center (512, 768), bottom-left (50, 1500)
    function getPixel(x, y) {
        const idx = y * rowStride + 1 + x * 4;
        return [uncompressed[idx], uncompressed[idx+1], uncompressed[idx+2], uncompressed[idx+3]];
    }
    
    console.log('Corner (0,0):', getPixel(0, 0));
    console.log('Corner (10,10):', getPixel(10, 10));
    console.log('Top center (512, 100):', getPixel(512, 100));
    console.log('Robot Head center (512, 450):', getPixel(512, 450));
    console.log('Corner (1000, 10):', getPixel(1000, 10));
    console.log('Corner (10, 1500):', getPixel(10, 1500));
    console.log('Corner (1000, 1500):', getPixel(1000, 1500));
}

inspectCorners(fs.readFileSync('scratch/ice_extracted.png'));
