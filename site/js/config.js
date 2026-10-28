/* ============================================================
   Cedarville Schools - Frontend configuration
   This is the ONLY file you edit to point the site at the API.
   Loaded before js/cms.js on every page.
   ============================================================ */

/**
 * API base URL for CMS content.
 *
 *   "/api"                                  -> same origin, proxied by server.js (default)
 *   "https://api.cedarvilleschools.com/api" -> separate API host
 *   ""                                      -> ignore the API, read the static data/ folder
 *
 * If the API is unreachable, cms.js automatically falls back to data/ so the
 * site keeps working even when the backend is down.
 */
window.CEDARVILLE_DATA_BASE = window.CEDARVILLE_DATA_BASE || '/api';

/**
 * Contact form endpoint. Leave empty to keep using the hosted form service
 * configured in the HTML; set to '/api/contact' to use the Python backend.
 */
window.CEDARVILLE_CONTACT_ENDPOINT = window.CEDARVILLE_CONTACT_ENDPOINT || '/api/contact';
