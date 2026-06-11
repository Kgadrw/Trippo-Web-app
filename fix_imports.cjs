const fs = require('fs');
const { execSync } = require('child_process');

const TARGET_LIBS = ['notifications', 'backgroundSync', 'indexedDB', 'syncManager'];

const grepResult = execSync(
  'grep -rn "import(" /home/trippo/frontend/src/ 2>/dev/null || true',
  { encoding: 'utf8' }
);

const filesToFix = new Set();
grepResult.split('\n').forEach(line => {
  if (TARGET_LIBS.some(lib => line.includes(lib))) {
    const filePath = line.split(':')[0];
    if (filePath) filesToFix.add(filePath);
  }
});

console.log('Files to fix:', [...filesToFix]);

for (const filePath of filesToFix) {
  let code = fs.readFileSync(filePath, 'utf8');
  const original = code;
  const newStaticImports = [];

  const pattern1 = /const\s*\{([^}]+)\}\s*=\s*await\s+import\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = pattern1.exec(original)) !== null) {
    if (TARGET_LIBS.some(lib => m[2].includes(lib))) {
      newStaticImports.push("import { " + m[1].trim() + " } from '" + m[2] + "';");
      code = code.replace(m[0], '/* converted to static import */');
    }
  }

  const pattern2 = /const\s+(\w+)\s*=\s*await\s+import\(['"]([^'"]+)['"]\)/g;
  while ((m = pattern2.exec(original)) !== null) {
    if (TARGET_LIBS.some(lib => m[2].includes(lib))) {
      newStaticImports.push("import * as " + m[1] + " from '" + m[2] + "';");
      code = code.replace(m[0], '/* converted to static import */');
    }
  }

  if (newStaticImports.length > 0) {
    const lines = code.split('\n');
    let lastImportLine = 0;
    lines.forEach((line, i) => { if (line.startsWith('import ')) lastImportLine = i; });
    lines.splice(lastImportLine + 1, 0, newStaticImports.join('\n'));
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Fixed ' + filePath + ' -> added: ' + newStaticImports.join(', '));
  } else {
    console.log('No auto-fix patterns in ' + filePath + ' (may need manual fix)');
  }
}
console.log('Done.');
