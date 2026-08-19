import assert from "node:assert/strict";
import test from "node:test";
import { readAssistantContent, stripReasoning } from "../src/translation-service.js";

test("strips complete reasoning tags from a model response", () => {
  assert.equal(stripReasoning("<think>internal reasoning</think>สวัสดีครับ"), "สวัสดีครับ");
});
test("drops unfinished reasoning blocks instead of exposing them", () => {
  assert.equal(stripReasoning("<think>internal reasoning"), "");
});
test("reads content-part response formats", () => {
  assert.equal(readAssistantContent({ choices: [{ message: { content: [{ text: "หวัดดี" }] } }] }), "หวัดดี");
});
