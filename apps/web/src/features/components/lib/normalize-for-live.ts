/**
 * react-live needs either an expression (noInline=false) or a script
 * that ends with `render(<Component />)` (noInline=true). Claude tends
 * to emit `export default function Foo() { ... }`, which is neither.
 * This helper normalises both shapes so the same code path covers
 * paste-from-studio AND hand-written components.
 *
 * Rules:
 *   - Strip `import { ... } from 'react'` and any other top-level imports
 *     (we have no module resolver; hooks come from `scope`)
 *   - Strip `export default ` so the function/const reaches scope
 *   - Detect the top-level component name and auto-append
 *     `render(<Name />)` if the code didn't include a render call
 *
 * Used by both the Components studio (live preview) and the
 * generativeUi BlockNote block (embedded preview).
 */
export function normalizeForLive(raw: string): string {
  let code = raw.trim();

  // Drop `import ... from 'react'` — hooks come from scope. Strip other
  // imports too; the LiveError shows useful messages if the user
  // references missing identifiers.
  code = code.replace(/^\s*import\s+[^;]+from\s+['"][^'"]+['"];?\s*$/gm, "");
  code = code.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, "");

  // Capture default-export name before stripping the keyword.
  const exportFnMatch = code.match(/export\s+default\s+function\s+([A-Z]\w*)/);
  const exportConstMatch = code.match(/export\s+default\s+([A-Z]\w*)\s*;?/);
  const exportArrowMatch = code.match(
    /export\s+default\s+(?:\(\s*\)|function\s*\(\s*\))\s*=>\s*/,
  );

  let detectedName: string | null = null;
  if (exportFnMatch) detectedName = exportFnMatch[1];
  else if (exportConstMatch) detectedName = exportConstMatch[1];

  code = code.replace(/export\s+default\s+/g, "");

  if (!detectedName) {
    const topFn = code.match(/(?:^|\n)function\s+([A-Z]\w*)/);
    const topConst = code.match(/(?:^|\n)const\s+([A-Z]\w*)\s*=/);
    if (topFn) detectedName = topFn[1];
    else if (topConst) detectedName = topConst[1];
  }

  const hasRenderCall = /\brender\s*\(/.test(code);
  if (!hasRenderCall) {
    if (detectedName) {
      code = `${code}\n\nrender(<${detectedName} />);`;
    } else if (exportArrowMatch) {
      code = code.replace(/export\s+default\s+/, "const __Component = ");
      code = `${code}\n\nrender(<__Component />);`;
    }
  }

  return code.trim();
}
