#!/usr/bin/env node
import { Command } from "commander";
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

const program = new Command();

program
  .name("octofocus")
  .description("OctoFocusAI workspace CLI")
  .version("0.1.0")
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
