// craco.config.js — static MVP version (no health-check, no visual-edits)
const path = require("path");

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
