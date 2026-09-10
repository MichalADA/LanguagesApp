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
const helpers = await compile('../src/radio/helpers.ts');
const api = await compile('../src/radio/api.ts', { './helpers': helpers });
const raw = (id, extra = {}) => ({ stationuuid:id, name:`Station ${id}`, countrycode:'HR', lastcheckok:1, url_resolved:`http://radio.example/${id}`, tags:'pop,music', ...extra });
const stations = helpers.normalizeStations([raw('a'), raw('b', {tags:'news,talk',favicon:'https://radio.example/b.png'})]);

test('only healthy Croatian stations with valid HTTP(S) streams survive; UUIDs are deduplicated', () => {
  assert.equal(helpers.normalizeStations([raw('a'),raw('a'),raw('b',{countrycode:'DE'}),raw('c',{lastcheckok:0}),raw('d',{url_resolved:'javascript:alert(1)'}),null]).length, 1);
  assert.equal(helpers.httpUrl('data:text/html,unsafe'), '');
  assert.throws(() => helpers.normalizeStations({ error:'invalid response' }));
});
test('name search and simple tag filters combine without a hardcoded station list', () => {
  assert.deepEqual(helpers.filterStations(stations,'STATION','music').map(s=>s.stationuuid), ['a']);
  assert.deepEqual(helpers.filterStations(stations,'b','talk').map(s=>s.stationuuid), ['b']);
  assert.equal(helpers.filterStations(stations,'missing','all').length, 0);
});
test('fetch uses the public search endpoint and app User-Agent and surfaces HTTP failures', async t => {
  t.mock.method(globalThis,'fetch',async (url,options) => {
    assert.equal(new URL(url).searchParams.get('countrycode'),'HR');
    assert.equal(options.headers['User-Agent'],'Lexodromia/0.1');
    assert.equal(options.credentials,'omit');
    return {ok:true,json:async()=>[raw('a')]};
  });
  assert.equal((await api.fetchCroatianStations()).length,1);
  globalThis.fetch = async () => ({ok:false,status:503});
  await assert.rejects(api.fetchCroatianStations(),/503/);
});

async function mount(fetcher = async () => stations) {
  const { RadioPage } = await compile('../src/radio/RadioPage.tsx', {
    './api': { fetchCroatianStations: fetcher }, './helpers':helpers,
    '@/i18n': { useT: () => (key, params) => params?.name ? `${key}:${params.name}` : key },
    'react-router-dom': { Link: ({children,to,...props})=>React.createElement('a',{...props,href:to},children) },
  });
  let rejectOld;
  const player = {src:'',paused:true,load(){},pause(){this.paused=true;},removeAttribute(){this.src='';},getAttribute(){return this.src;},
    play(){this.paused=false;return new Promise((resolve,reject)=>{rejectOld=reject;});}};
  let view;
  await act(async()=>{view=Renderer.create(React.createElement(RadioPage),{createNodeMock:element=>element.type==='audio'?player:null});});
  const button = key=>view.root.findAllByType('button').find(node=>node.props['aria-label']===key || node.children.includes(key));
  return {view,player,button,reject:()=>rejectOld};
}
test('one shared audio switches stations, ignores stale play failures, handles stream error, and releases on stop', async () => {
  const {view,player,button,reject}=await mount();
  assert.equal(view.root.findAllByType('audio').length,1);
  act(()=>button('radio.listenTo:Station a').props.onClick());
  const rejectA=reject();
  act(()=>button('radio.listenTo:Station b').props.onClick());
  assert.equal(player.src,stations[1].url_resolved);
  await act(async()=>rejectA(new Error('interrupted')));
  assert.equal(view.root.findAll(node=>node.props.role==='alert').length,0);
  act(()=>view.root.findByType('audio').props.onPlaying());
  act(()=>button('radio.pause').props.onClick());
  assert.equal(player.paused,true);
  act(()=>view.root.findByType('audio').props.onError());
  assert.equal(view.root.findAll(node=>node.props.role==='alert')[0].children[0],'radio.streamError');
  act(()=>button('radio.stop').props.onClick());
  assert.equal(player.src,'');
  act(()=>view.unmount());
});
test('logo failure renders a fallback and API failures offer retry', async () => {
  const {view}=await mount();
  act(()=>view.root.findByType('img').props.onError());
  assert.equal(view.root.findAllByType('img').length,0);
  act(()=>view.unmount());
  let attempts=0;
  const broken=await mount(async()=>{if (++attempts===1) throw Error('offline'); return stations;});
  assert.ok(broken.button('radio.retry'));
  await act(async()=>broken.button('radio.retry').props.onClick());
  assert.equal(broken.view.root.findAllByType('article').length,2);
  act(()=>broken.view.unmount());
});
