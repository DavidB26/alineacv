import assert from "node:assert/strict";
import test from "node:test";
import { extractPdfOperatorItems, extractPdfPageText } from "../app/analizar-cv/pdf-text-extraction.mjs";

const OPS = { beginText: 1, setTextMatrix: 2, showText: 3, endText: 4 };

function operatorBlock(text, x, y) {
  return {
    fnArray: [OPS.beginText, OPS.setTextMatrix, OPS.showText, OPS.endText],
    argsArray: [null, [new Float32Array([1, 0, 0, 1, x, y])], [[...text].map((unicode) => ({ unicode }))], null],
  };
}

function operatorList(blocks) {
  return blocks.reduce((list, block) => ({
    fnArray: [...list.fnArray, ...block.fnArray],
    argsArray: [...list.argsArray, ...block.argsArray],
  }), { fnArray: [], argsArray: [] });
}

test("uses PDF operators to recover words when an Adobe PDF exposes nearly every glyph separately", () => {
  const fragmented = Array.from({ length: 60 }, (_, index) => ({
    str: index % 2 ? "a" : "R",
    transform: [1, 0, 0, 1, 250 + index, 700 - index],
    width: 8,
  }));
  const operations = operatorList([
    operatorBlock("RUBEN DARIO R.", 0.42, 0.95),
    operatorBlock("DISEÑADOR GRÁFICO", 0.42, 0.93),
    operatorBlock("SOBRE MÍ", 0.42, 0.88),
    operatorBlock("Mi nombre es Ruben Dario Rivera Llanos.", 0.42, 0.86),
    operatorBlock("EDUCACIÓN", 0.07, 0.80),
    operatorBlock("ISIL", 0.07, 0.76),
    operatorBlock("EXPERIENCIA LABORAL", 0.42, 0.79),
    operatorBlock("MAKE PUBLICIDAD", 0.54, 0.72),
    operatorBlock("Diseñador Gráfico Senior", 0.54, 0.70),
    operatorBlock("2020-2025", 0.44, 0.70),
  ]);
  const operatorItems = extractPdfOperatorItems(operations, OPS, 612, 1515);
  const text = extractPdfPageText(fragmented, 612, operatorItems);
  assert.match(text, /^RUBEN DARIO R\./);
  assert.match(text, /Mi nombre es Ruben Dario Rivera Llanos\./);
  assert.match(text, /EXPERIENCIA LABORAL[\s\S]*MAKE PUBLICIDAD[\s\S]*2020-2025 Diseñador Gráfico Senior/);
  assert.match(text, /EDUCACIÓN[\s\S]*ISIL/);
  assert.doesNotMatch(text, /R U B E N/);
});

test("keeps indented lines in the left column of a designed resume", () => {
  const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 5 });
  const items = [
    item("CURRÍCULUM", 42, 780),
    item("Soy diseñadora gráfica y actualmente curso el", 42, 750),
    item("último año de la carrera. Vivo en Lima y", 42, 735),
    item("EXPERIENCIA", 42, 650),
    item("Diseño Web (Tottus)", 42, 620),
    item("2023", 42, 605),
    item("Encargada de realizar el mantenimiento", 70, 605),
    item("SOFTWARE", 345, 650),
    item("Adobe Photoshop", 345, 620),
  ];
  const text = extractPdfPageText(items, 595);
  assert.match(text, /Vivo en Lima y/);
  assert.match(text, /EXPERIENCIA[\s\S]*Diseño Web \(Tottus\)/);
  assert.match(text, /SOFTWARE[\s\S]*Adobe Photoshop/);
});
