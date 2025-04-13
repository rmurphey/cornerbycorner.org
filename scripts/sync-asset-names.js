const fs = require('fs');
const path = require('path');

// Read webpack.config.js to get CSS entry point names
const webpackConfig = require('../webpack.config.js');
const cssEntryPoints = Object.keys(webpackConfig.entry)
  .filter(entry => webpackConfig.entry[entry].includes('.css'))
  .map(entry => `${entry}.css`);

// Get the pattern used in MiniCssExtractPlugin
const cssOutputPattern = webpackConfig.plugins
  .find(plugin => plugin instanceof require('mini-css-extract-plugin'))
  .options.filename;

// Read base.njk
const baseNjkPath = path.resolve(__dirname, '../src/layouts/base.njk');
let baseNjkContent = fs.readFileSync(baseNjkPath, 'utf8');

// Update the CSS reference in base.njk if needed
cssEntryPoints.forEach(entryPoint => {
  const outputFilename = cssOutputPattern.replace('[name]', entryPoint.replace('.css', ''));
  const cssPath = `/css/${outputFilename}`;
  
  // Simple regex to replace the CSS link - you might need a more robust solution
  const linkRegex = /<link rel="stylesheet" href="\/css\/[^"]*">/;
  if (linkRegex.test(baseNjkContent)) {
    baseNjkContent = baseNjkContent.replace(
      linkRegex,
      `<link rel="stylesheet" href="${cssPath}">`
    );
    fs.writeFileSync(baseNjkPath, baseNjkContent);
    console.log(`Updated CSS reference in base.njk to ${cssPath}`);
  }
});
