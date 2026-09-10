import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const text = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? require(id), exports);
  return exports;
}
const helpers = await compile('../src/quick-games/helpers.ts');
const fixture = [['dom','kuća','home'], ['chleb','kruh','food'], ['mleko','mlijeko','food'], ['jabłko','jabuka','food']].map(([sourceText,targetText,topic], i) => ({ id: `pl-hr:${i+1}`, rank:i+1, sourceText, targetText, tags:[topic], block:'one', partOfSpeech:'noun' }));

async function harness(pool = fixture) {
  const calls = { rounds: [], answers: [], starts: 0, finishes: 0, flags: 0 };
  const { QuickGame } = await compile('../src/quick-games/QuickGame.tsx', {
    './helpers': helpers,
    'react-router-dom': { Link: ({children}) => React.createElement('a', null, children) },
    '@/components/PoolPicker': { PoolPicker: () => React.createElement('div', null, 'picker') },
    '@/components/StatCard': { ProgressBar: ({percent}) => React.createElement('progress', {value:percent,max:100}) },
    '@/hooks/useWordPool': { useWordPool: () => pool },
    '@/vocabulary/VocabularyProvider': { useVocabulary: () => ({ loading:false, error:null }) },
    '@/courses/CourseProvider': { useCourse: () => ({ course:{id:'pl-hr'} }) },
    '@/auth/useAuth': { useAuth: () => ({ status:'authenticated', apiRequest:() => {} }) },
    '@/progress/ProgressProvider': { useProgress: () => ({ ready:true, rememberActivity:() => {}, statOf:() => ({markedDifficult:false}), toggleFlag:() => {}, recordRound:(round) => calls.rounds.push(round) }) },
    '@/learning/useLearningSession': { useLearningSession: () => ({ start:() => calls.starts++, record:(answer) => calls.answers.push(answer), finish:async () => { calls.finishes++; } }) },
    '@/flashcards/flashcardsApi': { toggleDifficult:async () => { calls.flags++; } },
    '@/i18n': { useT: () => (key) => key },
  });
  return { QuickGame, calls };
}
function button(view, label) {
  return view.root.findAllByType('button').find(node => node.children.join('') === label && !node.props.disabled);
}
function click(node, twice = false) {
  assert.ok(node, 'expected an enabled control');
  act(() => { node.props.onClick(); if (twice) node.props.onClick(); });
}

test('all quick games complete exactly one session; duplicate clicks do not skip or score twice', async (context) => {
  context.mock.timers.enable({apis:['setTimeout']});
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout };
  try {
    for (const mode of helpers.QUICK_GAME_IDS) {
      const {QuickGame, calls} = await harness();
      let view;
      act(() => { view = Renderer.create(React.createElement(QuickGame,{mode})); });
      click(button(view,'common.start'));
      for (let step=0; step<100 && !calls.rounds.length; step++) {
        if (mode === 'pairs') {
          // Exercise mismatches and matches by trying all still-enabled pairs.
          const cards = view.root.findAllByType('button').filter(node => node.props.className?.includes('quick-tile') && !node.props.disabled);
          if (!cards.length) { act(() => context.mock.timers.tick(1100)); continue; }
          const pair = step % (cards.length - 1) + 1;
          click(cards[0]); click(cards[pair]);
          act(() => context.mock.timers.tick(1100));
        } else if (mode === 'match-columns') {
          const word = fixture.find(item => button(view,item.sourceText));
          click(button(view,word.sourceText)); click(button(view,word.targetText));
          act(() => context.mock.timers.tick(500));
        } else {
          if (mode === 'swipe') click(button(view,step === 0 ? 'quick.difficult' : 'quick.known'), true);
          else if (mode === 'true-false') click(button(view,'quick.yes'), true);
          else if (mode === 'scrambled-word') {
            const letters = view.root.findAllByType('button').filter(node => node.props.className === 'charbar-key');
            for (const letter of letters) click(letter);
            click(button(view,'quick.undo'));
            const remaining = view.root.findAllByType('button').find(node => node.props.className === 'charbar-key' && !node.props.disabled);
            click(remaining); click(button(view,'game.check'), true);
          } else click(view.root.findAllByType('button').find(node => node.props.className === 'tile'), true);
          click(button(view,'game.next'), true);
        }
      }
      assert.equal(calls.rounds.length, 1, `${mode}: exactly one saved round`);
      assert.ok(button(view,'game.again'), `${mode}: result has restart`);
      if (mode === 'swipe') {
        assert.equal(calls.answers.length,0);
        assert.equal(calls.flags,1);
        assert.equal(calls.starts,0);
      } else {
        assert.equal(calls.starts,1);
        assert.ok(calls.answers.length > 0);
        assert.equal(calls.answers.length, calls.rounds[0].answered.length);
      }
      act(() => view.unmount());
    }
  } finally { globalThis.window = previousWindow; }
});

test('small pools show a recoverable empty state rather than invalid gameplay', async () => {
  const {QuickGame,calls} = await harness(fixture.slice(0,1));
  let view;
  act(() => { view=Renderer.create(React.createElement(QuickGame,{mode:'multiple-choice'})); });
  click(button(view,'common.start'));
  assert.ok(JSON.stringify(view.toJSON()).includes('quick.empty'));
  assert.equal(calls.starts,0);
  act(() => view.unmount());
});
