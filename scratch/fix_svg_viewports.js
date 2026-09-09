const fs = require('fs');

const svgFiles = [
    { file: 'AI/ICE BLUE ROBOT.svg', viewBox: '0 0 599 898' },
    { file: 'AI/PURPLE ROBOT.svg', viewBox: '0 0 605 907' },
    { file: 'AI/GREEN.svg', viewBox: '0 0 748 935' },
    { file: 'AI/GOLD ROBOT.svg', viewBox: '0 0 599 898' },
    { file: 'AI/RED ROBOT.svg', viewBox: '0 0 599 898' }
];

svgFiles.forEach(({ file, viewBox }) => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace opening svg tag to use width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
    content = content.replace(/<svg[^>]*>/i, `<svg width="100%" height="100%" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
});
