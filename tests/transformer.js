/**
 * Lightweight, zero-dependency Jest transformer for vanilla ES6 modules in client/
 */
module.exports = {
  process(sourceText, sourcePath) {
    // Only transform client ES6 modules for Jest JSDOM testing
    if (!sourcePath.includes('/client/')) {
      return { code: sourceText };
    }

    let code = sourceText;

    // 1. Convert `import ... from '...'` to require
    code = code.replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
      'const $1 = require("$2");'
    );
    code = code.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g,
      'const { $1 } = require("$2");'
    );
    code = code.replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g,
      'const $1 = require("$2");'
    );

    // 2. Convert `export class Name` or `export function name` or `export const name`
    const exportedNames = [];

    code = code.replace(
      /export\s+class\s+(\w+)/g,
      (match, name) => {
        exportedNames.push(name);
        return `class ${name}`;
      }
    );

    code = code.replace(
      /export\s+(?:async\s+)?function\s+(\w+)/g,
      (match, name) => {
        exportedNames.push(name);
        return match.replace('export ', '');
      }
    );

    code = code.replace(
      /export\s+(?:const|let|var)\s+(\w+)/g,
      (match, name) => {
        exportedNames.push(name);
        return match.replace('export ', '');
      }
    );

    // 3. Convert `export { a, b, c }`
    code = code.replace(
      /export\s+\{([^}]+)\};?/g,
      (match, names) => {
        names.split(',').forEach((n) => {
          const trimmed = n.trim();
          if (trimmed) exportedNames.push(trimmed);
        });
        return '';
      }
    );

    if (exportedNames.length > 0) {
      code += `\nmodule.exports = { ${exportedNames.join(', ')} };\n`;
    }

    return { code };
  }
};
