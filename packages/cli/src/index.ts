#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program.name("octofocus").description("OctoFocusAI workspace CLI").version("0.1.0");

program
  .command("login")
  .description("Start Supabase-backed CLI login flow")
  .action(() => {
    console.log("CLI login flow will be wired after Supabase project credentials are configured.");
  });

program
  .command("agent")
  .argument("<prompt>", "Agent task prompt")
  .description("Run an OctoFocusAI agent task")
  .action((prompt: string) => {
    console.log(`Agent task queued locally: ${prompt}`);
  });

program.parse();
