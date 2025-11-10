onst fs = require('fs');

// Function to export results to a JSON file
function exportToJson(data, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Results exported to ${outputPath}`);
}

module.exports = { exportToJson };