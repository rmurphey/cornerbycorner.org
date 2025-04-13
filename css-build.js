const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

// Make sure we're creating the CSS directory in both places
// 1. In the root directory (for development server)
const rootCssDir = path.join(__dirname, 'css');
// 2. In the _site directory (for production build)
const siteCssDir = path.join(__dirname, '_site', 'css');

// Create the directories if they don't exist
[rootCssDir, siteCssDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Read the main CSS file
const cssPath = path.join(__dirname, 'src', 'css', 'styles.css');
if (fs.existsSync(cssPath)) {
  console.log(`Processing CSS from ${cssPath}`);
  let cssContent = fs.readFileSync(cssPath, 'utf8');

  // Process @import statements (simple approach)
  const importRegex = /@import\s+['"](.+)['"]/g;
  let match;

  function resolveImportPath(importPath) {
    // Try to find the file in src/css
    const fullPath = path.join(__dirname, 'src', 'css', importPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    // If not found, log an error
    console.warn(`Warning: Import file not found: ${fullPath}`);
    return null;
  }

  // Replace all imports with the contents of the imported files
  while ((match = importRegex.exec(cssContent)) !== null) {
    const importStatement = match[0];
    const importPath = match[1];
    const resolvedPath = resolveImportPath(importPath);
    
    if (resolvedPath) {
      const importedContent = fs.readFileSync(resolvedPath, 'utf8');
      cssContent = cssContent.replace(importStatement, importedContent);
      console.log(`Processed import: ${importPath}`);
    } else {
      cssContent = cssContent.replace(importStatement, `/* Import file not found: ${importPath} */`);
    }
  }

  // Minify CSS in production, otherwise just clean it
  let processedCss = cssContent;
  if (process.env.NODE_ENV === 'production') {
    processedCss = new CleanCSS({ level: 2 }).minify(cssContent).styles;
  } else {
    processedCss = new CleanCSS({ level: 1, format: 'beautify' }).minify(cssContent).styles;
  }
  
  // Write to both style.css and styles.css for compatibility
  // Write to both directories
  const files = [
    path.join(rootCssDir, 'style.css'),
    path.join(rootCssDir, 'styles.css'),
    path.join(siteCssDir, 'style.css'),
    path.join(siteCssDir, 'styles.css')
  ];
  
  files.forEach(file => {
    fs.writeFileSync(file, processedCss);
    console.log(`CSS written to: ${file}`);
  });
  
  console.log('CSS build completed successfully!');
} else {
  console.error(`ERROR: Main CSS file not found at ${cssPath}`);
  process.exit(1);
}
