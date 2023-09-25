// Edit the template below to update the frontend application config file,
// public/APP_CONFIG.js.
//
// Remember that APP_CONFIG.js will be publicly visible,
// and will run in the client browser.
//
// To regenerate public/APP_CONFIG.js with information from the current environment:
//
//   node APP_CONFIG-gen.js > public/APP_CONFIG.js
//

const os = require("os");
console.log(`
// DO NOT EDIT. Generated by APP_CONFIG-gen.js. Make changes there.
window.APP_CONFIG = {
  "serverHostname": "${os.hostname()}",
  "apiBaseUrl": "${process.env.API_BASEURL || ''}"
}`)