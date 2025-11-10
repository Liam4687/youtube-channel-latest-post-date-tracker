onst fs = require('fs');
const path = require('path');

/**
* Ensures that the directory portion of a path exists.
* @param {string} filePath
*/
function ensureDirectory(filePath) {
const dir = path.dirname(path.resolve(filePath));
if (!fs.existsSync(dir)) {
fs.mkdirSync(dir, { recursive: true });
}
}

/**
* Exports the results map to a JSON file. The output format is:
* {
*   "ChannelName1": "2021-09-01T00:00:00.000Z",
*   "ChannelName2": null,
*   ...
* }
*
* @param {Record<string, string|null>} results
* @param {string} outputPath
* @returns {Promise<void>}
*/
async function exportResultsToFile(results, outputPath) {
try {
ensureDirectory(outputPath);
const absolutePath = path.resolve(outputPath);
const payload = JSON.stringify(results, null, 2);
await fs.promises.writeFile(absolutePath, payload, 'utf8');
console.log(`[INFO] Results successfully written to ${absolutePath}`);
} catch (err) {
console.error(`[ERROR] Failed to write results to "${outputPath}": ${err.message}`);
throw err;
}
}

module.exports = {
exportResultsToFile
};