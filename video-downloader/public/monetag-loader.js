/*
  Monetag setup
  1. Create/verify this site in your Monetag publisher dashboard.
  2. Create an ad zone and copy the exact script tag Monetag gives you.
  3. Paste that script below, replacing the empty MONETAG_TAG value.

  Keep this file as the single place for Monetag code so every page can use it.
*/

const MONETAG_VIGNETTE_TAG = `<script>(function(s){s.dataset.zone='11104764',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`;

/**
 * Configure your Banner Zone IDs here.
 */
const MONETAG_BANNER_ZONES = {
  // Example: 'Home_Top': '1234567',
};

function injectScript(tag, container = document.body) {
  if (!tag) return;
  const temp = document.createElement("div");
  temp.innerHTML = tag.trim();
  Array.from(temp.children).forEach((node) => {
    if (node.tagName.toLowerCase() !== "script") {
      container.appendChild(node);
      return;
    }
    const script = document.createElement("script");
    Array.from(node.attributes).forEach((attr) => {
      script.setAttribute(attr.name, attr.value);
    });
    script.textContent = node.textContent;
    container.appendChild(script);
  });
}

(async function loadMonetag() {
  console.log("[Monetag] Fetching dynamic configuration...");
  let vignetteId = "11104764"; // Default fallback
  let bannerZones = {};

  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    if (data.success && data.settings) {
      if (data.settings.monetagVignetteId) vignetteId = data.settings.monetagVignetteId;
      if (data.settings.monetagBannerZones && data.settings.monetagBannerZones !== "") {
        const rawZones = data.settings.monetagBannerZones;
        try {
          // 1. Try to parse as JSON first
          bannerZones = typeof rawZones === 'string' ? JSON.parse(rawZones) : rawZones;
        } catch(e) { 
          // 2. If it's not JSON, it might just be a single ID string
          if (typeof rawZones === 'string' && rawZones.trim().length > 0) {
            console.log("[Monetag] Input is not JSON, treating as single default ID.");
            bannerZones = { "default": rawZones.trim() };
          } else {
            console.error("[Monetag] Error parsing banner configuration", e);
          }
        }
      }
      console.log("[Monetag] Configuration loaded from server.");
    }
  } catch (err) {
    console.warn("[Monetag] Failed to fetch server settings, using defaults.", err);
  }

  // Load Vignette
  console.log(`[Monetag] Loading Vignette ${vignetteId}...`);
  injectScript(`<script>(function(s){s.dataset.zone='${vignetteId}',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`);

  // Load Banners into slots
  const slots = document.querySelectorAll('.monetag-ad-slot');
  if (slots.length > 0) {
    console.log(`[Monetag] Found ${slots.length} ad slots.`);
    slots.forEach((slot, index) => {
        const zoneId = bannerZones[slot.id] || bannerZones['default'];
        if (zoneId) {
            console.log(`[Monetag] Injecting banner for zone ${zoneId} into slot ${index}`);
            // If user pasted a full script tag, use it as is; otherwise wrap the ID
            const bannerTag = String(zoneId).includes('<script') 
                ? zoneId 
                : `<script data-cfasync="false" src="//n6wxm.com/vignette.min.js?z=${zoneId}"></script>`;
            injectScript(bannerTag, slot);
        } else {
            console.warn(`[Monetag] Slot ${index} has no Zone ID configured.`);
        }
    });
  }
})();
