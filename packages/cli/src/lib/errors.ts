import chalk from "chalk";

export class CliError extends Error {
  constructor(message: string, public readonly hint?: string) {
    super(message);
    this.name = "CliError";
  }
}

export function die(err: unknown): never {
  if (err instanceof CliError) {
    process.stderr.write(chalk.red(`Error: ${err.message}\n`));
    if (err.hint) process.stderr.write(chalk.dim(`Hint:  ${err.hint}\n`));
  } else if (err instanceof Error) {
    process.stderr.write(chalk.red(`Error: ${err.message}\n`));
  } else {
    process.stderr.write(chalk.red(`Error: ${String(err)}\n`));
  }
  process.exit(1);
}
