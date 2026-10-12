import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveLang } from "./resolve-lang.ts";

describe("resolveLang", () => {
  it("lets an explicit address language win over the profile and the header", () => {
    assert.equal(
      resolveLang({ urlLang: "uk", cookie: "ru", acceptLanguage: "en-US,en;q=0.9" }),
      "uk",
    );
    assert.equal(resolveLang({ urlLang: "en", cookie: "uk", acceptLanguage: "ru" }), "en");
  });

  it("uses the profile cookie when the address has no language", () => {
    assert.equal(resolveLang({ urlLang: undefined, cookie: "uk", acceptLanguage: "en-US" }), "uk");
    assert.equal(resolveLang({ urlLang: null, cookie: "ru", acceptLanguage: "uk-UA" }), "ru");
    assert.equal(resolveLang({ cookie: "en", acceptLanguage: "uk" }), "en");
  });

  it("uses Accept-Language only when the address and the profile are unset", () => {
    assert.equal(resolveLang({ urlLang: undefined, cookie: null, acceptLanguage: "uk-UA,ru;q=0.8" }), "uk");
    assert.equal(resolveLang({ cookie: "nope", acceptLanguage: "ru-RU,ru;q=0.9" }), "ru");
    assert.equal(resolveLang({ acceptLanguage: "en-US,en;q=0.9" }), "en");
    assert.equal(resolveLang({}), "en");
  });
});
