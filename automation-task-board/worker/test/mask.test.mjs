// log 遮罩測試：spec「Log capture and masking」的 example table
import assert from "node:assert/strict";
import { test } from "node:test";
import { createMasker } from "../lib/mask.mjs";

test("環境變數值被遮罩", () => {
  const mask = createMasker({ envValues: ["figd_super_secret_token_value"] });
  assert.equal(mask("using token figd_super_secret_token_value here"), "using token [redacted] here");
});

test("credential pattern 的值被遮罩", () => {
  const mask = createMasker({ envValues: [] });
  assert.equal(mask("api_key=sk-abc123"), "api_key=[redacted]");
  assert.equal(mask("password: hunter2secret"), "password: [redacted]");
  assert.equal(mask('MY_TOKEN="abc-def-ghi"'), "MY_TOKEN=[redacted]");
});

test("一般輸出不動", () => {
  const mask = createMasker({ envValues: ["long_env_value_1234"] });
  assert.equal(mask("build ok: 12 files compiled"), "build ok: 12 files compiled");
});

test("過短的環境變數值不整段遮罩（避免污染整份 log）", () => {
  const mask = createMasker({ envValues: ["en", "1", "/"] });
  assert.equal(mask("locale en version 1 path /x"), "locale en version 1 path /x");
});

test("長值優先替換，避免部分遮罩殘留", () => {
  const mask = createMasker({ envValues: ["secret123", "secret123-extended"] });
  assert.equal(mask("a secret123-extended b"), "a [redacted] b");
});
