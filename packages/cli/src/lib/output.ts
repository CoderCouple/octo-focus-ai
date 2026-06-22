import chalk from "chalk";
import Table from "cli-table3";

export interface OutputOptions {
  json?: boolean;
}

export function emit<T>(data: T, opts: OutputOptions, render: (data: T) => void): void {
  if (opts.json) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }
  render(data);
}

export function table(head: string[], rows: (string | number | null | undefined)[][]): string {
  const t = new Table({
    head: head.map((h) => chalk.bold(h)),
    style: { head: [], border: ["grey"] },
    wordWrap: true,
  });
  for (const row of rows) {
    t.push(row.map((c) => (c === null || c === undefined ? chalk.dim("—") : String(c))));
  }
  return t.toString();
}

export function info(msg: string): void {
  process.stderr.write(chalk.dim(msg) + "\n");
}

export function success(msg: string): void {
  process.stderr.write(chalk.bold(msg) + "\n");
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)) + "…";
}
