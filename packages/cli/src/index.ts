#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentCommand } from "./commands/agent.js";
import { authCommand } from "./commands/auth.js";
import { canvasCommand } from "./commands/canvas.js";
import { diagramCommand } from "./commands/diagram.js";
import { loginCommand, logoutCommand } from "./commands/login.js";
import { pageCommand } from "./commands/page.js";
import { projectCommand } from "./commands/project.js";
import { whoamiCommand } from "./commands/whoami.js";
import { workspaceCommand } from "./commands/workspace.js";
import { die } from "./lib/errors.js";
import { setDefaultMode } from "./lib/output.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8")) as {
  version: string;
};

const program = new Command();

program
  .name("octofocus")
  .description("OctoFocusAI workspace CLI")
  .version(pkg.version)
  .showHelpAfterError()
  .option("--pretty", "Force human output (tables) even when stdout is piped")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.pretty) setDefaultMode("pretty");
  });

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(whoamiCommand());
program.addCommand(authCommand());
program.addCommand(workspaceCommand());
program.addCommand(projectCommand());
program.addCommand(pageCommand());
program.addCommand(canvasCommand());
program.addCommand(agentCommand());
program.addCommand(diagramCommand());

program.parseAsync(process.argv).catch(die);
