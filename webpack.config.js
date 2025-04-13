const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    main: './src/js/main.js',
  },
  output: {
    path: path.resolve(__dirname, '_site/assets'),
    filename: 'js/[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      // Still keep CSS processing for any CSS imported in JavaScript
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
      new CssMinimizerPlugin()
    ],
  },
  // Add this to avoid issues with optional dependencies
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
  plugins: [
    // Remove the CopyWebpackPlugin that copies from src/_includes/css to _site/css
    // since we're handling that in Eleventy now
    
    // Keep MiniCssExtractPlugin for any CSS imported in JavaScript
    new MiniCssExtractPlugin({
      filename: 'css/webpack-[name].css' // Change filename to avoid conflicts
    })
  ],
};
