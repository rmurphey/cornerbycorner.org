const CleanCSS = require("clean-css");
const htmlmin = require("html-minifier");
const path = require("path");
const { DateTime } = require('luxon');
const htmlMinTransform = require('./src/transforms/html-min-transform.js');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginRss = require('@11ty/eleventy-plugin-rss');

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
  eleventyConfig.addPassthroughCopy('src/fonts');
  
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

  // Add plugins
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);

  // Add date formatter filters
  eleventyConfig.addFilter('dateIso', date => {
    return DateTime.fromJSDate(date).toISO();
  });

  eleventyConfig.addFilter('dateReadable', date => {
    return DateTime.fromJSDate(date).toFormat('dd LLL yyyy');
  });

  // Only minify HTML if we are in production
  if (process.env.NODE_ENV === 'production') {
    eleventyConfig.addTransform('htmlmin', htmlMinTransform);
  }

  // Collections
  eleventyConfig.addCollection('posts', collection => {
    return [...collection.getFilteredByGlob('./src/posts/*.md')].reverse();
  });

  // Tell 11ty to use the .eleventyignore and ignore our .gitignore file
  eleventyConfig.setUseGitIgnore(false);
  
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
      includes: "_includes"
      // No layouts key - use the default (_includes)
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
