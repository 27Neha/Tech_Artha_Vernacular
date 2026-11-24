const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (fullPath.endsWith('.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir(path.join(__dirname, 'apps/web/app'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes("?? 'http://localhost:3000'")) {
        content = content.replace(/\?\? 'http:\/\/localhost:3000'/g, "?? '/api'");
        changed = true;
    }
    
    if (content.includes("|| 'http://localhost:3000'")) {
        content = content.replace(/\|\| 'http:\/\/localhost:3000'/g, "|| '/api'");
        changed = true;
    }

    if (content.includes("'http://localhost:3000/assistant/messages'")) {
        content = content.replace(/'http:\/\/localhost:3000\/assistant\/messages'/g, "'/api/assistant/messages'");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});

console.log('Finished updating frontend API URLs.');
