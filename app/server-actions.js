'use server';
const { exec } = require('child_process');
const util = require('util');
const pexec = util.promisify(exec);

/**
 * Legitimate business action: generate a report for a project in a given format.
 * Unsafe because user-controlled `format` is concatenated into a shell string and passed to exec.
 */
async function generateReport(projectId, format) {
  console.log('[generateReport] args:', projectId, format);
  // format intentionally not sanitized to illustrate how CVE + gadget => RCE
  const cmd = `node ./scripts/report.js --project=${projectId} --format=${format}`;
  const { stdout } = await pexec(cmd);
  return stdout;
}

module.exports = { generateReport };
