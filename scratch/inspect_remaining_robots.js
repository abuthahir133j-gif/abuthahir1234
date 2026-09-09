const fs = require('fs');

const files = [
    'AI/PURPLE ROBOT.svg',
    'AI/GREEN.svg',
    'AI/GOLD ROBOT.svg',
    'AI/RED ROBOT.svg'
];

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const imgMatch = content.match(/<image[^>]+xlink:href="([^"]+)"/);
    const vb = (content.match(/viewBox=["']([^"']+)["']/i) || [])[1];
    const w = (content.match(/width=["']([^"']+)["']/i) || [])[1];
    const h = (content.match(/height=["']([^"']+)["']/i) || [])[1];
    const imgTag = (content.match(/<image[^>]+>/) || [])[0];
    
    console.log(`=== ${f} ===`);
    console.log('SVG viewBox:', vb, 'w:', w, 'h:', h);
    console.log('Has base64 image:', !!imgMatch);
    if (imgTag) {
        console.log('Image tag:', imgTag.substring(0, 100));
    }
});
