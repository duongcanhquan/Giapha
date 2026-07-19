import assert from "node:assert/strict";
import { normalizeKey, normalizePhone } from "./normalize";

function run() {
  assert.equal(normalizePhone("0901 234 567"), "0901234567");
  assert.equal(normalizePhone("+84 901 234 567"), "0901234567");
  assert.equal(normalizePhone("84901234567"), "0901234567");
  assert.equal(normalizePhone("84-901-234-567"), "0901234567");

  assert.equal(normalizeKey("  Nguyễn  "), "nguyen");
  assert.equal(normalizeKey("a@Email.COM"), "a@email.com");

  console.log("registration/normalize.test: ok");
}

run();
