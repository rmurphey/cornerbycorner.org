/**
 * Script to clean up duplicate CSS files between src/css and src/_includes/css
 */
const fs = require('fs');
const path = require('path');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const srcCssDir = path.join(rootDir, 'src', 'css');
const includesCssDir = path.join(rootDir, 'src', '_includes', 'css');

// Ensure src/css exists
if (!fs.existsSync(srcCssDir)) {
  fs.mkdirSync(srcCssDir, { recursive: true });
  console.log(`Created directory: ${srcCssDir}`);
}

// Check if we have duplicate CSS files
if (fs.existsSync(includesCssDir)) {
  // List all CSS files in the includes directory
  const cssFiles = fs.readdirSync(includesCssDir).filter(file => file.endsWith('.css'));
  
  if (cssFiles.length > 0) {
    console.log(`Found ${cssFiles.length} CSS files in ${includesCssDir}`);
    
    // Move files to the main CSS directory if they don't already exist there
    cssFiles.forEach(file => {
      const srcPath = path.join(includesCssDir, file);
      const destPath = path.join(srcCssDir, file);
      
      if (!fs.existsSync(destPath)) {
        // Copy the file
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} from includes to src/css`);
      } else {
        // Compare content and use newest file
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        
        if (srcStat.mtime > destStat.mtime) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Updated ${file} in src/css with newer version from includes`);
        }
      }
    });
    
    console.log('CSS file consolidation complete!');
  }
}
