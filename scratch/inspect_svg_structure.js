const fs = require('fs');

['AI/PNg.svg', 'AI/ICE BLUE ROBOT.svg', 'AI/PURPLE ROBOT.svg', 'AI/GREEN.svg', 'AI/GOLD ROBOT.svg', 'AI/RED ROBOT.svg'].forEach(file => {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/xlink:href="data:[^"]+"/g, 'xlink:href="DATA_URL"');
    console.log('=== ' + file + ' ===');
    console.log(c);
});
