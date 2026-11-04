import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function compile(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? {}, exports);
  return exports;
}
const prompt = await compile('../src/assistant/prompt.ts');
const { SCENARIOS } = await compile('../src/assistant/scenarios.ts');
const ollama = await compile('../src/assistant/ollama.ts', { './prompt': prompt });

test('system prompt sets level, scenario and words, and forbids Serbian forms', () => {
  const text = prompt.systemPrompt({ level: 'A2', scenario: SCENARIOS[2], words: ['kava', 'račun'] });
  assert.match(text, /level A2/);
  assert.match(text, /café on the Riva/);
  assert.match(text, /kava, račun/);
  assert.match(text, /što \(not šta\)/);
  assert.match(text, /Do not explain the rule/);
});

test('every scenario has an opener in Croatian and Polish without Serbian forms', () => {
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.opener.hr && scenario.opener.pl, scenario.id);
    assert.doesNotMatch(scenario.opener.hr, /\bšta\b|\bko\b|sačekać/i, scenario.id);
  }
});

test('parseTurn reads the JSON reply and falls back to plain text', () => {
  const turn = prompt.parseTurn(JSON.stringify({ correction: 'Išao sam u kino s mojom prijateljicom.', topic: 'padezi', reply: 'Super! Što ste gledali?', translation: 'Super! Co oglądaliście?' }));
  assert.equal(turn.topic, 'padezi');
  assert.equal(turn.reply, 'Super! Što ste gledali?');
  assert.equal(prompt.parseTurn('Bok!').reply, 'Bok!');
  assert.equal(prompt.parseTurn(JSON.stringify({ correction: '', topic: 'whatever', reply: 'Da.', translation: 'Tak.' })).topic, 'none');
});

test('a correction that only changes punctuation or case is not shown', () => {
  assert.equal(prompt.isRealCorrection('ja sam dobro', 'Ja sam dobro.'), false);
  assert.equal(prompt.isRealCorrection('s moja prijateljica', 's mojom prijateljicom'), true);
  assert.equal(prompt.isRealCorrection('Bok', ''), false);
});

test('history sent to the model is the system prompt plus the latest messages', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: String(i) }));
  const messages = prompt.buildMessages('SYS', history);
  assert.equal(messages[0].content, 'SYS');
  assert.equal(messages.length, prompt.HISTORY_LIMIT + 1);
  assert.equal(messages.at(-1).content, '29');
});

test('chat() asks for a stream with the JSON schema (correction before reply, no translation) and keeps the model loaded', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ message: { content: '{"reply":"Bok"}' } }) };
  };
  const raw = await ollama.chat({ provider: 'ollama', baseUrl: 'http://localhost:11434/', model: 'gemma3:12b' }, [{ role: 'user', content: 'Bok' }]);
  assert.equal(raw, '{"reply":"Bok"}');
  assert.equal(calls[0].url, 'http://localhost:11434/api/chat');
  assert.equal(calls[0].body.stream, true);
  assert.equal(calls[0].body.model, 'gemma3:12b');
  assert.deepEqual(Object.keys(calls[0].body.format.properties), ['correction', 'topic', 'reply']);
  assert.equal(calls[0].body.keep_alive, '30m');
});

test('an unreachable Ollama is reported as OllamaUnavailableError', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => ollama.listModels({ provider: 'ollama', baseUrl: 'http://localhost:11434', model: 'x' }), ollama.OllamaUnavailableError);
});

test('partialField reads a string field from an unfinished JSON stream', () => {
  assert.equal(prompt.partialField('{"correction":"","topic":"none","rep', 'reply'), null);
  assert.equal(prompt.partialField('{"correction":"","topic":"none","reply":"Bok, ka', 'reply'), 'Bok, ka');
  assert.equal(prompt.partialField('{"reply":"Rekla je \\"da\\" i oti', 'reply'), 'Rekla je "da" i oti');
  assert.equal(prompt.partialField('{"reply":"\\u0161to"}', 'reply'), 'što');
  assert.equal(prompt.partialField('{"correction":"Išao sam.","topic":"padezi","reply":"', 'correction'), 'Išao sam.');
});

test('chat() streams NDJSON chunks and reports the text so far', async () => {
  const lines = ['{"message":{"content":"{\\"correction\\":\\"\\","}}', '{"message":{"content":"\\"topic\\":\\"none\\",\\"reply\\":\\"Bo"}}', '{"message":{"content":"k!\\"}"},"done":true}'];
  const encoder = new TextEncoder();
  globalThis.fetch = async () => ({
    ok: true,
    body: new ReadableStream({ start(c) { c.enqueue(encoder.encode(lines[0] + '\n' + lines[1].slice(0, 20))); c.enqueue(encoder.encode(lines[1].slice(20) + '\n' + lines[2] + '\n')); c.close(); } }),
  });
  const seen = [];
  const raw = await ollama.chat({ provider: 'ollama', baseUrl: 'http://localhost:11434', model: 'm' }, [], { onText: (t) => seen.push(prompt.partialField(t, 'reply')) });
  assert.equal(prompt.parseTurn(raw).reply, 'Bok!');
  assert.deepEqual(seen.filter(Boolean), ['Bo', 'Bok!']);
});

test('the translation is requested inside the same conversation (shared prefix)', () => {
  assert.match(prompt.TRANSLATE_REQUEST, /Polish/);
  assert.equal(prompt.parseTranslation('{"translation":" Cześć! "}'), 'Cześć!');
  assert.equal(prompt.parseTranslation('{"translation":"Cze'), 'Cze');
});
