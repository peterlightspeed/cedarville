/* Cedarville Learning — app configuration.
   The ONLY file to edit when the API address changes. */
(function () {
  // The address of your Render backend (include /api at the end).
  // Use the *.onrender.com address Render gives you, or your own domain once DNS is set up.
  var PROD_API = 'https://cedarville-api.onrender.com/api';

  var local = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1 && location.protocol === 'http:';
  window.CEDAR_APP = {
    // On your computer, server.js proxies /api to the backend. Everywhere else, call the backend directly.
    API_BASE: local ? '/api' : PROD_API,
    // Android/iOS app has no "same website", so it always uses the full address.
    NATIVE_API_BASE: PROD_API
  };
})();
