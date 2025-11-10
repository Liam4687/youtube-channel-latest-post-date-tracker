onst fs = require('fs');
const path = require('path');
const { scrapeLatestPostsForChannels } = require('./scraper/youtube_parser');
const { exportResultsToFile } = require('./output/exporter');

function loadJsonFile(filePath) {
try {
const absolutePath = path.resolve(filePath);
const raw = fs.readFileSync(absolutePath, 'utf8');
return JSON.parse(raw);
} catch (err) {
console.error(`[ERROR] Failed to read or parse JSON file at "${filePath}": ${err.message}`);
process.exit(1);
}
}

function loadSettings() {
const baseDir = path.resolve(__dirname, 'config');
const settingsPath = path.join(baseDir, 'settings.json');
const examplePath = path.join(baseDir, 'settings.example.json');

let settings = {};
try {
if (fs.existsSync(settingsPath)) {
settings = loadJsonFile(settingsPath);
console.log('[INFO] Loaded settings from config/settings.json');
} else if (fs.existsSync(examplePath)) {
settings = loadJsonFile(examplePath);
console.log('[INFO] Loaded settings from config/settings.example.json');
} else {
console.warn('[WARN] No settings file found. Using built-in defaults.');
}
} catch (err) {
console.warn(`[WARN] Failed to load settings: ${err.message}. Proceeding with defaults.`);
}

const defaults = {
concurrency: 3,
requestDelayMs: 500,
timeoutMs: 15000,
userAgent:
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
logLevel: 'info'
};

return { ...defaults, ...settings };
}

function parseArgs(argv) {
const args = {};
for (let i = 2; i < argv.length; i++) {
const token = argv[i];
if (token.startsWith('--')) {
const key = token.slice(2);
const next = argv[i + 1];
if (next && !next.startsWith('--')) {
args[key] = next;
i++;
} else {
args[key] = true;
}
}
}
return args;
}

async function main() {
const args = parseArgs(process.argv);

const inputPath = args.input || 'data/sample_input.json';
const outputPath = args.output || 'data/sample_output.json';

console.log('[INFO] YouTube Channel Latest Post Date Tracker');
console.log(`[INFO] Input file:  ${inputPath}`);
console.log(`[INFO] Output file: ${outputPath}`);

const input = loadJsonFile(inputPath);

const channels =
input.channels ||
input.channel ||
input.handles ||
input.urls ||
[];

if (!Array.isArray(channels) || channels.length === 0) {
console.error('[ERROR] Input JSON must contain a non-empty "channels" or "channel" array.');
process.exit(1);
}

const type = input.type || 'videos';

const settings = loadSettings();

try {
const results = await scrapeLatestPostsForChannels(channels, type, {
concurrency: settings.concurrency,
requestDelayMs: settings.requestDelayMs,
timeoutMs: settings.timeoutMs,
userAgent: settings.userAgent,
logLevel: settings.logLevel
});

await exportResultsToFile(results, outputPath);

const successCount = Object.values(results).filter((v) => v !== null).length;
console.log(`[INFO] Completed. Successfully resolved ${successCount}/${channels.length} channels.`);
} catch (err) {
console.error(`[ERROR] Unexpected failure during scraping: ${err.stack || err.message}`);
process.exit(1);
}
}

if (require.main === module) {
main();
}