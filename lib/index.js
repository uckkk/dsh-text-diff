// dsh-text-diff — 行级文本 diff（DeepSeek Harness）。纯 Node。
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "文本 Diff";
const inject = ["tools"];

function lcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp;
}

function diffLines(a, b) {
  const dp = lcs(a, b);
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ type: "same", line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "removed", line: a[i] }); i++; }
    else { out.push({ type: "added", line: b[j] }); j++; }
  }
  while (i < a.length) { out.push({ type: "removed", line: a[i] }); i++; }
  while (j < b.length) { out.push({ type: "added", line: b[j] }); j++; }
  return out;
}

async function apply(ctx, _config) {
  ctx.tools.register(defineTool({
    name: "diff_lines",
    description: "按行对比两段文本，返回 unified diff（- 删除 / + 新增 / 空格 相同）。`a` 传旧文本，`b` 传新文本。",
    parameters: {
      a: { type: "string", required: true, description: "旧文本。" },
      b: { type: "string", required: true, description: "新文本。" },
    },
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          added: { type: "integer", required: true }, removed: { type: "integer", required: true },
          diff: { type: "string", required: true },
        },
      },
      render: (_a, v) => [{ type: "text", text: v.diff.slice(0, 3000) }],
    },
    execute: async (args) => {
      const A = String(args.a).split("\n"), B = String(args.b).split("\n");
      const out = diffLines(A, B);
      const lines = out.map((d) => (d.type === "removed" ? "- " + d.line : d.type === "added" ? "+ " + d.line : "  " + d.line));
      return {
        added: out.filter((d) => d.type === "added").length,
        removed: out.filter((d) => d.type === "removed").length,
        diff: lines.join("\n"),
      };
    },
  }));
}

export { apply, inject, name };
