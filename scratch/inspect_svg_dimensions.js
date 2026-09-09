const fs = require('fs');
const files = ['AI/PNg.svg', 'AI/ICE BLUE ROBOT.svg', 'AI/PURPLE ROBOT.svg', 'AI/GREEN.svg', 'AI/GOLD ROBOT.svg', 'AI/RED ROBOT.svg'];
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const vb = (content.match(/viewBox=["']([^"']+)["']/i) || [])[1];
    const w = (content.match(/width=["']([^"']+)["']/i) || [])[1];
    const h = (content.match(/height=["']([^"']+)["']/i) || [])[1];
    console.log(f, { viewBox: vb, width: w, height: h });
});
