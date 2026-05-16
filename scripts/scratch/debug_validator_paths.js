const fs = require('fs');
const path = require('path');

const SOURCE_BASE = 'D:\\.mine\\source';
const projectName = 'K';
const projectModsPath = path.join(SOURCE_BASE, '_projects', projectName, 'mods');

console.log('Project Mods Path:', projectModsPath);
console.log('Exists:', fs.existsSync(projectModsPath));

if (fs.existsSync(projectModsPath)) {
    const categories = ['.local', '.server', '.essential'];
    categories.forEach(cat => {
        const catPath = path.join(projectModsPath, cat);
        console.log(`Checking ${cat}:`, fs.existsSync(catPath));
        if (fs.existsSync(catPath)) {
            const subs = fs.readdirSync(catPath);
            console.log(`  Subs in ${cat}:`, subs);
            subs.forEach(sub => {
                const subPath = path.join(catPath, sub);
                if (fs.statSync(subPath).isDirectory()) {
                    const files = fs.readdirSync(subPath);
                    console.log(`    Files in ${sub}:`, files.filter(f => f.endsWith('.jar')));
                }
            });
        }
    });
}
