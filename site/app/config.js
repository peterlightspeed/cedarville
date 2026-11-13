/* Cedarville Learning — app configuration.
   The ONLY file to edit when you move the API to a new address. */
window.CEDAR_APP = {
  // Website (browser): same origin, proxied by server.js locally or vercel.json in production.
  API_BASE: '/api',
  // Mobile app (Capacitor/Play Store): no "same origin", so use the full address.
  NATIVE_API_BASE: 'https://api.repurposekey.com/api'
};
