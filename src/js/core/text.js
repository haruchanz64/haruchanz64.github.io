const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Collapse consecutive whitespace into single spaces and trim.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escape special HTML characters for safe interpolation into generated HTML.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Decode common HTML entities back into plain text.
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function decodeHtmlEntities(text) {
  return String(text ?? "").replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
}

/**
 * Strip HTML tags and decode common HTML entities.
 * @param {string | null | undefined} html
 * @returns {string}
 */
export function stripHtml(html) {
  return decodeHtmlEntities(String(html ?? "").replace(/<[^>]+>/g, ""));
}
