const http = require('http');

http.get('http://187.52.116.48/api/v1/lms/packages/', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        const data = JSON.parse(body);
        console.log('PACKAGE COUNT:', data.length);
        data.forEach((pkg, idx) => {
            console.log(`\n[Package ${idx + 1}]`);
            console.log(`  ID: ${pkg.id}`);
            console.log(`  Package ID: ${pkg.package_id}`);
            console.log(`  Experience ID: ${pkg.experience_id}`);
            console.log(`  Title: ${pkg.title}`);
            console.log(`  Version: ${pkg.version}`);
            console.log(`  Download URL: ${pkg.download_url || pkg.downloadUrl}`);
            console.log(`  Checksum: ${pkg.checksum}`);
            console.log(`  Status: ${pkg.status}`);
            console.log(`  Grade: ${pkg.grade}`);
            console.log(`  Difficulty: ${pkg.difficulty}`);
        });
    });
});
