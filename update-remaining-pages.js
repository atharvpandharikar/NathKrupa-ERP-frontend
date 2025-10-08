const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/pages/features/Prices.tsx',
    'src/pages/features/Images.tsx',
    'src/pages/vehicles/Models.tsx',
    'src/pages/vehicles/Makers.tsx',
    'src/pages/vehicles/Types.tsx',
    'src/pages/features/Types.tsx',
    'src/pages/Landing.tsx'
];

filesToUpdate.forEach(filePath => {
    try {
        const fullPath = path.join(__dirname, filePath);
        let content = fs.readFileSync(fullPath, 'utf8');

        // Add import if not already present
        if (!content.includes('useOrganization')) {
            // Find the last import statement
            const importRegex = /import\s+.*?from\s+["'].*?["'];?\s*$/gm;
            const imports = content.match(importRegex);
            if (imports) {
                const lastImport = imports[imports.length - 1];
                const newImport = lastImport.replace(/;?\s*$/, ';\nimport { useOrganization } from "@/hooks/useOrganization";');
                content = content.replace(lastImport, newImport);
            }
        }

        // Update function to add useOrganization hook
        const functionRegex = /export default function\s+(\w+)\s*\(\s*\)\s*{/;
        const match = content.match(functionRegex);
        if (match) {
            const functionName = match[1];
            const functionStart = `export default function ${functionName}() {`;
            const newFunctionStart = `export default function ${functionName}() {\n  const { organizationName } = useOrganization();`;
            content = content.replace(functionStart, newFunctionStart);
        }

        // Update document.title
        content = content.replace(
            /document\.title\s*=\s*["']([^"']*)\s*\|\s*Nathkrupa ERP["'];?/g,
            'document.title = `$1 | ${organizationName}`;'
        );

        // Update useEffect dependency arrays
        content = content.replace(
            /useEffect\(\(\)\s*=>\s*{[\s\S]*?document\.title[\s\S]*?},\s*\[\]\s*\);/g,
            (match) => {
                return match.replace(/},\s*\[\]\s*\);/g, '}, [organizationName]);');
            }
        );

        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${filePath}`);
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error.message);
    }
});

console.log('All files updated!');
