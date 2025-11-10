js/**
 * Normalizes various date inputs into an ISO 8601 string.
 * Returns null if the date cannot be parsed.
 *
 * @param {string|Date|number} input
 * @returns {string|null}
 */
function normalizeToISOString(input) {
  if (!input) return null;

  let date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    date = new Date(input);
  } else if (typeof input === 'string') {
    const trimmed = input.trim();

    // Handle very common YouTube-style ISO strings without milliseconds.
    // e.g., "2021-09-01T00:00:00Z"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(trimmed)) {
      date = new Date(trimmed);
    } else {
      // Fallback to Date parser.
      date = new Date(trimmed);
    }
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Finds the first ISO-like date string in a blob of HTML or text.
 * It looks for common patterns like:
 *  YYYY-MM-DDTHH:MM:SSZ
 *  YYYY-MM-DD HH:MM:SS
 *
 * @param {string} html
 * @returns {string|null}
 */
function findFirstDateInHtml(html) {
  if (typeof html !== 'string' || html.length === 0) return null;

  // Basic ISO 8601 pattern with "T" and "Z"
  const isoPattern = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\b/;
  const isoMatch = html.match(isoPattern);
  if (isoMatch && isoMatch[1]) {
    return isoMatch[1];
  }

  // More relaxed pattern without "T" or "Z"
  const loosePattern = /\b(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})\b/;
  const looseMatch = html.match(loosePattern);
  if (looseMatch && looseMatch[1]) {
    return looseMatch[1];
  }

  return null;
}

/**
 * Simple promise-based timeout utility.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  normalizeToISOString,
  findFirstDateInHtml,
  delay
};