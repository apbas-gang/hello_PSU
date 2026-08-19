import assert from "node:assert/strict";
import test from "node:test";
import { extractTranslation, readAssistantContent, stripReasoning } from "../src/translation-service.js";

test("strips complete reasoning tags from a model response", () => {
  assert.equal(stripReasoning("<think>internal reasoning</think>สวัสดีครับ"), "สวัสดีครับ");
});
test("drops unfinished reasoning blocks instead of exposing them", () => {
  assert.equal(stripReasoning("<think>internal reasoning"), "");
});
test("reads content-part response formats", () => {
  assert.equal(readAssistantContent({ choices: [{ message: { content: [{ text: "หวัดดี" }] } }] }), "หวัดดี");
});
test("extracts standard_thai_translation from valid JSON", () => {
  const json = JSON.stringify({ detected_dialect: "Southern", standard_thai_translation: "จะทำอย่างไร" });
  assert.equal(extractTranslation(json, true), "จะทำอย่างไร");
});
test("extracts standard_thai_translation via regex if JSON is truncated", () => {
  const truncated = '{"detected_dialect":"Southern","standard_thai_translation":"จะทำอย่างไร","dialect_specific_terms":[{"term":"อิทำพรือ","meaning":"จะทำ';
  assert.equal(extractTranslation(truncated, true), "จะทำอย่างไร");
});
