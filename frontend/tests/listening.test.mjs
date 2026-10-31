import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const manifests = [
  { level: "A1", minimum: 15, path: new URL("../public/data/listening/hr-a1-dialogues.json", import.meta.url) },
  { level: "A2", minimum: 10, path: new URL("../public/data/listening/hr-a2-dialogues.json", import.meta.url) },
  { level: "B1", minimum: 20, path: new URL("../public/data/listening/hr-b1-dialogues.json", import.meta.url) },
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

test("Croatian listening stories: narrated, several questions, every speaker voiced, every line recorded", async () => {
  const ids = new Set();
  for (const level of ["A1", "A2", "B1"]) {
    const lv = level.toLowerCase();
    const data = JSON.parse(await readFile(new URL(`../public/data/listening/hr-${lv}-stories.json`, import.meta.url), "utf8"));
    assert.equal(data.version, 1);
    assert.equal(data.language, "hr");
    assert.equal(data.generatedWith.provider, "elevenlabs");
    assert.ok(data.stories.length >= 4, `${level}: co najmniej 4 historie`);
    for (const story of data.stories) {
      assert.match(story.id, new RegExp(`^${lv}-[a-z0-9-]+$`));
      assert.equal(story.level, level);
      assert.ok(!ids.has(story.id));
      ids.add(story.id);
      assert.equal(story.reviewStatus, "needs-native-review");
      assert.ok(story.lines.length >= 8, `${story.id}: historia ma co najmniej 8 kwestii`);
      assert.ok(story.questions.length >= 3, `${story.id}: co najmniej 3 pytania`);
      for (const question of story.questions) {
        assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length);
        assert.ok(question.options.some(option => option.id === question.correctOptionId), `${story.id}: ${question.promptPl}`);
      }
      // Poprawna odpowiedź nie stoi zawsze na tym samym miejscu.
      assert.ok(new Set(story.questions.map(question => question.options.findIndex(option => option.id === question.correctOptionId))).size > 1 || story.questions.length < 2);
      story.lines.forEach((line, index) => {
        assert.ok(data.generatedWith.voices[line.speaker], `${story.id}: brak głosu dla ${line.speaker}`);
        assert.ok(data.speakers[line.speaker], `${story.id}: brak imienia dla ${line.speaker}`);
        assert.ok(line.textHr.trim() && line.textPl.trim());
        assert.equal(line.audioPath, `/audio/listening/hr-${lv}/stories/${story.id}/${String(index + 1).padStart(2, "0")}-${line.speaker}.mp3`);
      });
      if (story.glossary) {
        assert.ok(story.glossary.length >= 5, `${story.id}: słowniczek ma co najmniej 5 haseł`);
        assert.equal(new Set(story.glossary.map(entry => entry.hr)).size, story.glossary.length);
        for (const entry of story.glossary) assert.ok(entry.hr.trim() && entry.pl.trim());
      }
      for (const line of story.lines) await access(new URL(`../public${line.audioPath}`, import.meta.url));
    }
  }
});
