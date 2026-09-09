const fs = require('fs');
const zlib = require('zlib');

function unfilterPng(buf) {
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
    const raw = zlib.inflateSync(Buffer.concat(idatChunks));
    const bpp = 4;
    const rowBytes = w * bpp;
    const pixels = Buffer.alloc(w * h * bpp);
    
    let rawPos = 0;
    for (let y = 0; y < h; y++) {
        const filter = raw[rawPos++];
        const rowStart = y * rowBytes;
        const prevRowStart = (y - 1) * rowBytes;
        
        for (let x = 0; x < rowBytes; x++) {
            const rawByte = raw[rawPos++];
            const left = x >= bpp ? pixels[rowStart + x - bpp] : 0;
            const up = y > 0 ? pixels[prevRowStart + x] : 0;
            const upleft = (y > 0 && x >= bpp) ? pixels[prevRowStart + x - bpp] : 0;
            
            let val = 0;
            if (filter === 0) {
                val = rawByte;
            } else if (filter === 1) {
                val = (rawByte + left) & 0xff;
            } else if (filter === 2) {
                val = (rawByte + up) & 0xff;
            } else if (filter === 3) {
                val = (rawByte + Math.floor((left + up) / 2)) & 0xff;
            } else if (filter === 4) {
                const p = left + up - upleft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upleft);
                let pr;
                if (pa <= pb && pa <= pc) pr = left;
                else if (pb <= pc) pr = up;
                else pr = upleft;
                val = (rawByte + pr) & 0xff;
            }
            pixels[rowStart + x] = val;
        }
    }
    
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const a = pixels[(y * w + x) * bpp + 3];
            if (a > 30) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    return { w, h, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1, centerX: (minX + maxX) / 2 };
}

const files = [
    'AI/PURPLE ROBOT.svg',
    'AI/GREEN.svg',
    'AI/GOLD ROBOT.svg',
    'AI/RED ROBOT.svg'
];

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const match = content.match(/data:image\/png;base64,([a-zA-Z0-9+/=]+)/);
    if (match) {
        const buf = Buffer.from(match[1], 'base64');
        const bbox = unfilterPng(buf);
        console.log(f, bbox);
    }
});
