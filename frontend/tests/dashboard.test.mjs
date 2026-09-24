import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? require(id), exports);
  return exports;
}
const levels = await compile('../src/config/learningLevels.ts');
const { lookup, interpolate } = await compile('../src/i18n/types.ts');
const dictionaries = { pl: (await compile('../src/i18n/locales/pl.ts')).pl, en: (await compile('../src/i18n/locales/en.ts')).en };
async function setup(fetcher, status = 'authenticated', locale = 'pl', reviewStats = async () => ({due:3})) {
  const course = { id: 'pl-hr', name: {pl:'Chorwacki',en:'Croatian'}, blocks: [{id:'one'},{id:'two'}] };
  const entries = [{id:'a',block:'one'}, {id:'b',block:'two'}];
  const writes = [];
  const request = () => {};
  const { Dashboard } = await compile('../src/pages/Dashboard.tsx', {
    'react-router-dom': { Link: ({to,children,...props}) => React.createElement('a',{href:to,...props},children) },
    '@/vocabulary/VocabularyProvider': {useVocabulary: () => ({entries,loading:false,error:null})},
    '@/progress/ProgressProvider': {useProgress: () => ({state:{},current:{activeDays:[],lastActivity:null},courseId:course.id,ready:true})},
    '@/courses/CourseProvider': {useCourse: () => ({course})},
    '@/auth/useAuth': {useAuth: () => ({status,apiRequest:request,user:{id:'u'}})},
    '@/progress/service': {statFor: () => ({attempts:99}),isLearned: () => true,needsReview: () => true},
    '@/games/registry': {findGame: () => undefined},
    '@/i18n': {useI18n: () => ({locale,t: (key,params) => { const value=lookup(dictionaries[locale],key); assert.ok(value,key);return interpolate(value,params); }})},
    '@/flashcards/flashcardsApi': {fetchProgress:fetcher},
    '@/flashcards/preferences': {readPreferences: () => ({direction:'MIXED',strictDiacritics:true}),writePreferences: p => writes.push(p)},
    '@/config/learningLevels': levels,
    '@/reviews/api': {fetchReviewStats: reviewStats},
    '@/utils/date': {currentStreak: () => 0, todayKey: d => d.toISOString().slice(0,10)},
    '@/components/Icon': {Icon: () => null},
    '@/components/StatCard': {ProgressRing: ({label,children}) => React.createElement('div',{role:'img','aria-label':label},children)},
  });
  let view;
  await act(async () => {view=Renderer.create(React.createElement(Dashboard));});
  return {view,course,writes,refresh:async () => act(async () => view.update(React.createElement(Dashboard)))};
}
const cards = [{wordRef:'a',status:'NEW',isDue:false},{wordRef:'b',status:'MASTERED',isDue:true},{wordRef:'sentence:builder:1',status:'MASTERED',isDue:true}];
const ring = view => view.root.findAll(n => n.props.role === 'img' && /Opanowane|Mastered/.test(n.props['aria-label'] ?? ''))[0].props['aria-label'];
const link = (view, href) => view.root.findAllByType('a').find(n => n.props.href === href);
const cta = view => view.root.findAllByType('a').find(n => n.props.className === 'btn btn-lg');
const totals = view => view.root.findAllByType('dd').map(node => node.children.join(''));
test('account dashboard ignores local mastery and non-vocabulary references; level totals are cumulative', async () => {
  const {view,writes}=await setup(async()=>cards);
  assert.deepEqual(totals(view),['2','1','1']);
  assert.match(ring(view),/Opanowane: 0, w nauce: 1, jeszcze niepoznane: 0/);
  await act(async()=>view.root.findAllByType('button').find(n=>n.children.includes('A2')).props.onClick());
  assert.match(ring(view),/Opanowane: 1, w nauce: 1/);
  const start=link(view,'/fiszki/sesja');
  assert.ok(start);
  act(()=>start.props.onClick());
  assert.deepEqual(writes,[{direction:'MIXED',strictDiacritics:true,mode:'NEW',sessionSize:10}]);
  act(()=>view.unmount());
});
test('API failure does not fall back to local account numbers and retry recovers',async()=>{
  let calls=0;
  const {view}=await setup(async()=>{if(++calls===1)throw Error('offline');return cards;});
  assert.equal(totals(view).length,0);
  assert.ok(view.root.findByProps({role:'alert'}));
  await act(async()=>view.root.findAllByType('button').find(n=>n.children.includes('Spróbuj ponownie')).props.onClick());
  assert.equal(calls,2);
  assert.deepEqual(totals(view),['2','1','1']);
  act(()=>view.unmount());
});
test('guest dashboard uses local progress, translates English and links to available guest games',async()=>{
  const {view}=await setup(async()=>{throw Error('guest must not fetch');},'guest','en');
  assert.deepEqual(totals(view),['2','2','2']);
  assert.ok(link(view,'/gry/bura'));
  // Gość ma 2 słowa do poprawienia, więc główne CTA prowadzi najpierw do powtórek.
  assert.equal(cta(view).props.href,'/powtorki');
  act(()=>view.unmount());
});
test('switching courses hides old account counts immediately',async()=>{
  const {view,course,refresh}=await setup(async(_,id)=>id==='pl-hr'?cards:new Promise(()=>{}));
  assert.deepEqual(totals(view),['2','1','1']);
  course.id='pl-other';
  await refresh();
  assert.equal(totals(view).length,0);
  assert.ok(view.root.findByProps({role:'status'}));
  act(()=>view.unmount());
});
test('daily plan uses the FSRS review queue and the main CTA starts the first step with work',async()=>{
  const {view,writes}=await setup(async()=>cards);
  assert.equal(cta(view).props.href,'/powtorki');
  act(()=>cta(view).props.onClick());
  assert.equal(writes.at(-1).mode,'REVIEW');
  act(()=>view.unmount());
  const empty=await setup(async()=>cards,'authenticated','pl',async()=>({due:0}));
  assert.equal(cta(empty.view).props.href,'/fiszki/sesja');
  assert.ok(link(empty.view,'/fiszki'), 'nothing due keeps the link to the review list');
  act(()=>empty.view.unmount());
});
test('review stats failure is reported with a retry instead of a fake count',async()=>{
  let calls=0;
  const {view}=await setup(async()=>cards,'authenticated','pl',async()=>{if(++calls===1)throw Error('offline');return {due:4};});
  assert.ok(view.root.findByProps({role:'alert'}));
  await act(async()=>view.root.findAllByType('button').find(n=>n.children.includes('Spróbuj ponownie')).props.onClick());
  assert.equal(calls,2);
  assert.equal(view.root.findAllByProps({role:'alert'}).length,0);
  act(()=>view.unmount());
});
