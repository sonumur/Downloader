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

(function loadMonetag() {
  console.log("[Monetag] Initializing ad loader...");
  
  // Load Vignette
  if (typeof MONETAG_VIGNETTE_TAG !== 'undefined' && MONETAG_VIGNETTE_TAG) {
    console.log("[Monetag] Loading Vignette...");
    injectScript(MONETAG_VIGNETTE_TAG);
  }

  // Load Banners into slots
  const slots = document.querySelectorAll('.monetag-ad-slot');
  if (slots.length > 0) {
    console.log(`[Monetag] Found ${slots.length} ad slots.`);
    slots.forEach((slot, index) => {
        // Here you can add logic to match slot IDs or categories
        // For now, it's ready for manual ID insertion in MONETAG_BANNER_ZONES
        const zoneId = MONETAG_BANNER_ZONES[slot.id] || MONETAG_BANNER_ZONES['default'];
        if (zoneId) {
            console.log(`[Monetag] Injecting banner for zone ${zoneId} into slot ${index}`);
            const bannerTag = `<script data-cfasync="false" src="//n6wxm.com/vignette.min.js?z=${zoneId}"></script>`;
            injectScript(bannerTag, slot);
        } else {
            console.warn(`[Monetag] Slot ${index} has no Zone ID configured.`);
        }
    });
  }
})();
