module.exports = {
  globDirectory: "dist",

  globPatterns: [
    "**/*.{html,json,png,ico,js,mp3}"
  ],

  swDest: "dist/sw.js",

  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,

  navigateFallback: "index.html",

  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/
  ]
};