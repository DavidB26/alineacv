import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) throw error;
    for (const extension of [".tsx", ".ts"]) {
      try { return await nextResolve(specifier + extension, context); } catch { /* Try the next source extension. */ }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!/\.(tsx|ts)$/.test(url)) return nextLoad(url, context);
  const source = await readFile(new URL(url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: new URL(url).pathname,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  return { source: outputText, format: "module", shortCircuit: true };
}
