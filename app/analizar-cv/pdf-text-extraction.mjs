function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const HEADING_TYPES = new Map([
  ["contacto", "contact"], ["contact", "contact"],
  ["sobre mi", "profile"], ["perfil", "profile"], ["perfil profesional", "profile"], ["profile", "profile"], ["professional summary", "profile"],
  ["experiencia", "experience"], ["experiencia profesional", "experience"], ["experiencia laboral", "experience"], ["experience", "experience"], ["work experience", "experience"],
  ["software", "skills"], ["software skill", "skills"], ["software skills", "skills"], ["habilidades", "skills"], ["habilidades tecnicas", "skills"], ["skills", "skills"], ["tools", "skills"],
  ["lenguaje", "languages"], ["lenguajes", "languages"], ["idioma", "languages"], ["idiomas", "languages"], ["languages", "languages"],
  ["hobbies", "interests"], ["intereses", "interests"], ["interests", "interests"],
  ["educacion", "education"], ["formacion academica", "education"], ["education", "education"],
  ["certificaciones", "certifications"], ["cursos", "certifications"], ["certifications", "certifications"],
  ["algunos trabajos mios", "projects"], ["proyectos", "projects"], ["proyectos relevantes", "projects"], ["projects", "projects"],
]);

const SECTION_ORDER = ["profile", "experience", "education", "skills", "projects", "certifications", "languages", "interests", "contact"];

function cleanPdfText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function atomFromItem(item) {
  if (!("str" in item) || !item.str.trim()) return null;
  return {
    text: cleanPdfText(item.str),
    x: Number(item.transform?.[4] ?? 0),
    y: Number(item.transform?.[5] ?? 0),
    width: Number(item.width ?? 0),
  };
}

function groupRows(atoms, tolerance = 3.5) {
  const rows = [];
  for (const atom of [...atoms].sort((a, b) => b.y - a.y || a.x - b.x)) {
    let row = rows.find((candidate) => Math.abs(candidate.y - atom.y) <= tolerance);
    if (!row) {
      row = { y: atom.y, atoms: [] };
      rows.push(row);
    }
    row.atoms.push(atom);
    row.y = row.atoms.reduce((total, item) => total + item.y, 0) / row.atoms.length;
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.atoms.sort((a, b) => a.x - b.x).map((atom) => atom.text).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function columnBoundary(headings, viewportWidth) {
  const positions = [...new Set(headings.map((heading) => Math.round(heading.x)))].sort((a, b) => a - b);
  let widest = { gap: 0, boundary: viewportWidth / 2 };
  for (let index = 1; index < positions.length; index += 1) {
    const gap = positions[index] - positions[index - 1];
    if (gap > widest.gap) widest = { gap, boundary: positions[index - 1] + gap * 0.7 };
  }
  return widest.gap >= viewportWidth * 0.16 ? widest.boundary : viewportWidth / 2;
}

function fragmentedTextItems(items) {
  const visible = items.filter((item) => "str" in item && item.str.trim());
  if (visible.length < 40) return false;
  const fragments = visible.filter((item) => item.str.replace(/\s/g, "").length <= 2).length;
  return fragments / visible.length >= 0.72;
}

export function extractPdfOperatorItems(operatorList, ops, viewportWidth = 595, viewportHeight = 842) {
  const items = [];
  let text = "";
  let matrix = null;

  const flush = () => {
    const cleaned = cleanPdfText(text);
    if (cleaned && matrix) {
      const normalized = Math.abs(matrix[4]) <= 2 && Math.abs(matrix[5]) <= 2;
      items.push({
        str: cleaned,
        transform: [1, 0, 0, 1, normalized ? matrix[4] * viewportWidth : matrix[4], normalized ? matrix[5] * viewportHeight : matrix[5]],
        width: 0,
      });
    }
    text = "";
    matrix = null;
  };

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index];
    if (fn === ops.beginText) {
      flush();
      continue;
    }
    if (fn === ops.setTextMatrix) {
      matrix = operatorList.argsArray[index]?.[0] ?? null;
      continue;
    }
    if (fn === ops.showText) {
      for (const glyph of operatorList.argsArray[index]?.[0] ?? []) {
        if (typeof glyph === "string") text += glyph;
        else if (glyph && typeof glyph === "object" && glyph.unicode) text += glyph.unicode;
      }
      continue;
    }
    if (fn === ops.endText) flush();
  }
  flush();
  return items;
}

function uniqueDocumentLines(lines) {
  const seen = new Map();
  return lines.filter((line) => {
    const key = normalize(line);
    if (!key) return false;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (/^(?:curriculum|curriculum vitae|cv|resume)$/.test(key)) return count === 0;
    return true;
  });
}

function columnCards(atoms) {
  const columns = [];
  for (const atom of [...atoms].sort((a, b) => a.x - b.x || b.y - a.y)) {
    let column = columns.find((candidate) => Math.abs(candidate.x - atom.x) <= 28);
    if (!column) {
      column = { x: atom.x, atoms: [] };
      columns.push(column);
    }
    column.atoms.push(atom);
    column.x = column.atoms.reduce((total, item) => total + item.x, 0) / column.atoms.length;
  }

  const cards = [];
  for (const column of columns.sort((a, b) => a.x - b.x)) {
    let segment = [];
    let previousY = null;
    const flush = () => {
      if (!segment.length) return;
      const text = segment.sort((a, b) => b.y - a.y || a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) cards.push({ x: column.x, y: Math.max(...segment.map((item) => item.y)), text });
      segment = [];
    };
    for (const atom of column.atoms.sort((a, b) => b.y - a.y || a.x - b.x)) {
      if (previousY !== null && previousY - atom.y > 28) flush();
      segment.push(atom);
      previousY = atom.y;
    }
    flush();
  }
  return cards.sort((a, b) => b.y - a.y || a.x - b.x).map((card) => card.text);
}

function contentForHeading(atoms, heading, headings, boundary) {
  const side = heading.x < boundary ? "left" : "right";
  const lowerHeading = headings
    .filter((candidate) => candidate !== heading && (candidate.x < boundary ? "left" : "right") === side && candidate.y < heading.y - 4)
    .sort((a, b) => b.y - a.y)[0];
  const lowerY = lowerHeading?.y ?? -Infinity;
  const sideAtoms = atoms.filter((atom) =>
    atom !== heading.atom
    && (atom.x < boundary ? "left" : "right") === side
    && atom.y < heading.y - 4
    && atom.y > lowerY + 4
    && !HEADING_TYPES.has(normalize(atom.text)));

  if (["skills", "languages", "interests"].includes(heading.type)) return columnCards(sideAtoms);
  return groupRows(sideAtoms);
}

export function extractPdfPageText(items, viewportWidth = 595, operatorItems = []) {
  const selectedItems = fragmentedTextItems(items) && operatorItems.length ? operatorItems : items;
  const atoms = selectedItems.map(atomFromItem).filter(Boolean);
  if (!atoms.length) return "";
  const headings = atoms
    .map((atom) => ({ atom, x: atom.x, y: atom.y, text: atom.text, type: HEADING_TYPES.get(normalize(atom.text)) }))
    .filter((heading) => heading.type);
  const boundary = columnBoundary(headings, viewportWidth);
  const leftHeadings = headings.filter((heading) => heading.x < boundary);
  const rightHeadings = headings.filter((heading) => heading.x >= boundary);
  const multiColumn = leftHeadings.length > 0 && rightHeadings.length > 0;

  if (!multiColumn) return uniqueDocumentLines(groupRows(atoms)).join("\n");

  const highestLeft = Math.max(...leftHeadings.map((heading) => heading.y));
  const highestRight = Math.max(...rightHeadings.map((heading) => heading.y));
  const preamble = uniqueDocumentLines([
    ...groupRows(atoms.filter((atom) => atom.x < boundary && atom.y > highestLeft + 4 && !HEADING_TYPES.has(normalize(atom.text)))),
    ...groupRows(atoms.filter((atom) => atom.x >= boundary && atom.y > highestRight + 4 && !HEADING_TYPES.has(normalize(atom.text)))),
  ]);

  const blocks = [...preamble];
  for (const type of SECTION_ORDER) {
    const matching = headings.filter((heading) => heading.type === type).sort((a, b) => b.y - a.y);
    for (const heading of matching) {
      const content = contentForHeading(atoms, heading, headings, boundary);
      if (!content.length) continue;
      blocks.push(heading.text, ...content);
    }
  }
  return blocks.join("\n");
}
