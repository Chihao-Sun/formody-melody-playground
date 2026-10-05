// Upload creates a development version, not a reviewed production release.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const status = require('./release-status.json');
const appid = process.env.FORMODY_WECHAT_APPID;
const key = process.env.FORMODY_WECHAT_PRIVATE_KEY;
if (!appid || !/^wx[0-9a-f]{16}$/i.test(appid)) throw new Error('Set the independent Formody AppID.');
if (!key) throw new Error('Set the Formody code-upload private key.');
if (!status.businessDomainVerified || !status.deviceAcceptanceVerified) {
  throw new Error('Verify the business domain and real-device experience before enabling uploads.');
}
async function upload() {
  const ci = require('miniprogram-ci');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'formody-wechat-'));
  try {
    const privateKeyPath = path.join(temp, 'upload.key');
    fs.writeFileSync(privateKeyPath, key, { mode: 0o600 });
    const project = new ci.Project({
      appid,
      type: 'miniProgram',
      projectPath: __dirname,
      privateKeyPath,
      ignores: ['node_modules/**/*', 'upload.cjs', 'release-status.json', 'README.md']
    });
    const sha = (process.env.GITHUB_SHA || '').slice(0, 12);
    await ci.upload({
      project,
      version: sha ? `entry-${sha}` : 'entry-local',
      desc: 'Formody web-view entry; development upload only',
      setting: { es6: true, minify: true },
      robot: 1
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
upload().catch(() => {
  console.error('Formody upload failed. Check AppID, upload-key permissions and runner IP whitelist.');
  process.exitCode = 1;
});
