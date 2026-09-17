import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replaceAll('import.meta.env.BASE_URL', '"/"');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? require(id), exports);
  return exports;
}
const levels = await compile('../src/config/learningLevels.ts');
const types = await compile('../src/sentences/types.ts');
const helpers = await compile('../src/sentences/helpers.ts');
const validation = await compile('../src/sentences/validation.ts');
const adapter = await compile('../src/vocabulary/adapter.ts');
const loader = await compile('../src/sentences/loader.ts', {'@/vocabulary/adapter':adapter,'@/config/learningLevels':levels,'./types':types});
const queue = await compile('../src/sentences/queue.ts', {'./helpers':helpers});
const source = await readFile(new URL('../public/data/hr_sentences.csv',import.meta.url),'utf8');
const rows = loader.parseSentences(source);

test('one shared dataset supplies 20 records per level and every mode, with valid exercises and provenance', async () => {
  assert.ok(rows.length>=60);
  const {lookup}=await compile('../src/i18n/types.ts');
  const {pl}=await compile('../src/i18n/locales/pl.ts');
  const {en}=await compile('../src/i18n/locales/en.ts');
  for(const level of levels.LEARNING_LEVELS) for(const mode of types.SENTENCE_MODES) {
    const pool=queue.sentencePool(rows,level.id,mode);
    assert.ok(pool.length>=20,`${level.id} ${mode}`);
    const session=queue.createSentenceQueue(rows,level.id,mode);
    assert.equal(session.length,10);
    assert.equal(new Set(session.map(row=>row.id)).size,10);
    assert.ok(session.every(row=>row.level===level.id));
  }
  for(const row of rows) {
    assert.equal(row.sourceType,'own'); assert.equal(row.sourceName,'Lexodromia'); assert.ok(row.license);
    assert.equal(row.gapText.replace('___',row.gapAnswer),row.croatian);
    assert.ok(!validation.checkSentenceAnswer(row,'correction',row.incorrectSentence));
    assert.notEqual(validation.normalizeAnswer(row.croatian),validation.normalizeAnswer(row.transformAnswer));
    for(const dict of [pl,en]) for(const key of [row.correctionExplanation,row.transformInstruction]) assert.ok(lookup(dict,key),key);
    assert.equal(helpers.joinTokens(helpers.tokenize(row.croatian)),row.croatian);
  }
  assert.deepEqual(queue.createSentenceQueue(rows.slice(0,3),'A1','translation'),[]);
});
test('strict validation tolerates only case, whitespace, final period and explicit alternatives', () => {
  const row=rows[0];
  assert.ok(validation.checkSentenceAnswer(row,'translation','  ŽIVIM   U MALOM STANU  '));
  assert.ok(validation.checkSentenceAnswer(row,'translation','Ja živim u malom stanu.'));
  assert.ok(!validation.checkSentenceAnswer(row,'translation','Zivim u malom stanu.'));
  assert.ok(!validation.checkSentenceAnswer(row,'translation','Živim malom stanu.'));
  assert.ok(!validation.checkSentenceAnswer(row,'translation','Živim u malom stanu?'));
  assert.ok(!validation.checkSentenceAnswer(row,'gap',row.croatian));
  assert.ok(!validation.checkSentenceAnswer(row,'transform',row.croatian));
  assert.ok(validation.checkSentenceAnswer(row,'gap',row.gapAnswer));
  assert.ok(validation.checkSentenceAnswer(row,'transform',row.transformAnswer));
});
test('builder tokens retain repeated words and punctuation as separate identities', () => {
  const text='Ana i Ana jedu, a Luka čita.';
  const tokens=helpers.tokenize(text);
  assert.equal(new Set(tokens.map(token=>token.id)).size,tokens.length);
  assert.equal(tokens.filter(token=>token.text==='Ana').length,2);
  assert.equal(helpers.joinTokens(tokens),text);
  assert.deepEqual(helpers.shuffledTokens(text).map(token=>token.id).sort(),tokens.map(token=>token.id).sort());
});
test('loader rejects missing columns, duplicate IDs and incomplete game fields', () => {
  assert.throws(()=>loader.parseSentences('id;polish\na;hello'));
  const lines=source.trimEnd().split('\n');
  assert.throws(()=>loader.parseSentences([...lines,lines[1]].join('\n')));
  assert.throws(()=>loader.parseSentences(source.replace('___','missing-gap')));
});

async function mount(mode, selectedLevel, fetcher=async()=>rows) {
  const calls={start:0,record:[],finish:0};
  const {SentenceGameSession}=await compile('../src/sentences/SentenceGameSession.tsx',{
    // These tests exercise clicks; keyboard listeners require a browser DOM.
    '@/hooks/useQuizKeyboard': { useQuizKeyboard: () => {} },
    'react-router-dom':{Link:({to,children})=>React.createElement('a',{href:to},children)},
    '@/components/PoolPicker':{PoolPicker:({value,onChange,sentenceCounts})=>React.createElement('select',{'aria-label':'level',value:value.source.level,onChange:event=>onChange({...value,source:{kind:'level',level:event.target.value}})},Object.keys(sentenceCounts).map(level=>React.createElement('option',{key:level,value:level},level)))},
    '@/components/StatCard':{ProgressBar:({percent})=>React.createElement('progress',{value:percent,max:100})},
    '@/courses/CourseProvider':{useCourse:()=>({course:{id:'pl-hr'}})},
    '@/i18n':{useT:()=>key=>key},
    '@/learning/useLearningSession':{useLearningSession:options=>{assert.equal(options.trackVocabulary,false);return {start:()=>calls.start++,record:answer=>calls.record.push(answer),finish:async()=>{calls.finish++;}};}},
    '@/config/learningLevels':levels,'./loader':{loadSentences:fetcher},'./queue':queue,'./validation':validation,'./helpers':helpers,
  });
  let view;
  await act(async()=>{view=Renderer.create(React.createElement(SentenceGameSession,{mode}));});
  const button=name=>view.root.findAllByType('button').find(node=>node.children.includes(name));
  if(!button('sentences.retry')) act(()=>view.root.findByType('select').props.onChange({target:{value:selectedLevel}}));
  return {view,calls,button};
}

test('all five games finish exactly ten questions on each level; double clicks do not duplicate answers', async () => {
  for(const level of levels.LEARNING_LEVELS) for(const mode of types.SENTENCE_MODES) {
    const {view,calls,button}=await mount(mode,level.id);
    act(()=>button('sentences.start').props.onClick());
    const visited=[];
    for(let index=0;index<10;index++) {
      const prompt=view.root.findByType('h2').children.join('');
      const row=rows.find(row=>row.level===level.id && (mode==='gap'?row.gapText:mode==='correction'?row.incorrectSentence:mode==='transform'?row.croatian:row.polish)===prompt);
      assert.ok(row,`${mode} ${level.id}: ${prompt}`); visited.push(row.id);
      if(mode==='builder') {
        const desired=helpers.tokenize(row.croatian);
        if(index===1) desired.reverse();
        for(const token of desired) act(()=>view.root.findAllByType('button').find(node=>node.props.lang==='hr' && !node.props.disabled && node.children.join('')===token.text).props.onClick());
      } else act(()=>view.root.findByType('input').props.onChange({target:{value:index===1?'wrong':validation.expectedAnswers(row,mode)[0]}}));
      act(()=>{const submit=view.root.findByType('form').props.onSubmit;submit({preventDefault(){}});submit({preventDefault(){}});});
      assert.equal(calls.record.length,index+1);
      if(mode==='correction') assert.ok(view.root.findAllByType('p').some(node=>node.children.includes(row.correctionExplanation)));
      act(()=>{const next=button('sentences.next').props.onClick;next();next();});
    }
    assert.equal(new Set(visited).size,10);assert.equal(calls.start,1);assert.equal(calls.finish,1);
    assert.equal(calls.record.filter(answer=>answer.correct).length,9);
    assert.equal(view.root.findByType('h2').children[0],'sentences.result');
    assert.ok(view.root.findAllByType('p').some(node=>node.children.join('').includes('90%')));
    act(()=>button('sentences.again').props.onClick());assert.equal(calls.start,2);
    act(()=>view.unmount());
  }
});
test('load error has retry; too-small pools cannot start', async()=>{
  let attempts=0;
  const {view,button}=await mount('translation','A1',async()=>{if(++attempts===1) throw Error('offline');return rows.slice(0,2);});
  assert.ok(button('sentences.retry'));
  await act(async()=>button('sentences.retry').props.onClick());
  assert.equal(button('sentences.start').props.disabled,true);
  act(()=>view.unmount());
});
