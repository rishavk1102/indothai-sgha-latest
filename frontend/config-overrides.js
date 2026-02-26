const path = require('path');
module.exports = {
  webpack: function(config, env) {
    // Change the output directory to the desired location
    config.output.path = path.resolve(__dirname, '../backend/dist');
    return config;
  },
  paths: function(paths, env) {
    // Change the output directory for the build command
    paths.appBuild = path.resolve(__dirname, '../backend/dist');
    return paths;
  }
};