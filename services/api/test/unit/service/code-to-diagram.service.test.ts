import { describe, expect, it, vi } from "vitest";
import { CodeToDiagramService } from "../../../src/service/code-to-diagram.service";
import type { LlmService } from "../../../src/common/llm.service";

function makeLlm(reply: string) {
  const completeText = vi.fn().mockResolvedValue(reply);
  return { llm: { completeText } as unknown as LlmService, completeText };
}

describe("CodeToDiagramService.generate", () => {
  it("passes code and hint into the user prompt", async () => {
    const { llm, completeText } = makeLlm("Web > API");
    const svc = new CodeToDiagramService(llm);
    await svc.generate({ code: "version: '3'\nservices:\n  api: {}", hint: "architecture" });
    const args = completeText.mock.calls[0]![0]!;
    expect(args.user).toMatch(/version: '3'/);
    expect(args.user).toMatch(/architecture diagram/);
    expect(args.system).toMatch(/OctoFocusAI DSL/);
  });

  it("auto hint asks the model to choose a style", async () => {
    const { llm, completeText } = makeLlm("A > B");
    const svc = new CodeToDiagramService(llm);
    await svc.generate({ code: "print('hi')" });
    expect(completeText.mock.calls[0]![0]!.user).toMatch(/Choose the most natural diagram/);
  });

  it("includes existing DSL when refining", async () => {
    const { llm, completeText } = makeLlm("Web > API\nAPI > DB");
    const svc = new CodeToDiagramService(llm);
    await svc.generate({
      code: "x",
      currentDsl: "Web > API",
    });
    const user = completeText.mock.calls[0]![0]!.user;
    expect(user).toMatch(/existing DSL/);
    expect(user).toMatch(/Web > API/);
  });

  it("strips a fenced code block if Claude wraps the output", async () => {
    const { llm } = makeLlm("```\nWeb > API\nAPI > DB\n```");
    const svc = new CodeToDiagramService(llm);
    const out = await svc.generate({ code: "x" });
    expect(out.dsl).toBe("Web > API\nAPI > DB");
  });

  it("strips a language-tagged fence", async () => {
    const { llm } = makeLlm("```dsl\nA > B\n```");
    const svc = new CodeToDiagramService(llm);
    const out = await svc.generate({ code: "x" });
    expect(out.dsl).toBe("A > B");
  });

  it("leaves un-fenced output untouched", async () => {
    const { llm } = makeLlm("  Web > API  ");
    const svc = new CodeToDiagramService(llm);
    const out = await svc.generate({ code: "x" });
    expect(out.dsl).toBe("Web > API");
  });

  it("returns the explicit hint as detectedKind when not auto", async () => {
    const { llm } = makeLlm("A > B");
    const svc = new CodeToDiagramService(llm);
    const out = await svc.generate({ code: "x", hint: "sequence" });
    expect(out.detectedKind).toBe("sequence");
  });

  it("defaults to architecture when hint is auto", async () => {
    const { llm } = makeLlm("A > B");
    const svc = new CodeToDiagramService(llm);
    const out = await svc.generate({ code: "x", hint: "auto" });
    expect(out.detectedKind).toBe("architecture");
  });
});
