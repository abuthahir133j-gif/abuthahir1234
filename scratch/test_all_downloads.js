const http = require('http');

async function testAllDownloads() {
    const pkgs = await new Promise((resolve) => {
        http.get('http://187.52.116.48/api/v1/lms/packages/', (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });

    console.log(`Checking downloads for ${pkgs.length} packages...`);
    let successCount = 0;
    let failCount = 0;

    for (const pkg of pkgs) {
        const url = `http://187.52.116.48${pkg.download_url || `/api/lms/packages/${pkg.id}/download/`}`;
        const res = await new Promise((resolve) => {
            http.get(url, (r) => {
                let size = 0;
                r.on('data', c => size += c.length);
                r.on('end', () => resolve({ status: r.statusCode, size, headers: r.headers }));
            }).on('error', err => resolve({ status: 0, error: err.message }));
        });

        if (res.status === 200) {
            successCount++;
            console.log(`✅ [Pkg ID: ${pkg.id}, pkg_id: ${pkg.package_id}] '${pkg.title}' -> 200 OK (${res.size} bytes)`);
        } else {
            failCount++;
            console.log(`❌ [Pkg ID: ${pkg.id}, pkg_id: ${pkg.package_id}] '${pkg.title}' -> Status ${res.status} (${url})`);
        }
    }

    console.log(`\nSummary: ${successCount} downloadable, ${failCount} failed.`);
}

testAllDownloads();
