const htmlmin = require('html-minifier');

module.exports = function htmlMinTransform(content, outputPath) {
  if (outputPath && outputPath.endsWith('.html')) {
    return htmlmin.minify(content, {
      useShortDoctype: true,
      removeComments: true,
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    });
  }
  return content;
};
