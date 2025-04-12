const CleanCSS = require("clean-css");
const htmlmin = require("html-minifier");
const path = require("path");

// Try to require webpack, but don't fail if it's not installed
let webpack;
try {
  webpack = require("webpack");
} catch (e) {
  console.warn("Webpack not found. JS bundling will be skipped. Run 'npm install --save-dev webpack webpack-cli terser-webpack-plugin babel-loader @babel/core @babel/preset-env' to enable JS bundling.");
}

module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("assets");
  
  // Add year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  
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
  
  // Build and minify JS with webpack (if available)
  if (webpack) {
    eleventyConfig.on("beforeBuild", () => {
      try {
        const webpackConfig = require("./webpack.config.js");
        return new Promise((resolve, reject) => {
          webpack(webpackConfig, (err, stats) => {
            if (err || stats.hasErrors()) {
              console.error(stats.toString());
              reject(err || new Error("Webpack compilation failed"));
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
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "layouts"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
