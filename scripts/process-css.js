/**
 * CSS processing script for cornerbycorner.org
 * This script reads CSS from src/css, processes imports, and outputs to _site/css
 */

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const SRC_CSS_DIR = path.join(ROOT_DIR, 'src', 'css');
const DIST_CSS_DIR = path.join(ROOT_DIR, '_site', 'css');

// Make sure output directory exists
if (!fs.existsSync(DIST_CSS_DIR)) {
  fs.mkdirSync(DIST_CSS_DIR, { recursive: true });
}

// Function to process CSS imports
function processImports(content, basePath, processedPaths = new Set()) {
  const importRegex = /@import\s+['"]([^'"]+)['"]/g;
  return content.replace(importRegex, (match, importPath) => {
    const fullPath = path.join(basePath, importPath);
    
    if (processedPaths.has(fullPath)) {
      return '/* Import already processed */';
    }
    
    processedPaths.add(fullPath);
    
    if (fs.existsSync(fullPath)) {
      let importedContent = fs.readFileSync(fullPath, 'utf8');
      importedContent = processImports(importedContent, path.dirname(fullPath), processedPaths);
      return importedContent;
    } else {
      console.warn(`Warning: Import file not found: ${fullPath}`);
      return `/* Import file not found: ${importPath} */`;
    }
  });
}

// Process the main CSS file
const mainCssPath = path.join(SRC_CSS_DIR, 'styles.css');
if (fs.existsSync(mainCssPath)) {
  console.log(`Processing CSS from ${mainCssPath}`);
  
  // Read the content
  let cssContent = fs.readFileSync(mainCssPath, 'utf8');
  
  // Process imports
  cssContent = processImports(cssContent, SRC_CSS_DIR);
  
  // Minify or clean
  const isProd = process.env.NODE_ENV === 'production';
  let processedCss = new CleanCSS({
    level: isProd ? 2 : 1,
    format: isProd ? 'none' : 'beautify'
  }).minify(cssContent).styles;
  
  // Write to output
  fs.writeFileSync(path.join(DIST_CSS_DIR, 'styles.css'), processedCss);
  fs.writeFileSync(path.join(DIST_CSS_DIR, 'style.css'), processedCss);
  
  console.log(`CSS processed successfully! Output: ${path.join(DIST_CSS_DIR, 'styles.css')}`);
} else {
  console.error(`ERROR: Main CSS file not found at ${mainCssPath}`);
  process.exit(1);
}
