import { describe, expect, it } from "vitest";
import { iconToEmoji, parseDsl, serializeDsl } from "@octofocus/diagrams";

describe("parseDsl — bare nodes + edges", () => {
  it("parses a single bare node", () => {
    const { diagram, errors } = parseDsl("Web Client");
    expect(errors).toEqual([]);
    expect(diagram.nodes).toHaveLength(1);
    expect(diagram.nodes[0]!.name).toBe("Web Client");
    expect(diagram.nodes[0]!.label).toBe("Web Client");
  });

  it("parses a directed edge and auto-declares both ends", () => {
    const { diagram } = parseDsl("Web > API");
    expect(diagram.nodes.map((n) => n.name)).toEqual(["Web", "API"]);
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]!.label).toBeUndefined();
  });

  it("captures an edge label after the colon", () => {
    const { diagram } = parseDsl("Web > API: HTTPS");
    expect(diagram.edges[0]!.label).toBe("HTTPS");
  });

  it("ignores blank lines and comments", () => {
    const src = `
# header comment

Web > API   // trailing comment
`;
    const { diagram } = parseDsl(src);
    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.edges).toHaveLength(1);
  });
});

describe("parseDsl — attributes", () => {
  it("parses an icon attribute on a node", () => {
    const { diagram } = parseDsl("Lambda [icon: aws-lambda]");
    expect(diagram.nodes[0]!.icon).toBe("aws-lambda");
    expect(diagram.nodes[0]!.name).toBe("Lambda");
    expect(diagram.nodes[0]!.label).toBe("Lambda");
  });

  it("parses icon + color + shape together", () => {
    const { diagram } = parseDsl(
      "Postgres [icon: aws-rds, color: blue, shape: cylinder]",
    );
    const n = diagram.nodes[0]!;
    expect(n.icon).toBe("aws-rds");
    expect(n.color).toBe("blue");
    expect(n.shape).toBe("cylinder");
  });

  it("honors an explicit label attribute distinct from name", () => {
    const { diagram } = parseDsl('AuthSvc [label: "Auth Service", icon: shield]');
    expect(diagram.nodes[0]!.name).toBe("AuthSvc");
    expect(diagram.nodes[0]!.label).toBe("Auth Service");
  });

  it("parses node attributes inside an edge declaration", () => {
    const { diagram } = parseDsl("Web > Lambda [icon: aws-lambda]");
    const lambda = diagram.nodes.find((n) => n.name === "Lambda")!;
    expect(lambda.icon).toBe("aws-lambda");
  });

  it("parses an edge-level color attribute", () => {
    const { diagram } = parseDsl("Web > API: HTTPS [color: green]");
    expect(diagram.edges[0]!.color).toBe("green");
    expect(diagram.edges[0]!.label).toBe("HTTPS");
  });

  it("merges attributes across repeated declarations", () => {
    const { diagram } = parseDsl(`
Lambda
Lambda [icon: aws-lambda]
Lambda [color: orange]
`);
    expect(diagram.nodes).toHaveLength(1);
    expect(diagram.nodes[0]!.icon).toBe("aws-lambda");
    expect(diagram.nodes[0]!.color).toBe("orange");
  });

  it("tolerates unknown attribute keys without erroring", () => {
    const { diagram, errors } = parseDsl("Foo [icon: zap, mystery: 42]");
    expect(errors).toEqual([]);
    expect(diagram.nodes[0]!.icon).toBe("zap");
  });
});

describe("parseDsl — quoted names", () => {
  it("preserves spaces inside quoted node names", () => {
    const { diagram } = parseDsl('"Auth Service" [icon: shield]');
    expect(diagram.nodes[0]!.name).toBe("Auth Service");
    expect(diagram.nodes[0]!.icon).toBe("shield");
  });

  it("does not split on > inside quoted strings", () => {
    const { diagram } = parseDsl('User > "https://localhost:8080": GET');
    expect(diagram.nodes.map((n) => n.name)).toEqual(["User", "https://localhost:8080"]);
    expect(diagram.edges[0]!.label).toBe("GET");
  });

  it("does not strip # comments inside quoted names", () => {
    const { diagram } = parseDsl('"channel#general" > Slack');
    expect(diagram.nodes[0]!.name).toBe("channel#general");
  });
});

describe("parseDsl — error reporting", () => {
  it("flags an edge missing the right-hand side", () => {
    const { errors } = parseDsl("Web >");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.line).toBe(1);
  });

  it("doesn't blow up on malformed brackets", () => {
    const { diagram } = parseDsl("Lambda [icon: aws-lambda");
    // We fail safe — treat the whole text as a name when brackets don't close.
    expect(diagram.nodes[0]!.name).toContain("Lambda");
  });
});

describe("serializeDsl round-trip", () => {
  it("round-trips attributes and edge labels", () => {
    const src = `Lambda [icon: aws-lambda, color: orange]
Postgres [icon: aws-rds]
Web > Lambda: HTTPS
Lambda > Postgres`;
    const { diagram } = parseDsl(src);
    const out = serializeDsl(diagram);
    // Reparse to confirm semantic equivalence.
    const reparsed = parseDsl(out).diagram;
    expect(reparsed.nodes.find((n) => n.name === "Lambda")!.icon).toBe("aws-lambda");
    expect(reparsed.nodes.find((n) => n.name === "Lambda")!.color).toBe("orange");
    expect(reparsed.edges.find((e) => e.label === "HTTPS")).toBeTruthy();
  });
});

describe("parseDsl — multi-target fan-out", () => {
  it("declares one edge per target in `A > B, C, D`", () => {
    const { diagram } = parseDsl("Server > Worker1, Worker2, Worker3");
    expect(diagram.nodes.map((n) => n.name)).toEqual([
      "Server",
      "Worker1",
      "Worker2",
      "Worker3",
    ]);
    expect(diagram.edges).toHaveLength(3);
    expect(diagram.edges.map((e) => e.targetId)).toEqual([
      "worker1-1",
      "worker2-2",
      "worker3-3",
    ]);
  });

  it("propagates the label and edge attrs to every fan-out edge", () => {
    const { diagram } = parseDsl("API > Lambda, Worker: invoke [color: green]");
    expect(diagram.edges).toHaveLength(2);
    expect(diagram.edges[0]!.label).toBe("invoke");
    expect(diagram.edges[0]!.color).toBe("green");
    expect(diagram.edges[1]!.label).toBe("invoke");
    expect(diagram.edges[1]!.color).toBe("green");
  });

  it("respects quoted names inside the target list", () => {
    const { diagram } = parseDsl('Web > "Auth Service", "User DB"');
    expect(diagram.nodes.map((n) => n.name)).toEqual([
      "Web",
      "Auth Service",
      "User DB",
    ]);
    expect(diagram.edges).toHaveLength(2);
  });

  it("attaches per-target attributes correctly", () => {
    const { diagram } = parseDsl(
      "Web > Lambda [icon: aws-lambda], Postgres [icon: aws-rds]",
    );
    const lambda = diagram.nodes.find((n) => n.name === "Lambda")!;
    const postgres = diagram.nodes.find((n) => n.name === "Postgres")!;
    expect(lambda.icon).toBe("aws-lambda");
    expect(postgres.icon).toBe("aws-rds");
  });
});

describe("parseDsl — groups", () => {
  it("parses a top-level group with bare children", () => {
    const src = `
AWS [icon: aws] {
  Lambda
  RDS
}
`;
    const { diagram, errors } = parseDsl(src);
    expect(errors).toEqual([]);
    const aws = diagram.nodes.find((n) => n.name === "AWS")!;
    expect(aws.isGroup).toBe(true);
    expect(aws.icon).toBe("aws");
    const lambda = diagram.nodes.find((n) => n.name === "Lambda")!;
    const rds = diagram.nodes.find((n) => n.name === "RDS")!;
    expect(lambda.parentId).toBe(aws.id);
    expect(rds.parentId).toBe(aws.id);
  });

  it("supports nested groups", () => {
    const src = `
VPC [icon: cloud] {
  PublicSubnet {
    Bastion [icon: aws-ec2]
  }
  PrivateSubnet {
    AppServer [icon: aws-ec2]
    Database [icon: aws-rds]
  }
}
`;
    const { diagram, errors } = parseDsl(src);
    expect(errors).toEqual([]);
    const vpc = diagram.nodes.find((n) => n.name === "VPC")!;
    const pub = diagram.nodes.find((n) => n.name === "PublicSubnet")!;
    const priv = diagram.nodes.find((n) => n.name === "PrivateSubnet")!;
    const bastion = diagram.nodes.find((n) => n.name === "Bastion")!;
    const appServer = diagram.nodes.find((n) => n.name === "AppServer")!;
    expect(pub.parentId).toBe(vpc.id);
    expect(priv.parentId).toBe(vpc.id);
    expect(bastion.parentId).toBe(pub.id);
    expect(appServer.parentId).toBe(priv.id);
    expect(vpc.isGroup).toBe(true);
    expect(pub.isGroup).toBe(true);
    expect(priv.isGroup).toBe(true);
  });

  it("flags an unclosed group", () => {
    const src = `
AWS {
  Lambda
`;
    const { errors } = parseDsl(src);
    expect(errors.some((e) => e.message.includes("Unclosed"))).toBe(true);
  });

  it("flags a stray closing brace", () => {
    const { errors } = parseDsl("}\nLambda");
    expect(errors.some((e) => e.message.includes("Unexpected"))).toBe(true);
  });

  it("allows edges that reference nodes inside groups", () => {
    const src = `
AWS {
  Lambda
}
Web > Lambda
`;
    const { diagram } = parseDsl(src);
    expect(diagram.edges).toHaveLength(1);
    const lambda = diagram.nodes.find((n) => n.name === "Lambda")!;
    expect(lambda.parentId).toBe(diagram.nodes.find((n) => n.name === "AWS")!.id);
  });
});

describe("iconToEmoji", () => {
  it("returns a glyph for known icon names", () => {
    expect(iconToEmoji("aws-lambda")).toBe("λ");
    expect(iconToEmoji("user")).toBe("👤");
    expect(iconToEmoji("postgres")).toBe("🐘");
  });

  it("normalises case before lookup", () => {
    expect(iconToEmoji("AWS-Lambda")).toBe("λ");
    expect(iconToEmoji("  user  ")).toBe("👤");
  });

  it("returns null for unknown icon names", () => {
    expect(iconToEmoji("totally-made-up")).toBeNull();
  });

  it("returns null for undefined / empty input", () => {
    expect(iconToEmoji(undefined)).toBeNull();
    expect(iconToEmoji("")).toBeNull();
  });
});
