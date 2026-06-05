/*
  Monetag setup
  1. Create/verify this site in your Monetag publisher dashboard.
  2. Create an ad zone and copy the exact script tag Monetag gives you.
  3. Paste that script below, replacing the empty MONETAG_TAG value.

  Keep this file as the single place for Monetag code so every page can use it.
*/

const MONETAG_TAG = `<script>(function(s){s.dataset.zone='11104764',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`;

(function loadMonetag() {
  if (!MONETAG_TAG.trim()) return;

  const container = document.createElement("div");
  container.innerHTML = MONETAG_TAG.trim();

  Array.from(container.children).forEach((node) => {
    if (node.tagName.toLowerCase() !== "script") {
      document.body.appendChild(node);
      return;
    }

    const script = document.createElement("script");
    Array.from(node.attributes).forEach((attr) => {
      script.setAttribute(attr.name, attr.value);
    });
    script.textContent = node.textContent;
    document.body.appendChild(script);
  });
})();
