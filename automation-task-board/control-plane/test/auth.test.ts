// 登入授權與 worker token 的決策邏輯測試（node --test，Node 24 type stripping）
import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeSignIn, parseAllowlist } from "../src/lib/allowlist.ts";
import { generateWorkerToken, hashWorkerToken, isTokenUsable } from "../src/lib/worker-auth.ts";

test("非清單帳號被拒絕", () => {
  assert.equal(authorizeSignIn("outsider@example.com", "a@example.com,b@example.com"), false);
});

test("合法帳號放行（大小寫與空白不敏感）", () => {
  assert.equal(authorizeSignIn("A@Example.com", " a@example.com , b@example.com "), true);
});

test("未設定允許清單時一律拒絕（fail closed）", () => {
  assert.equal(authorizeSignIn("a@example.com", undefined), false);
  assert.equal(authorizeSignIn("a@example.com", ""), false);
});

test("email 缺漏被拒絕", () => {
  assert.equal(authorizeSignIn(null, "a@example.com"), false);
  assert.equal(authorizeSignIn(undefined, "a@example.com"), false);
});

test("parseAllowlist 忽略空項", () => {
  assert.deepEqual([...parseAllowlist("a@x.com,, ,b@x.com")], ["a@x.com", "b@x.com"]);
});

test("worker token 產生、雜湊與可用性", () => {
  const token = generateWorkerToken();
  assert.match(token, /^wtk_[A-Za-z0-9_-]{32}$/);
  assert.equal(hashWorkerToken(token).length, 64);
  assert.notEqual(hashWorkerToken(token), hashWorkerToken(generateWorkerToken()));
  assert.equal(isTokenUsable(token, { revokedAt: null }), true);
  assert.equal(isTokenUsable(token, { revokedAt: new Date() }), false, "已撤銷 token 拒絕");
  assert.equal(isTokenUsable(token, null), false, "查無紀錄拒絕");
  assert.equal(isTokenUsable("not-a-wtk-token", { revokedAt: null }), false, "格式不符拒絕");
});
