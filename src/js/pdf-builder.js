const PAGE_WIDTH = 595.28; // A4 width in points (210mm)
const PAGE_HEIGHT = 841.89; // A4 height in points (297mm)
const MARGIN_X = 42;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN_X;

const encoder = new TextEncoder();

/**
 * Normalize Unicode punctuation into WinAnsi-compatible characters for standard Type1 Helvetica.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function toPdfSafeText(value) {
  return String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00B7/g, "|")
    .replace(/\u2022/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfString(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === "(" || ch === ")") {
      out += `\\${ch}`;
    } else if (code >= 0x80 && code <= 0xff) {
      out += `\\${code.toString(8).padStart(3, "0")}`;
    } else {
      out += ch;
    }
  }
  return out;
}

const HELVETICA_WIDTHS = {
  " ": 278, "!": 278, '"': 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  "A": 667, "B": 667, "C": 722, "D": 722, "E": 667, "F": 611, "G": 778, "H": 722,
  "I": 278, "J": 500, "K": 667, "L": 556, "M": 833, "N": 722, "O": 778, "P": 667,
  "Q": 778, "R": 722, "S": 667, "T": 611, "U": 722, "V": 667, "W": 944, "X": 667,
  "Y": 667, "Z": 611, "[": 278, "\\": 278, "]": 278, "^": 469, "_": 556, "`": 333,
  "a": 556, "b": 556, "c": 500, "d": 556, "e": 556, "f": 278, "g": 556, "h": 556,
  "i": 222, "j": 222, "k": 500, "l": 222, "m": 833, "n": 556, "o": 556, "p": 556,
  "q": 556, "r": 333, "s": 500, "t": 278, "u": 556, "v": 500, "w": 722, "x": 500,
  "y": 500, "z": 500, "{": 334, "|": 260, "}": 334, "~": 584,
};

/**
 * Compute string width in points for standard Helvetica / Helvetica-Bold.
 * @param {string} text
 * @param {number} fontSize
 * @param {boolean} isBold
 * @returns {number}
 */
export function estimateTextWidth(text, fontSize, isBold = false) {
  let thousandths = 0;
  for (const ch of text) {
    thousandths += HELVETICA_WIDTHS[ch] ?? 556;
  }
  return (thousandths / 1000) * fontSize * (isBold ? 1.08 : 1);
}

/**
 * Wrap text to fit within `maxWidthPt` at `fontSize`.
 * @param {string} text
 * @param {number} maxWidthPt
 * @param {number} fontSize
 * @param {boolean} isBold
 * @returns {string[]}
 */
export function wrapPdfText(text, maxWidthPt, fontSize, isBold = false) {
  const safe = toPdfSafeText(text);
  if (!safe) return [];

  const words = safe.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (estimateTextWidth(word, fontSize, isBold) <= maxWidthPt) {
        current = word;
      } else {
        let slice = "";
        for (const ch of word) {
          if (estimateTextWidth(slice + ch, fontSize, isBold) > maxWidthPt && slice) {
            lines.push(slice);
            slice = ch;
          } else {
            slice += ch;
          }
        }
        current = slice;
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (estimateTextWidth(candidate, fontSize, isBold) <= maxWidthPt) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

class PdfDocCursor {
  constructor() {
    this.pages = [{ commands: [], annotations: [] }];
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  get currentPage() {
    return this.pages[this.pages.length - 1];
  }

  get currentStream() {
    return this.currentPage.commands;
  }

  newPage() {
    this.pages.push({ commands: [], annotations: [] });
    this.y = PAGE_HEIGHT - MARGIN_TOP;
  }

  ensureSpace(requiredHeight) {
    if (this.y - requiredHeight < MARGIN_BOTTOM) {
      this.newPage();
    }
  }

  drawTextAt(text, x, y, { font = "F1", size = 10, color = null, underline = false, wordSpacing = 0 } = {}) {
    const safe = toPdfSafeText(text);
    if (!safe) return 0;
    const isBold = font === "F2";
    const width = estimateTextWidth(safe, size, isBold);

    if (color) {
      this.currentStream.push(`${color} rg`);
    }
    if (wordSpacing > 0) {
      this.currentStream.push(`${wordSpacing.toFixed(3)} Tw`);
    }
    this.currentStream.push(
      `BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfString(safe)}) Tj ET`,
    );
    if (wordSpacing > 0) {
      this.currentStream.push("0 Tw");
    }
    if (underline) {
      const underlineY = y - 1.5;
      this.currentStream.push(
        `q 0.5 w ${color ? `${color} RG ` : "0 0 0 RG "}${x.toFixed(2)} ${underlineY.toFixed(2)} m ${(x + width).toFixed(2)} ${underlineY.toFixed(2)} l S Q`,
      );
    }
    if (color) {
      this.currentStream.push("0 0 0 rg");
    }
    return width;
  }

  getJustifiedWordSpacing(line, maxWidth, size, isBold = false) {
    const spaces = (line.match(/ /g) || []).length;
    if (spaces === 0) return 0;
    const lineWidth = estimateTextWidth(line, size, isBold);
    const extra = maxWidth - lineWidth;
    if (extra <= 0 || extra > maxWidth * 0.35) return 0;
    return extra / spaces;
  }

  drawCenteredHeader(fullName, contactItems) {
    const nameSafe = toPdfSafeText(fullName);
    const nameSize = 22;
    const nameWidth = estimateTextWidth(nameSafe, nameSize, true);
    const nameX = Math.max(MARGIN_X, (PAGE_WIDTH - nameWidth) / 2);

    this.ensureSpace(44);
    this.drawTextAt(nameSafe, nameX, this.y, { font: "F2", size: nameSize });
    this.y -= 18;

    if (contactItems.length > 0) {
      const sepChar = "|";
      let contactSize = 9;
      let sepGap = 6;
      const calcTotalWidth = (size, gap) => {
        const sepW = estimateTextWidth(sepChar, size, false);
        return (
          contactItems.reduce((sum, item) => sum + estimateTextWidth(item.text, size, false), 0) +
          (gap * 2 + sepW) * Math.max(0, contactItems.length - 1)
        );
      };

      let totalWidth = calcTotalWidth(contactSize, sepGap);
      if (totalWidth > CONTENT_WIDTH) {
        sepGap = 4.5;
        totalWidth = calcTotalWidth(contactSize, sepGap);
      }
      while (totalWidth > CONTENT_WIDTH && contactSize > 7.5) {
        contactSize = Math.max(7.5, contactSize - 0.25);
        totalWidth = calcTotalWidth(contactSize, sepGap);
      }

      const sepCharWidth = estimateTextWidth(sepChar, contactSize, false);

      if (totalWidth <= CONTENT_WIDTH) {
        let cursorX = (PAGE_WIDTH - totalWidth) / 2;
        contactItems.forEach((item, idx) => {
          if (idx > 0) {
            cursorX += sepGap;
            this.drawTextAt(sepChar, cursorX, this.y, { font: "F1", size: contactSize });
            cursorX += sepCharWidth + sepGap;
          }
          const isLink = Boolean(item.url);
          const itemWidth = this.drawTextAt(item.text, cursorX, this.y, {
            font: "F1",
            size: contactSize,
            color: isLink ? "0.02 0.39 0.76" : null,
            underline: isLink,
          });
          if (isLink) {
            this.currentPage.annotations.push({
              rect: [cursorX, this.y - 2, cursorX + itemWidth, this.y + contactSize],
              url: item.url,
            });
          }
          cursorX += itemWidth;
        });
        this.y -= 14;
      } else {
        const line = contactItems.map((i) => i.text).join(" | ");
        this.drawWrapped(line, { font: "F1", size: contactSize, lineHeight: 12 });
      }
    }
  }

  drawTwoColumnRow(leftText, rightText, { font = "F1", size = 10, lineHeight = 13.5, rightFont = font } = {}) {
    const leftSafe = toPdfSafeText(leftText);
    const rightSafe = toPdfSafeText(rightText);
    const rightWidth = rightSafe ? estimateTextWidth(rightSafe, size, rightFont === "F2") : 0;
    const maxLeftWidth = rightSafe ? CONTENT_WIDTH - rightWidth - 14 : CONTENT_WIDTH;
    const leftLines = wrapPdfText(leftSafe, Math.max(120, maxLeftWidth), size, font === "F2");

    this.ensureSpace(lineHeight * Math.max(1, leftLines.length));
    if (leftLines.length > 0) {
      this.drawTextAt(leftLines[0], MARGIN_X, this.y, { font, size });
    }
    if (rightSafe) {
      this.drawTextAt(rightSafe, RIGHT_EDGE - rightWidth, this.y, { font: rightFont, size });
    }
    this.y -= lineHeight;

    for (let i = 1; i < leftLines.length; i += 1) {
      this.ensureSpace(lineHeight);
      this.drawTextAt(leftLines[i], MARGIN_X, this.y, { font, size });
      this.y -= lineHeight;
    }
  }

  drawWrapped(text, { x = MARGIN_X, width = CONTENT_WIDTH, font = "F1", size = 10, lineHeight = size * 1.25, justify = true } = {}) {
    const isBold = font === "F2";
    const lines = wrapPdfText(text, width, size, isBold);
    lines.forEach((line, idx) => {
      this.ensureSpace(lineHeight);
      const isLast = idx === lines.length - 1;
      const wordSpacing = justify && !isLast ? this.getJustifiedWordSpacing(line, width, size, isBold) : 0;
      this.drawTextAt(line, x, this.y, { font, size, wordSpacing });
      this.y -= lineHeight;
    });
  }

  drawLabelledLine(label, value, { size = 9.8, lineHeight = size * 1.25 } = {}) {
    const labelText = `${toPdfSafeText(label)}:`;
    const spaceWidth = estimateTextWidth(" ", size, false);
    const labelWidth = estimateTextWidth(labelText, size, true) + spaceWidth;
    const valueSafe = toPdfSafeText(value);
    const firstLineMax = Math.max(100, CONTENT_WIDTH - labelWidth);

    const words = valueSafe ? valueSafe.split(" ") : [];
    let firstLine = "";
    let splitIdx = 0;
    while (splitIdx < words.length) {
      const candidate = firstLine ? `${firstLine} ${words[splitIdx]}` : words[splitIdx];
      if (estimateTextWidth(candidate, size, false) <= firstLineMax || !firstLine) {
        firstLine = candidate;
        splitIdx += 1;
      } else {
        break;
      }
    }

    const hasMoreLines = splitIdx < words.length;
    const firstWordSpacing = hasMoreLines
      ? this.getJustifiedWordSpacing(firstLine, firstLineMax, size, false)
      : 0;

    this.ensureSpace(lineHeight);
    const labelWithSpace = `${toPdfSafeText(label)}: `;
    const parts = [`BT 1 0 0 1 ${MARGIN_X.toFixed(2)} ${this.y.toFixed(2)} Tm`];
    parts.push(`/${"F2"} ${size} Tf (${escapePdfString(labelWithSpace)}) Tj`);
    if (firstLine) {
      if (firstWordSpacing > 0) parts.push(`${firstWordSpacing.toFixed(3)} Tw`);
      parts.push(`/F1 ${size} Tf (${escapePdfString(toPdfSafeText(firstLine))}) Tj`);
      if (firstWordSpacing > 0) parts.push("0 Tw");
    }
    parts.push("ET");
    this.currentStream.push(parts.join(" "));
    this.y -= lineHeight;

    const rest = words.slice(splitIdx).join(" ");
    if (rest) {
      this.drawWrapped(rest, { x: MARGIN_X, width: CONTENT_WIDTH, font: "F1", size, lineHeight, justify: true });
    }
  }

  drawBullet(text, { indent = 22, bulletX = MARGIN_X + 12, size = 9.8, lineHeight = size * 1.25 } = {}) {
    const textWidth = CONTENT_WIDTH - indent;
    const lines = wrapPdfText(text, textWidth, size, false);
    if (lines.length === 0) return;

    lines.forEach((line, idx) => {
      this.ensureSpace(lineHeight);
      if (idx === 0) {
        // \225 is bullet (•) in WinAnsiEncoding
        this.currentStream.push(
          `BT /F1 ${size} Tf 1 0 0 1 ${bulletX.toFixed(2)} ${this.y.toFixed(2)} Tm (\\225) Tj ET`,
        );
      }
      const isLast = idx === lines.length - 1;
      const wordSpacing = !isLast ? this.getJustifiedWordSpacing(line, textWidth, size, false) : 0;
      this.drawTextAt(line, MARGIN_X + indent, this.y, { font: "F1", size, wordSpacing });
      this.y -= lineHeight;
    });
  }

  drawRule({ thickness = 0.75, gapBefore = 2, gapAfter = 7 } = {}) {
    this.y -= gapBefore;
    this.ensureSpace(gapAfter + thickness);
    this.currentStream.push(
      `q ${thickness.toFixed(2)} w 0.1 0.1 0.1 RG ${MARGIN_X} ${this.y.toFixed(2)} m ${RIGHT_EDGE} ${this.y.toFixed(2)} l S Q`,
    );
    this.y -= gapAfter;
  }

  drawSectionHeading(title) {
    this.y -= 5;
    this.ensureSpace(24);
    this.drawTextAt(toPdfSafeText(title).toUpperCase(), MARGIN_X, this.y, { font: "F1", size: 10.5 });
    this.y -= 4;
    this.drawRule({ thickness: 0.75, gapBefore: 0, gapAfter: 9 });
  }
}

function assemblePdfBytes(pages, { title = "", author = "" } = {}) {
  const objects = [];
  const pageObjectIds = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(""); // Placeholder for 2 0 obj (Pages)
  objects.push("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /ArialMT /Encoding /WinAnsiEncoding >>\nendobj\n");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Arial-BoldMT /Encoding /WinAnsiEncoding >>\nendobj\n");
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Arial-ItalicMT /Encoding /WinAnsiEncoding >>\nendobj\n");

  const infoParts = [];
  if (title) infoParts.push(`/Title (${escapePdfString(toPdfSafeText(title))})`);
  if (author) infoParts.push(`/Author (${escapePdfString(toPdfSafeText(author))})`);
  const infoId = infoParts.length ? 6 : null;
  if (infoId) {
    objects.push(`${infoId} 0 obj\n<< ${infoParts.join(" ")} >>\nendobj\n`);
  }

  let nextId = infoId ? 7 : 6;
  for (const page of pages) {
    const streamBody = page.commands.join("\n");
    const streamByteLen = encoder.encode(streamBody).length;
    const contentId = nextId++;

    const annotIds = [];
    for (const annot of page.annotations) {
      const annotId = nextId++;
      annotIds.push(annotId);
      const [x1, y1, x2, y2] = annot.rect.map((n) => n.toFixed(2));
      objects.push(
        `${annotId} 0 obj\n<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(annot.url)}) >> >>\nendobj\n`,
      );
    }

    const pageId = nextId++;
    pageObjectIds.push(pageId);

    const annotsEntry = annotIds.length
      ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]`
      : "";

    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${streamBody}\nendstream\nendobj\n`,
    );
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R${annotsEntry} >>\nendobj\n`,
    );
  }

  const kidsRef = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kidsRef}] /Count ${pageObjectIds.length} >>\nendobj\n`;

  // Re-order objects by object number so xref matches 1..N sequentially
  const sortedObjects = objects.map((obj, idx) => {
    const match = /^(\d+) 0 obj/.exec(obj);
    return { id: match ? Number(match[1]) : idx + 1, body: obj };
  });
  sortedObjects.sort((a, b) => a.id - b.id);

  const chunks = ["%PDF-1.4\n"];
  let byteOffset = encoder.encode(chunks[0]).length;
  const xrefOffsets = [0];

  for (const obj of sortedObjects) {
    xrefOffsets.push(byteOffset);
    chunks.push(obj.body);
    byteOffset += encoder.encode(obj.body).length;
  }

  const xrefStart = byteOffset;
  const xrefLines = [`xref\n0 ${xrefOffsets.length}\n`, "0000000000 65535 f \n"];
  for (let i = 1; i < xrefOffsets.length; i += 1) {
    xrefLines.push(`${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  const infoRef = infoId ? ` /Info ${infoId} 0 R` : "";
  const trailer = `trailer\n<< /Size ${xrefOffsets.length} /Root 1 0 R${infoRef} >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  chunks.push(xrefLines.join(""), trailer);

  return encoder.encode(chunks.join(""));
}

/**
 * Build an ATS-friendly PDF document (as Uint8Array) matching the clean two-column header format.
 * Contact header includes only Email, LinkedIn, and GitHub.
 * @param {object} data
 * @returns {Uint8Array}
 */
export function buildAtsResumePdfBytes(data) {
  const doc = new PdfDocCursor();

  const contactItems = [];
  if (data.phone) {
    contactItems.push({ text: data.phone });
  }
  if (data.email) {
    contactItems.push({ text: data.email, url: `mailto:${data.email}` });
  }
  for (const link of data.links || []) {
    contactItems.push({ text: link.url, url: link.url });
  }

  doc.drawCenteredHeader(data.fullName, contactItems);

  // Experience
  if (data.experience?.length) {
    doc.drawSectionHeading("Experience");
    for (const item of data.experience) {
      doc.drawTwoColumnRow(item.role, item.date, { font: "F2", size: 10, lineHeight: 12.5 });
      const cleanCompany = String(item.company ?? "").split(/\s*·\s*/)[0].trim();
      if (cleanCompany || item.location) {
        doc.drawTwoColumnRow(cleanCompany, item.location, { font: "F1", size: 9.8, lineHeight: 12.25 });
      }
      for (const bullet of item.bullets || []) {
        doc.drawBullet(bullet, { size: 9.6, lineHeight: 12 });
      }
      if (item.links?.length) {
        const linkText = item.links.map((l) => `${l.label}: ${l.url}`).join(" | ");
        doc.drawWrapped(linkText, {
          x: MARGIN_X + 22,
          width: CONTENT_WIDTH - 22,
          font: "F1",
          size: 9,
          lineHeight: 11.25,
          justify: false,
        });
      }
      doc.y -= 3;
    }
  }

  // Technical Skills
  if (data.skills?.length) {
    doc.drawSectionHeading("Technical Skills");
    for (const group of data.skills) {
      doc.drawLabelledLine(group.category, group.items.join(", "), { size: 9.6, lineHeight: 12 });
    }
  }

  return assemblePdfBytes(doc.pages, {
    title: `${data.fullName} - Resume`,
    author: data.fullName,
  });
}
