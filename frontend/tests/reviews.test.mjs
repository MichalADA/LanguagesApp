import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import Renderer, { act } from "react-test-renderer";
import ts from "typescript";
const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const { outputText } = ts.transpileModule(
    await readFile(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
    },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (id) => mocks[id] ?? require(id),
    exports,
  );
  return exports;
}
const validation = await compile("../src/sentences/validation.ts");
const tasks = await compile("../src/reviews/tasks.ts", {
  "@/sentences/validation": validation,
});
const ids = await compile("../src/utils/eventId.ts");
const { lookup, interpolate } = await compile("../src/i18n/types.ts");
const dictionaries = {
  pl: (await compile("../src/i18n/locales/pl.ts")).pl,
  en: (await compile("../src/i18n/locales/en.ts")).en,
};
const words = ["kuća", "pas", "mačka", "voda"].map((targetText, i) => ({
  id: `pl-hr:${i}`,
  targetText,
  sourceText: ["dom", "pies", "kot", "woda"][i],
  acceptedAnswers: [],
}));
const item = (itemId, itemType = "WORD") => ({
  id: itemId,
  itemId,
  itemType,
  due: "2020-01-01",
  course: { slug: "pl-hr" },
});
const verbs = [
  { id: "pl-hr:verb:1", infinitive: "biti", forms: { ja: "sam" } },
];
const sentences = [
  {
    id: "a1-01",
    polish: "Jestem w domu.",
    croatian: "Ja sam kod kuće.",
    acceptedAnswers: [],
    gapText: "Ja ___ kod kuće.",
    gapAnswer: "sam",
  },
];

test("mixed adapter reuses canonical material across directions and formats, with strict diacritics", () => {
  const queue = tasks.createReviewTasks(
    [
      ...words.map((w) => item(w.id)),
      item("pl-hr:sentence:a1-01", "SENTENCE"),
      item("pl-hr:verb:1:ja", "VERB"),
      item("missing"),
    ],
    words,
    verbs,
    sentences,
  );
  assert.equal(queue.length, 6);
  assert.equal(queue[1].direction, "TARGET_TO_SOURCE");
  assert.equal(queue[2].options.length, 4);
  assert.equal(queue[4].gameType, "review-gap");
  assert.equal(queue[5].expected[0], "sam");
  assert.equal(tasks.isReviewCorrect(queue[0], "  KUĆA. "), true);
  assert.equal(tasks.isReviewCorrect(queue[0], "kuca"), false);
  assert.equal(tasks.isReviewCorrect(queue[0], ""), false);
  const repeated = tasks.repeatAfterError(queue, 0);
  assert.equal(repeated[4], queue[0]);
  assert.equal(repeated.length, 7);
  assert.equal(tasks.repeatAfterError(queue, 4), queue);
});
test("event IDs work without secure-context randomUUID and remain unique", () => {
  const old = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    value: { getRandomValues: (array) => webcrypto.getRandomValues(array) },
    configurable: true,
  });
  try {
    const values = Array.from({ length: 1000 }, () => ids.createEventId());
    assert.equal(new Set(values).size, 1000);
    assert.match(
      values[0],
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      value: old,
      configurable: true,
    });
  }
});
test("progress fetch follows bounded pages without losing materials", async () => {
  const api = await compile("../src/reviews/api.ts");
  let calls = 0;
  const result = await api.fetchAllProgress(async (url) => {
    calls++;
    if (calls === 1) return { items: [{ wordRef: "a" }], cursor: "id+2" };
    assert.match(url, /cursor=id%2B2/);
    return { items: [{ wordRef: "b" }], cursor: null };
  }, "pl-hr");
  assert.equal(result.length, 2);
  assert.equal(calls, 2);
});
async function setup({
  locale = "pl",
  empty = false,
  failSave = false,
  failLoad = false,
} = {}) {
  const course = { id: "pl-hr", name: { pl: "Chorwacki", en: "Croatian" } };
  const submitted = [],
    finished = [];
  let loadCalls = 0,
    saveCalls = 0;
  const request = () => {};
  const t = (key, p) => {
    const value = lookup(dictionaries[locale], key);
    assert.ok(value, key);
    return interpolate(value, p);
  };
  const { ReviewSession } = await compile("../src/reviews/ReviewSession.tsx", {
    // These tests exercise clicks; keyboard listeners require a browser DOM.
    '@/hooks/useQuizKeyboard': { useQuizKeyboard: () => {} },
    "@/utils/eventId": { createEventId: () => `event-${submitted.length}` },
    "@/learning/learningApi": {
      startLearningSession: async () => ({ id: "session" }),
      finishLearningSession: async (_, id) => {
        finished.push(id);
      },
    },
    "react-router-dom": {
      Link: ({ to, children, ...props }) =>
        React.createElement("a", { href: to, ...props }, children),
    },
    "@/auth/useAuth": {
      useAuth: () => ({ apiRequest: request, status: "authenticated" }),
    },
    "@/courses/CourseProvider": { useCourse: () => ({ course }) },
    "@/vocabulary/VocabularyProvider": {
      useVocabulary: () => ({ entries: words, loading: false }),
    },
    "@/grammar/GrammarProvider": {
      useGrammar: () => ({ verbs, loading: false }),
    },
    "@/i18n": { useI18n: () => ({ locale, t }) },
    "@/sentences/loader": { loadSentences: async () => sentences },
    "./api": {
      fetchDue: async () => {
        if (failLoad && ++loadCalls === 1) throw Error("offline");
        return empty ? [] : words.map((w) => item(w.id));
      },
      submitReview: async (_, answer) => {
        submitted.push({ ...answer });
        if (failSave && ++saveCalls === 1) throw Error("response lost");
      },
    },
    "./tasks": tasks,
  });
  let view;
  await act(async () => {
    view = Renderer.create(React.createElement(ReviewSession));
  });
  return { view, submitted, finished, t };
}
const button = (view, text) =>
  view.root.findAllByType("button").find((n) => n.children.includes(text));
test("failed save retries the identical event; double clicks count once and session closes once", async () => {
  const { view, submitted, finished, t } = await setup({ failSave: true });
  act(() =>
    view.root.findByType("input").props.onChange({ target: { value: "kuća" } }),
  );
  await act(async () => {
    const submit = view.root.findByType("form").props.onSubmit;
    submit({ preventDefault() {} });
    submit({ preventDefault() {} });
  });
  assert.equal(submitted.length, 1);
  assert.ok(view.root.findByProps({ role: "alert" }));
  await act(async () => button(view, t("reviews.retry")).props.onClick());
  assert.deepEqual(submitted[0], submitted[1]);
  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      const input = view.root.findAllByType("input")[0];
      if (input) {
        act(() =>
          input.props.onChange({
            target: { value: i === 1 ? "pies" : "voda" },
          }),
        );
        await act(async () =>
          view.root.findByType("form").props.onSubmit({ preventDefault() {} }),
        );
      } else await act(async () => button(view, "mačka").props.onClick());
    }
    await act(async () => {
      const next = button(view, t("reviews.next")).props.onClick;
      next();
      next();
    });
  }
  assert.deepEqual(finished, ["session"]);
  assert.equal(submitted.length, 5);
  assert.ok(
    view.root
      .findAllByType("h2")
      .some((n) => n.children.includes(t("reviews.done"))),
  );
  act(() => view.unmount());
});
test("load error can recover to translated empty state without starting a session", async () => {
  const { view, finished, t } = await setup({
    locale: "en",
    empty: true,
    failLoad: true,
  });
  assert.ok(view.root.findByProps({ role: "alert" }));
  await act(async () => button(view, t("reviews.retry")).props.onClick());
  assert.ok(
    view.root
      .findAllByType("h2")
      .some((n) => n.children.includes(t("reviews.empty"))),
  );
  assert.deepEqual(finished, []);
  act(() => view.unmount());
});
