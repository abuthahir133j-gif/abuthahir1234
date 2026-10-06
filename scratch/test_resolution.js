const path = require('path');
const fs = require('fs');

function resolvePackageMediaUrls(packageData, basePath) {
    if (!packageData) return packageData;
    return packageData;
}

function findPackageExperience(requestedId) {
    const rawId = String(requestedId || '').trim();
    const isBoss = rawId.startsWith('boss-') || rawId.toLowerCase().includes('asses');

    const candidates = [
        rawId,
        isBoss ? 'Assessent_v5' : null,
        rawId.replace(/\.elab$/i, ''),
        rawId.replace(/\.zip$/i, ''),
        'Assessent_v5',
        'Hello!_This_Is_Me..._v1',
        'Hello!_This_Is_Me..._v233',
        'Things_I_Like_v6',
        'Meet_My_Friends_v8',
        'This_Is_My_Family_v7',
        'Welcome_to_My_Classroom_v3',
        'Where_Is_My_Pencil__v2',
        'What\'s_in_My_School_Bag__v4',
        'Can_You_Help_Me__v1'
    ].filter(Boolean);

    const baseSearchDirs = [
        path.join(__dirname, '..', 'data', 'experiences'),
        path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples', 'Lession'),
        path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples', 'Assigment'),
        path.join(__dirname, '..', 'LMS Engine', 'src', 'runtime', 'samples'),
        path.join(__dirname, '..', 'LMS Engine', 'src', 'packages'),
        path.join(__dirname, '..', 'LMS Engine', 'public', 'packages'),
        path.join(__dirname, '..', 'assets', 'packages'),
        path.join(__dirname, '..', 'assets')
    ];

    for (const baseDir of baseSearchDirs) {
        for (const cand of candidates) {
            const jsonPath = path.join(baseDir, cand, 'experience.json');
            if (fs.existsSync(jsonPath)) {
                try {
                    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    const basePath = path.join(baseDir, cand);
                    const data = resolvePackageMediaUrls(rawData, basePath);
                    return { data, basePath };
                } catch (e) {}
            }
        }
    }
    return null;
}

console.log('=== TEST findPackageExperience ===');
const testIds = ['2', '10', '48', '51', '40', '39', '24', '31', '54', '44', '56', '50', '32', '41', '45', '59', '60', '55', '57', '34', '61', '33', '37', '43', '36', '49', '47', '52', '38', '58', '42', '35', '64', '46', '53', '62', '63', 'Assessent_v5', 'Hello!_This_Is_Me..._v1', 'Amazing_Animals_Around_Us_v1'];

for (const id of testIds) {
    const res = findPackageExperience(id);
    console.log(`findPackageExperience('${id}') -> ${res ? 'RESOLVED: ' + res.data.title + ' (' + res.basePath + ')' : 'FAILED'}`);
}
