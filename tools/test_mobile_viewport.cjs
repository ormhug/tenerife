/* Test the real scene layout function without a browser or dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/v3.js'),'utf8');
const start=source.indexOf('  function syncSceneLayout(){');
const end=source.indexOf('  function setScene(',start);
assert.ok(start>=0&&end>start);
const layoutFunction=source.slice(start,end);
assert.match(source,/height:100svh/, 'the phone measurement uses a stable small viewport');

function fixture({width=390,height=720,chromeHeight=844,native=true}={}){
  const writes=[],jumps=[];
  const element={style:{setProperty:(key,value)=>writes.push([key,value])},classList:{toggle(){}},
    clientWidth:width,getBoundingClientRect:()=>({top:72,bottom:720})};
  const context=vm.createContext({
    innerWidth:width,innerHeight:chromeHeight,scrollY:1200,motionOff:false,
    stableHeight:height,nativeMode:native,
    sceneViewportHeight:()=>native?context.stableHeight:context.innerHeight,
    nativeSceneScroll:()=>context.nativeMode,
    $:()=>({offsetHeight:72}),getComputedStyle:()=>({top:'72px'}),
    stage:element,sequence:element,chapters:[element,element,element,element],galleryLinks:[],
    document:{documentElement:{classList:{toggle(){}}}},
    sceneModel:{stops:[.14,2.85,4.2,5.55],geometry:()=>({narrow:true,gallery:[]})},
    sceneUnits:7.4,pinnedScenes:false,sceneLayoutKey:'',activeScene:0,sceneScrollUnits:2,
    sceneTop:0,sceneViewHeight:chromeHeight,geometryDirty:false,lastSceneUnits:null,scenePosition:2,sceneLayout:null,
    setScene(){},sceneGeometry:()=>({start:1000,distance:4000}),
    window:{TT_SCROLL:{to:(top,options)=>jumps.push({top,options})},scrollTo:options=>jumps.push(options)}
  });
  vm.runInContext(layoutFunction,context);
  return {context,writes,jumps};
}
{
  const {context,writes,jumps}=fixture();
  context.syncSceneLayout();
  assert.equal(context.pinnedScenes,true, 'tall phone retains the widget sequence');
  const key=context.sceneLayoutKey,firstWriteCount=writes.length;
  for(const chromeHeight of [780,690,820,720,844]){
    context.innerHeight=chromeHeight;
    context.syncSceneLayout();
    assert.equal(context.sceneLayoutKey,key, 'browser bars cannot rebuild the scene layout');
    assert.equal(context.pinnedScenes,true, 'browser bars cannot switch scene modes');
    assert.equal(context.sceneViewHeight,720, 'progress range uses stable phone height');
  }
  assert.equal(writes.length,firstWriteCount, 'browser chrome resizing makes no scene style writes');
  assert.equal(jumps.length,0, 'the page never scrolls itself during a phone swipe');
  context.innerWidth=844;context.stableHeight=390;
  context.syncSceneLayout();
  assert.equal(context.pinnedScenes,false, 'short landscape orientation keeps every chapter reachable');
  assert.equal(jumps.length,0, 'phone rotation preserves the native scroll position');
}
{
  const {context,jumps}=fixture({width:1280,height:720,chromeHeight:720,native:false});
  context.syncSceneLayout();
  context.innerHeight=820;context.syncSceneLayout();
  assert.equal(jumps.length,1, 'desktop window resizing still preserves scene progress');
  assert.equal(jumps[0].options.immediate,true);
}
{
  const start=source.indexOf('  function renderHeroLandscape(){');
  const end=source.indexOf('  function render(time)',start);
  assert.ok(start>=0&&end>start);
  const writes=[];
  const style={removeProperty:name=>writes.push(['remove',name])};
  Object.defineProperty(style,'transform',{set:value=>writes.push(['transform',value])});
  const context=vm.createContext({nativeMode:true,scrollY:0,motionOff:false,heroVisible:true,lastHeroDrift:'',
    nativeSceneScroll:()=>context.nativeMode,heroLandscape:{style}});
  vm.runInContext(source.slice(start,end),context);
  for(const scroll of [0,40,200,400]){context.scrollY=scroll;context.renderHeroLandscape();}
  assert.equal(writes.length,0, 'native phone swipes do not update landscape transforms');
  context.nativeMode=false;context.renderHeroLandscape();
  assert.equal(writes.length,1, 'desktop retains its landscape parallax');
  context.nativeMode=true;context.renderHeroLandscape();context.renderHeroLandscape();
  assert.equal(writes.length,2, 'switching to a phone resets once instead of writing every frame');
  assert.equal(writes[1][0],'remove');
}
console.log('Mobile viewport: browser bars, stable progress, rotation, native parallax and desktop preservation passed.');
