/**
 * Quick smoke test for phrase matcher (run: node apps/web/src/lib/matcher.test.mjs)
 * Note: matcher is TS; this duplicates core logic for standalone verification.
 */

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const phrase = "may the force be with you";
const transcript = "Luke said may the force be with you before leaving";
const hit = normalize(transcript).includes(normalize(phrase));

console.log(hit ? "PASS: substring match" : "FAIL: substring match");
process.exit(hit ? 0 : 1);
