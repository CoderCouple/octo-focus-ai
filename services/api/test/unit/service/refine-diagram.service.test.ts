import { describe, expect, it, vi } from "vitest";
import { RefineDiagramService } from "../../../src/service/refine-diagram.service";
import type { LlmService } from "../../../src/common/llm.service";

function makeLlm(reply: string) {
  const completeText = vi.fn().mockResolvedValue(reply);
  return { llm: { completeText } as unknown as LlmService, completeText };
}

describe("RefineDiagramService.refine", () => {
  it("sends the current DSL and instruction into the user prompt", async () => {
    const { llm, completeText } = makeLlm("Web > API");
    const svc = new RefineDiagramService(llm);
    await svc.refine({
      currentDsl: "Web > API\nAPI > DB",
      instruction: "Add a CDN in front of Web",
    });
    const args = completeText.mock.calls[0]![0]!;
    expect(args.user).toMatch(/Current DSL:/);
    expect(args.user).toMatch(/API > DB/);
    expect(args.user).toMatch(/Instruction: Add a CDN/);
  });

  it("strips a fenced output if Claude returns one", async () => {
    const { llm } = makeLlm("```dsl\nA > B\nB > C\n```");
    const svc = new RefineDiagramService(llm);
    const out = await svc.refine({ currentDsl: "A > B", instruction: "add C" });
    expect(out.dsl).toBe("A > B\nB > C");
  });

  it("biases the prompt with an explicit hint", async () => {
    const { llm, completeText } = makeLlm("A > B");
    const svc = new RefineDiagramService(llm);
    await svc.refine({
      currentDsl: "A > B",
      instruction: "convert to a sequence",
      hint: "sequence",
    });
    expect(completeText.mock.calls[0]![0]!.user).toMatch(/Preferred diagram style: sequence/);
  });

  it("does NOT add a hint line when auto", async () => {
    const { llm, completeText } = makeLlm("A > B");
    const svc = new RefineDiagramService(llm);
    await svc.refine({ currentDsl: "A > B", instruction: "x", hint: "auto" });
    expect(completeText.mock.calls[0]![0]!.user).not.toMatch(/Preferred diagram style/);
  });
});
