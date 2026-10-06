const fs = require('fs');
const path = require('path');

const expDirs = [
    path.join(__dirname, '..', 'data', 'experiences'),
    path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples', 'Lession'),
    path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples', 'Assigment'),
    path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples'),
    path.join(__dirname, '..', 'LMS Engine', 'src', 'packages'),
    path.join(__dirname, '..', 'LMS Engine', 'public', 'packages'),
    path.join(__dirname, '..', 'assets', 'packages'),
    path.join(__dirname, '..', 'assets')
];

console.log('=== PACKAGE STORAGE INSPECTION ===');
for (const dir of expDirs) {
    if (fs.existsSync(dir)) {
        const items = fs.readdirSync(dir);
        console.log(`\nDirectory: ${dir} (${items.length} items)`);
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const isDir = fs.statSync(itemPath).isDirectory();
            const hasExpJson = isDir && fs.existsSync(path.join(itemPath, 'experience.json'));
            if (hasExpJson) {
                try {
                    const expData = JSON.parse(fs.readFileSync(path.join(itemPath, 'experience.json'), 'utf-8'));
                    console.log(`  [EXP] ${item} -> title: '${expData.title || expData.packageName || ''}' | id: ${expData.id || ''}`);
                } catch(e) {
                    console.log(`  [EXP-CORRUPT] ${item}`);
                }
            } else if (isDir) {
                console.log(`  [DIR] ${item}`);
            }
        }
    } else {
        console.log(`\nDirectory does NOT exist: ${dir}`);
    }
}
