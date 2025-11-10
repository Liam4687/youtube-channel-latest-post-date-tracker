onst axios = require('axios');
const { getLatestPostDate } = require('./extractors/youtube_parser');
const { exportToJson } = require('./outputs/json_exporter');
const channels = require('../data/inputs.sample.json');

// Function to scrape latest post dates for a list of channels
async function scrapeLatestPostDates(channels) {
const results = {};

for (const channel of channels) {
try {
const latestPostDate = await getLatestPostDate(channel);
results[channel] = latestPostDate;
} catch (error) {
console.error(`Error scraping channel ${channel}:`, error.message);
}
}

return results;
}

// Main function to start scraping and export the results
async function main() {
const results = await scrapeLatestPostDates(channels);
exportToJson(results, 'data/sample_output.json');
}

main().catch(console.error);