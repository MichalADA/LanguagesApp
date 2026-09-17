import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const manifests = [
  { level: "A1", minimum: 15, path: new URL("../public/data/listening/hr-a1-dialogues.json", import.meta.url) },
  { level: "A2", minimum: 10, path: new URL("../public/data/listening/hr-a2-dialogues.json", import.meta.url) },
];

test("Croatian listening levels have valid, unique and playable dialogue entries", async () => {
  const allIds = new Set();
  const allAudioPaths = new Set();
  for (const manifest of manifests) {
    const data = JSON.parse(await readFile(manifest.path, "utf8"));
    assert.equal(data.version, 1);
    assert.equal(data.language, "hr");
    assert.ok(data.dialogues.length >= manifest.minimum);
    assert.equal(new Set(data.dialogues.map(item => item.id)).size, data.dialogues.length);

    for (const dialogue of data.dialogues) {
      assert.match(dialogue.id, new RegExp(`^${manifest.level.toLowerCase()}-[a-z0-9-]+$`));
      assert.equal(dialogue.level, manifest.level);
      assert.ok(!allIds.has(dialogue.id));
      allIds.add(dialogue.id);
      assert.ok(dialogue.lines.length >= 4);
      assert.equal(dialogue.reviewStatus, "needs-native-review");
      assert.ok(dialogue.question.options.some(option => option.id === dialogue.question.correctOptionId));
      for (const line of dialogue.lines) {
        assert.ok(data.generatedWith.voices[line.speaker]);
        assert.ok(line.textHr.trim());
        assert.ok(line.textPl.trim());
        assert.match(line.audioPath, new RegExp(`^/audio/listening/hr-${manifest.level.toLowerCase()}/${dialogue.id}/\\d{2}-(ana|marko)\\.mp3$`));
        assert.ok(!allAudioPaths.has(line.audioPath));
        allAudioPaths.add(line.audioPath);
        await access(new URL(`../public${line.audioPath}`, import.meta.url));
      }
    }
  }
});
