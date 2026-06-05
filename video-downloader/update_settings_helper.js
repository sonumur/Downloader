const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/Administrator/Desktop/download/video-downloader/public/admin/settings.html';
if (!fs.existsSync(filePath)) {
    console.log('File not found');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Update HTML fields
const htmlTarget = /<div class="settings-row">\s*<div class="settings-field"><label>Google Analytics ID<\/label><input type="text" id="gaId" placeholder="G-XXXXXXXXXX"><\/div>\s*<div class="settings-field"><label>Google AdSense ID<\/label><input type="text" id="adsenseId" placeholder="ca-pub-XXXXXX"><\/div>\s*<\/div>/i;
const htmlReplacement = `          <div class="settings-row">
            <div class="settings-field"><label>Google AdSense ID (Legacy)</label><input type="text" id="adsenseId" placeholder="ca-pub-XXXXXX"></div>
            <div class="settings-field"><label>Google Analytics ID</label><input type="text" id="gaId" placeholder="G-XXXXXXXXXX"></div>
          </div>
          <div class="settings-row">
            <div class="settings-field"><label>Monetag Vignette Zone ID</label><input type="text" id="monetagVignetteId" placeholder="11104764"></div>
            <div class="settings-field"><label>Monetag Banner Zones (JSON)</label><input type="text" id="monetagBannerZones" placeholder='{"Home_Top": "1234567"}'></div>
          </div>`;

if (htmlTarget.test(content)) {
    console.log('Updating HTML fields...');
    content = content.replace(htmlTarget, htmlReplacement);
}

// 2. Update initSettings block
const initTarget = /if \(s.gaId\) document.getElementById\('gaId'\).value = s.gaId;\s*if \(s.adsenseId\) document.getElementById\('adsenseId'\).value = s.adsenseId;/i;
const initReplacement = `  if (s.gaId) document.getElementById('gaId').value = s.gaId;
  if (s.adsenseId) document.getElementById('adsenseId').value = s.adsenseId;
  if (s.monetagVignetteId) document.getElementById('monetagVignetteId').value = s.monetagVignetteId;
  if (s.monetagBannerZones) document.getElementById('monetagBannerZones').value = typeof s.monetagBannerZones === 'string' ? s.monetagBannerZones : JSON.stringify(s.monetagBannerZones);`;

if (initTarget.test(content)) {
    console.log('Updating initSettings...');
    content = content.replace(initTarget, initReplacement);
}

// 3. Update saveSection block
const saveTarget = /data = \{\s*metaTitle: document.getElementById\('metaTitle'\).value.trim\(\),\s*metaDesc: document.getElementById\('metaDesc'\).value.trim\(\),\s*gaId: document.getElementById\('gaId'\).value.trim\(\),\s*adsenseId: document.getElementById\('adsenseId'\).value.trim\(\),\s*\};/i;
const saveReplacement = `data = {
        metaTitle: document.getElementById('metaTitle').value.trim(),
        metaDesc: document.getElementById('metaDesc').value.trim(),
        gaId: document.getElementById('gaId').value.trim(),
        adsenseId: document.getElementById('adsenseId').value.trim(),
        monetagVignetteId: document.getElementById('monetagVignetteId').value.trim(),
        monetagBannerZones: document.getElementById('monetagBannerZones').value.trim(),
      };`;

if (saveTarget.test(content)) {
    console.log('Updating saveSection...');
    content = content.replace(saveTarget, saveReplacement);
}

fs.writeFileSync(filePath, content);
console.log('Update complete');
