function normalize(value) { return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

const MONTHS = new Map([
  ["ene", "01"], ["enero", "01"], ["jan", "01"], ["january", "01"],
  ["feb", "02"], ["febrero", "02"], ["february", "02"],
  ["mar", "03"], ["marzo", "03"], ["march", "03"],
  ["abr", "04"], ["abril", "04"], ["apr", "04"], ["april", "04"],
  ["may", "05"], ["mayo", "05"],
  ["jun", "06"], ["junio", "06"], ["june", "06"],
  ["jul", "07"], ["julio", "07"], ["july", "07"],
  ["ago", "08"], ["agosto", "08"], ["aug", "08"], ["august", "08"],
  ["sep", "09"], ["sept", "09"], ["septiembre", "09"], ["september", "09"],
  ["oct", "10"], ["octubre", "10"], ["october", "10"],
  ["nov", "11"], ["noviembre", "11"], ["november", "11"],
  ["dic", "12"], ["diciembre", "12"], ["dec", "12"], ["december", "12"],
]);

export function normalizeResumeDates(value) {
  return String(value ?? "").replace(/\b([A-Za-zÁÉÍÓÚáéíóú]{3,10})[.\s]+((?:19|20)\d{2})\b/g, (match, month, year) => {
    const number = MONTHS.get(normalize(month));
    return number ? number + "/" + year : match;
  });
}

