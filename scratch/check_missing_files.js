const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
lines.forEach((line, i) => {
    const m = line.match(/(?:src|href)="([^"#?]+)"/);
    if (m && !m[1].startsWith('http')) {
        if (!fs.existsSync(m[1])) {
            console.log(`Line ${i + 1}: Missing "${m[1]}"`);
        }
    }
});
