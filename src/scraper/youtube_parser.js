onst fetch = require('node-fetch');
const cheerio = require('cheerio');
const { findFirstDateInHtml, normalizeToISOString, delay } = require('./utils_date');

/**
* Builds a YouTube channel content URL from a handle or full URL.
* @param {string} identifier Channel handle or full URL.
* @param {string} type Content type: "videos" | "shorts" | other.
* @returns {string}
*/
function buildChannelUrl(identifier, type) {
const trimmed = String(identifier).trim();
const segment = type === 'shorts' ? 'shorts' : 'videos';

if (/^https?:\/\//i.test(trimmed)) {
// Already a URL – just ensure it points to the right content section where possible.
if (!/[/?](videos|shorts)(\/|$|\?)/.test(trimmed)) {
const hasQuery = trimmed.includes('?');
const separator = trimmed.endsWith('/') ? '' : '/';
return `${trimmed}${separator}${segment}${hasQuery ? '' : ''}`;
}
return trimmed;
}

const handle = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
return `https://www.youtube.com/${handle}/${segment}`;
}

/**
* Fetches HTML for a given URL with timeout and custom headers.
* @param {string} url
* @param {object} options
* @returns {Promise<string>}
*/
async function fetchHtml(url, options = {}) {
const { timeoutMs = 15000, userAgent } = options;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
const res = await fetch(url, {
method: 'GET',
headers: {
'User-Agent':
userAgent ||
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
'Accept-Language': 'en-US,en;q=0.9',
Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
},
signal: controller.signal
});

if (!res.ok) {
throw new Error(`HTTP ${res.status} ${res.statusText}`);
}

return await res.text();
} finally {
clearTimeout(timeout);
}
}

/**
* Attempts to extract latest post date from a YouTube channel page HTML.
* Strategy:
*  - Look for standard date meta tags.
*  - Fallback to any datetime attribute.
*  - Finally, use generic ISO-ish date patterns.
*
* @param {string} html
* @returns {string|null} ISO date string or null.
*/
function extractLatestPostDate(html) {
const $ = cheerio.load(html);

// Common meta tags used on individual video pages (might not exist on channel listing).
const metaSelectors = [
'meta[itemprop="datePublished"]',
'meta[property="og:video:release_date"]',
'meta[name="date"]'
];

for (const selector of metaSelectors) {
const value = $(selector).attr('content');
if (value) {
const iso = normalizeToISOString(value);
if (iso) {
return iso;
}
}
}

// Look for any datetime attribute on the page (e.g., <time>, <relative-time>, etc.).
const datetimeCandidates = [];
$('[datetime]').each((_, el) => {
const value = $(el).attr('datetime');
if (value) {
datetimeCandidates.push(value);
}
});

for (const candidate of datetimeCandidates) {
const iso = normalizeToISOString(candidate);
if (iso) {
return iso;
}
}

// Fallback: try to detect the first ISO-like date anywhere in the HTML.
const fromRaw = findFirstDateInHtml(html);
if (fromRaw) {
const iso = normalizeToISOString(fromRaw);
if (iso) {
return iso;
}
}

return null;
}

/**
* Scrapes the latest post date for a single channel identifier.
*
* @param {string} identifier
* @param {string} type
* @param {object} options
* @param {function} logger
* @returns {Promise<{channelName: string, latestPostDate: string|null, type: string, sourceUrl: string}>}
*/
async function scrapeLatestPostForChannel(identifier, type, options, logger) {
const url = buildChannelUrl(identifier, type);
logger(`Fetching: ${url}`);

let html;
try {
html = await fetchHtml(url, options);
} catch (err) {
logger(`Failed to fetch "${url}": ${err.message}`, 'error');
return {
channelName: identifier,
latestPostDate: null,
type,
sourceUrl: url
};
}

const latestPostDate = extractLatestPostDate(html);

// Attempt to derive a more user-friendly channel name from the page title.
let channelName = identifier;
try {
const $ = cheerio.load(html);
const titleText = $('title').text().trim();
if (titleText) {
// Strip common suffix like " - YouTube"
channelName = titleText.replace(/\s+-\s+YouTube\s*$/i, '').trim();
}
} catch {
// Fallback to identifier if anything goes wrong.
}

return {
channelName,
latestPostDate,
type,
sourceUrl: url
};
}

/**
* Simple logger respecting log levels.
* @param {string} level
* @param {string} configuredLevel
* @returns {(msg: string, lvl?: string) => void}
*/
function createLogger(level, configuredLevel) {
const levels = ['error', 'warn', 'info', 'debug'];
const threshold = levels.indexOf(configuredLevel);
const defaultThreshold = threshold === -1 ? levels.indexOf('info') : threshold;

return (msg, lvl = level) => {
const idx = levels.indexOf(lvl);
if (idx === -1 || idx > defaultThreshold) return;

const stamp = new Date().toISOString();
if (lvl === 'error') {
console.error(`[${stamp}] [${lvl.toUpperCase()}] ${msg}`);
} else if (lvl === 'warn') {
console.warn(`[${stamp}] [${lvl.toUpperCase()}] ${msg}`);
} else {
console.log(`[${stamp}] [${lvl.toUpperCase()}] ${msg}`);
}
};
}

/**
* Scrapes latest posts for multiple channels.
*
* @param {string[]} channels
* @param {string} type
* @param {object} options
* @returns {Promise<Record<string, string|null>>}
*/
async function scrapeLatestPostsForChannels(
channels,
type = 'videos',
options = {}
) {
const {
concurrency = 3,
requestDelayMs = 500,
timeoutMs = 15000,
userAgent,
logLevel = 'info'
} = options;

const logger = createLogger('info', logLevel);

if (!Array.isArray(channels) || channels.length === 0) {
throw new Error('channels must be a non-empty array');
}

logger(`Starting scrape of ${channels.length} channel(s) with concurrency=${concurrency}.`);

const results = {};
let index = 0;

async function worker(workerId) {
while (index < channels.length) {
const currentIndex = index++;
const identifier = channels[currentIndex];

logger(`Worker ${workerId} processing channel #${currentIndex + 1}: ${identifier}`, 'debug');

const record = await scrapeLatestPostForChannel(
identifier,
type,
{ timeoutMs, userAgent },
logger
);

results[record.channelName] = record.latestPostDate;

if (requestDelayMs > 0 && currentIndex < channels.length - 1) {
await delay(requestDelayMs);
}
}
}

const workersCount = Math.max(1, Math.min(concurrency, channels.length));
const workers = [];
for (let i = 0; i < workersCount; i++) {
workers.push(worker(i + 1));
}

await Promise.all(workers);

logger('Scraping completed.');

return results;
}

module.exports = {
scrapeLatestPostsForChannels,
scrapeLatestPostForChannel,
buildChannelUrl,
extractLatestPostDate
};