const fs = require('fs');
const exp = JSON.parse(fs.readFileSync('assets/packages/big_house_v4.elab/experience.json', 'utf8'));
exp.activities.forEach((act, ai) => {
    console.log(`Activity ${ai}: ${act.title}`);
    act.screens.forEach((sc, si) => {
        const elTypes = (sc.content?.elements || []).map(e => e.type);
        console.log(`  Screen ${si}: title='${sc.title}', elements=[${elTypes.join(', ')}]`);
    });
});
