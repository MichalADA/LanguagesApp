import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const path = new URL("../public/data/listening/hr-a1-dialogues.json", import.meta.url);

test("Croatian listening pilot has valid and unique dialogue entries", async () => {
  const data = JSON.parse(await readFile(path, "utf8"));
  assert.equal(data.version, 1);
  assert.equal(data.language, "hr");
  assert.ok(data.dialogues.length >= 5);
  assert.equal(new Set(data.dialogues.map(item => item.id)).size, data.dialogues.length);

  for (const dialogue of data.dialogues) {
    assert.match(dialogue.id, /^a1-[a-z0-9-]+$/);
    assert.equal(dialogue.level, "A1");
    assert.ok(dialogue.lines.length >= 4);
    assert.equal(dialogue.reviewStatus, "needs-native-review");
    assert.ok(dialogue.question.options.some(option => option.id === dialogue.question.correctOptionId));
    for (const line of dialogue.lines) {
      assert.ok(data.generatedWith.voices[line.speaker]);
      assert.ok(line.textHr.trim());
      assert.ok(line.textPl.trim());
      assert.match(line.audioPath, new RegExp(`^/audio/listening/hr-a1/${dialogue.id}/\\d{2}-(ana|marko)\\.mp3$`));
      await access(new URL(`../public${line.audioPath}`, import.meta.url));
    }
  }
});
