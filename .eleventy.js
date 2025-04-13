const CleanCSS = require("clean-css");
const htmlmin = require("html-minifier");
const path = require("path");
const { DateTime } = require('luxon');
const htmlMinTransform = require('./src/transforms/html-min-transform.js');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const fs = require('fs');

// Try to require webpack, but don't fail if it's not installed
let webpack;
try {
  webpack = require("webpack");
} catch (e) {
  console.warn("Webpack not found. JS bundling will be skipped. Run 'npm install --save-dev webpack webpack-cli terser-webpack-plugin babel-loader @babel/core @babel/preset-env' to enable JS bundling.");
}

module.exports = function(eleventyConfig) {
  // PROBLEM 1: We need to make sure we're not ignoring CSS files
  eleventyConfig.ignores = eleventyConfig.ignores || [];
  if (eleventyConfig.ignores.delete) {
    eleventyConfig.ignores.delete("src/_includes/css/**");
    eleventyConfig.ignores.delete("src/css/**");
  }
  
  // PROBLEM 2: FIX THE PASSTHROUGH CONFLICT - DON'T use passthrough for CSS
  // Remove all CSS passthrough copy configurations
  // No eleventyConfig.addPassthroughCopy for CSS directories
  
  // Keep these passthrough copies for other assets
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy('src/fonts');
  
  // PROBLEM 3: Ensure CSS is being watched for changes
  eleventyConfig.addWatchTarget("./src/css/");
  eleventyConfig.addWatchTarget("./src/_includes/css/");
  
  // Add year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  
  // Add timestamp shortcode for cache busting
  eleventyConfig.addShortcode("timestamp", () => `${Date.now()}`);
  
  // Minify CSS
  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });
  
  // Minify HTML in production
  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if(outputPath && outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });

  // Add plugins
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  
  // Only minify HTML if we are in production
  if (process.env.NODE_ENV === 'production') {
    eleventyConfig.addTransform('htmlmin', htmlMinTransform);
  }

  // Add date formatter filters
  eleventyConfig.addFilter('dateIso', date => {
    // Check if date is valid before trying to format it
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('Warning: Invalid date passed to dateIso filter');
      return '';
    }
    return DateTime.fromJSDate(date).toISO();
  });

  eleventyConfig.addFilter('dateReadable', date => {
    // Check if date is valid before trying to format it
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('Warning: Invalid date passed to dateReadable filter');
      return '';
    }
    return DateTime.fromJSDate(date).toFormat('dd LLL yyyy');
  });

  // Collections
  eleventyConfig.addCollection('posts', collection => {
    return [...collection.getFilteredByGlob('./src/posts/*.md')].reverse();
  });

  // Tell 11ty to use the .eleventyignore and ignore our .gitignore file
  eleventyConfig.setUseGitIgnore(false);
  
  // Fix the webpack integration  
  if (webpack) {
    eleventyConfig.on("beforeBuild", async () => {
      try {
        // Check if webpack config exists
        const fs = require('fs');
        const webpackConfigPath = path.join(__dirname, 'webpack.config.js');
        
        if (!fs.existsSync(webpackConfigPath)) {
          console.warn("Webpack configuration file not found. Skipping JS bundling.");
          return;
        }
        
        const webpackConfig = require(webpackConfigPath);
        return new Promise((resolve, reject) => {
          webpack(webpackConfig, (err, stats) => {
            if (err) {
              console.error("Webpack error:", err);
              // Don't fail the build, just log the error
              resolve();
              return;
            }
            
            if (stats.hasErrors()) {
              const info = stats.toJson();
              console.error("Webpack compilation errors:", info.errors);
              // Don't fail the build, just log the errors
              resolve();
              return;
            }
            
            console.log(stats.toString({ colors: true }));
            resolve();
          });
        });
      } catch (e) {
        console.error("Error running webpack:", e);
        // Continue with the Eleventy build even if webpack fails
        return Promise.resolve();
      }
    });
  }
  
  // PROBLEM 4: Fix the CSS processing in beforeBuild but make it more robust
  eleventyConfig.on("beforeBuild", () => {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Ensure output directory exists
      const siteCssDir = path.join(__dirname, '_site', 'css');
      fs.mkdirSync(siteCssDir, { recursive: true });
      
      // Check both possible CSS source locations
      const cssSources = [
        path.join(__dirname, 'src', 'css', 'styles.css'),
        path.join(__dirname, 'src', '_includes', 'css', 'styles.css')
      ];
      
      // Find the first CSS source that exists
      const cssInputPath = cssSources.find(source => fs.existsSync(source));
      
      if (cssInputPath) {
        console.log(`✅ Found CSS source at: ${cssInputPath}`);
        let cssContent = fs.readFileSync(cssInputPath, 'utf8');
        
        // Process @import statements
        const processImports = (content, basePath, processedPaths = new Set()) => {
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
        };
        
        // Process all imports
        const cssDir = path.dirname(cssInputPath);
        cssContent = processImports(cssContent, cssDir);
        
        // Minify for production, clean for development
        let processedCss;
        if (process.env.NODE_ENV === 'production') {
          processedCss = new CleanCSS({ level: 2 }).minify(cssContent).styles;
        } else {
          processedCss = new CleanCSS({ level: 1, format: 'beautify' }).minify(cssContent).styles;
        }
        
        // Write CSS file
        fs.writeFileSync(path.join(siteCssDir, 'styles.css'), processedCss);
        console.log(`✅ CSS processed and written to ${path.join(siteCssDir, 'styles.css')}`);
      } else {
        console.error("❌ ERROR: No CSS source file found. Checked:", cssSources);
        // Create a minimal CSS file so the site doesn't break
        fs.writeFileSync(path.join(siteCssDir, 'styles.css'), 
          '/* Fallback CSS - No source CSS file found */\n' +
          'body { font-family: system-ui, sans-serif; line-height: 1.5; }'
        );
      }
    } catch (error) {
      console.error('❌ Error processing CSS:', error);
    }
  });

  // PROBLEM 5: Make sure we only have ONE BrowserSync configuration
  eleventyConfig.setBrowserSyncConfig({
    server: {
      baseDir: "_site"
    },
    port: 8080,
    ui: false,
    ghostMode: false,
    files: ['_site/css/**/*.css', '_site/**/*.html'], // Watch ALL CSS files in the _site/css directory
    reloadDelay: 100,
    notify: true,
    open: true, // Automatically open browser
    callbacks: {
      ready: function(err, bs) {
        // Fix: Don't rely on chalk which might not be installed
        console.log('✓ Browsersync is running. Your CSS should be visible now.');
        console.log('✓ Site available at http://localhost:8080');
      }
    }
  });

  // Create necessary directories for layouts
  const includesDir = path.join(__dirname, 'src', '_includes');
  const layoutsDir = path.join(includesDir, 'layouts');
  
  if (!fs.existsSync(includesDir)) {
    fs.mkdirSync(includesDir, { recursive: true });
    console.log(`Created missing directory: ${includesDir}`);
  }
  
  if (!fs.existsSync(layoutsDir)) {
    fs.mkdirSync(layoutsDir, { recursive: true });
    console.log(`Created missing directory: ${layoutsDir}`);
  }

  // Copy base.njk to _includes/layouts if needed
  const srcBasePath = path.join(includesDir, 'base.njk');
  const destBasePath = path.join(layoutsDir, 'base.njk');
  if (fs.existsSync(srcBasePath) && !fs.existsSync(destBasePath)) {
    fs.copyFileSync(srcBasePath, destBasePath);
    console.log(`Copied base.njk from ${srcBasePath} to ${destBasePath}`);
  }

  // PROBLEM 6: Make sure our cssInclude shortcode points to both CSS files for max compatibility
  eleventyConfig.addShortcode("cssInclude", function() {
    const timestamp = Date.now(); // For cache busting
    return `<link rel="stylesheet" href="/css/styles.css?v=${timestamp}">
            <link rel="stylesheet" href="/css/style.css?v=${timestamp}">`;
  });

  // Add a debug filter to help troubleshoot
  eleventyConfig.addFilter("debug", function(value) {
    return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
  });

  // Log all input files for debugging
  eleventyConfig.on("beforeBuild", () => {
    console.log("Processing index.md and other pages...");
  });
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};