const fs = require('fs');
const path = require('path');
const appId = 'ca-app-pub-3759490841134440~6160247417';
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const valuesDir = path.join('android', 'app', 'src', 'main', 'res', 'values');
const stringsPath = path.join(valuesDir, 'strings.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('Android klasörü bulunamadı. Önce: npx cap add android');
  process.exit(1);
}
let manifest = fs.readFileSync(manifestPath, 'utf8');
const meta = '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />';
if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')) {
  manifest = manifest.replace(/<application([^>]*)>/, `<application$1>\n        ${meta}`);
  fs.writeFileSync(manifestPath, manifest);
}
fs.mkdirSync(valuesDir, { recursive: true });
let strings = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath, 'utf8') : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';
if (strings.includes('<string name="admob_app_id">')) {
  strings = strings.replace(/<string name="admob_app_id">.*?<\/string>/, `<string name="admob_app_id">${appId}</string>`);
} else {
  strings = strings.replace('</resources>', `    <string name="admob_app_id">${appId}</string>\n</resources>`);
}
fs.writeFileSync(stringsPath, strings);
console.log('AdMob App ID AndroidManifest ve strings.xml dosyalarına eklendi.');
