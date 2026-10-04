/* Run with Node: node tools/test_scroll_handoff.cjs (no browser or dependencies). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/smooth-scroll.js'), 'utf8');

function page({width=1280,coarse=false}={}) {
  const listeners = {}, classes = new Set();
  const nativeCalls=[];
  let scroller;
  class ScrollController {
    constructor(options) {
      this.options = options;
      this.actualScroll = this.animatedScroll = this.targetScroll = 1000;
      this.isStopped = false;
      this.running = false;
      this.stopCalls = 0;
      scroller = this;
    }
    queue(target) {this.animatedScroll = this.actualScroll; this.targetScroll = target; this.running = true;}
    reset() {this.running = false; this.animatedScroll = this.targetScroll = this.actualScroll;}
    stop() {this.stopCalls++; this.isStopped = true; this.reset();}
    start() {this.isStopped = false;}
    destroy() {this.running = false;}
    // Model a pending smooth frame writing its older position after a native wheel scroll.
    frame() {
      if (this.running) this.actualScroll = this.animatedScroll += (this.targetScroll - this.animatedScroll) * .1;
    }
  }
  const root = {classList:{contains:name => classes.has(name)}};
  const context = vm.createContext({
    window:{Lenis:ScrollController, addEventListener:(name, handler) => {listeners[name] = handler;},
      scrollTo:options=>nativeCalls.push(options)},
    document:{documentElement:root, hidden:false, addEventListener:(name, handler) => {listeners[name] = handler;}},
    matchMedia:query => ({matches:query === '(pointer: coarse)' && coarse, addEventListener(){}}),
    MutationObserver:class {observe(){}}, innerHeight:800, innerWidth:width, scrollY:1000
  });
  vm.runInContext(source, context);
  return {scroller, listeners, classes, context, nativeCalls};
}
function wheel(scroller, overrides = {}, rawDelta = 80) {
  const event = {
    type:'wheel', defaultPrevented:false, ctrlKey:false, metaKey:false, shiftKey:false,
    target:{closest:() => false}, preventDefault(){this.defaultPrevented = true;}, ...overrides
  };
  const input = {deltaX:0, deltaY:rawDelta * scroller.options.wheelMultiplier, event};
  return {result:scroller.options.virtualScroll(input), input};
}

// Modal content must own the next frame when a page gesture crosses into it.
for (const target of ['dialog', '[data-lenis-prevent]']) {
  const {scroller} = page();
  scroller.queue(1160);
  const {result} = wheel(scroller, {target:{closest:selector => selector.includes(target)}});
  assert.equal(result, false, `${target}: native handoff`);
  scroller.actualScroll += 80;
  scroller.frame();
  assert.equal(scroller.actualScroll, 1080, `${target}: old inertia cannot pull the page back`);
  assert.equal(scroller.stopCalls, 0, `${target}: no temporary scrollbar removal`);
}
function field(tagName, overrides = {}) {
  const control = {
    tagName, scrollHeight:100, clientHeight:100, scrollTop:0, multiple:false, size:1,
    matches:selector => selector.split(',').some(part => part.trim() === tagName.toLowerCase()),
    closest:selector => selector.split(',').some(part => part.trim() === tagName.toLowerCase()) ? control : null,
    ...overrides
  };
  return control;
}
const pageFields = [
  ['empty textarea', field('TEXTAREA')],
  ['collapsed select', field('SELECT')],
  ['textarea top', field('TEXTAREA', {scrollHeight:500,scrollTop:0})],
  ['textarea bottom', field('TEXTAREA', {scrollHeight:500,scrollTop:400})],
  ['listbox top', field('SELECT', {size:5,scrollHeight:500,scrollTop:0})],
  ['listbox bottom', field('SELECT', {size:5,scrollHeight:500,scrollTop:400})]
];
for (const [label, control] of pageFields) {
  const {scroller} = page();
  const direction = label.endsWith('top') ? -1 : 1;
  const baseline = wheel(scroller, {}, direction * 1200).input.deltaY;
  const {result, input} = wheel(scroller, {target:control}, direction * 1200);
  assert.notEqual(result, false, `${label}: page scrolling stays smooth`);
  assert.equal(scroller.options.prevent(control), false, `${label}: no later native bypass`);
  assert.equal(input.deltaY, baseline, `${label}: same wheel speed as the page`);
  assert.equal(Math.abs(input.deltaY), 480, `${label}: extreme bursts are capped without slowing ordinary input`);
}
for (const tagName of ['TEXTAREA', 'SELECT']) for (const direction of [-1, 1]) {
  const {scroller} = page();
  scroller.queue(1160);
  const control = field(tagName, {size:5,scrollHeight:500,scrollTop:200});
  assert.equal(wheel(scroller, {target:control}, direction * 400).result, false, `${tagName}: internal scrolling stays native`);
  scroller.actualScroll += 80;
  scroller.frame();
  assert.equal(scroller.actualScroll, 1080, `${tagName}: old page inertia is cancelled`);
}
// Repeated page reversals from the bottom over a blank textarea retain the same cap.
{
  const {scroller} = page();
  const control = field('TEXTAREA');
  scroller.actualScroll = scroller.animatedScroll = scroller.targetScroll = 9000;
  for (const direction of [-1, 1, -1, 1]) {
    const {result, input} = wheel(scroller, {target:control}, direction * 400);
    assert.notEqual(result, false, 'bottom reversal cannot switch to raw wheel input');
    assert.equal(input.deltaY, direction * 400, 'both directions preserve ordinary wheel distance');
    scroller.actualScroll = scroller.animatedScroll = scroller.targetScroll += input.deltaY;
  }
}
for (const override of [{defaultPrevented:true}, {ctrlKey:true}, {metaKey:true}, {shiftKey:true}]) {
  const {scroller} = page();
  scroller.queue(1160);
  assert.equal(wheel(scroller, override).result, false);
  assert.equal(scroller.running, false, 'native gesture releases queued travel');
}
{
  const {scroller} = page();
  scroller.queue(1160);
  const event = {type:'wheel',target:{closest:() => false},preventDefault(){}};
  const input = {deltaX:0,deltaY:-80,event};
  scroller.options.virtualScroll(input);
  assert.equal(scroller.targetScroll, 1000, 'reversal starts from the actual position');
  assert.equal(input.deltaY, -80, 'reversal still accepts the new direction');
}
for (const action of ['pointerdown', 'keydown']) {
  const {scroller, listeners} = page();
  scroller.queue(1160);
  listeners[action]({key:'End', target:{closest:() => false}});
  assert.equal(scroller.running, false, `${action}: queued travel is interrupted`);
  assert.equal(scroller.stopCalls, 0, `${action}: scrollbar remains stable`);
}
{
  const {scroller} = page();
  scroller.stop();
  wheel(scroller, {target:{closest:() => true}});
  assert.equal(scroller.isStopped, true, 'native handoff cannot resume a modal-paused page');
}
for (const options of [{width:390},{coarse:true}]) {
  const {scroller,context}=page(options);
  assert.equal(scroller, undefined, 'phone scrolling has no wheel controller or competing RAF');
  assert.equal(context.window.TT_SCROLL.state.enabled, false, 'touch momentum stays native');
}
{
  const {scroller,listeners,context}=page();
  scroller.queue(1160);
  context.innerWidth=390;
  listeners.resize();
  assert.equal(scroller.running, false, 'switching to the phone layout releases wheel momentum');
  assert.equal(context.window.TT_SCROLL.state.enabled, false, 'narrow resize returns to native scrolling');
}
{
  const {context,nativeCalls,classes}=page({width:390});
  let restored=false;
  context.window.TT_SCROLL.to(2800,{immediate:true,onComplete:()=>{restored=true;}});
  assert.equal(nativeCalls[0].top,2800, 'native hash restoration reaches the requested scene');
  assert.equal(nativeCalls[0].behavior,'instant', 'native hash restoration cannot start a competing smooth glide');
  assert.equal(restored,true, 'immediate restoration completes immediately');
  context.window.TT_SCROLL.to(3600,{offset:-72});
  assert.equal(nativeCalls[1].top,3528, 'phone navigation keeps the header offset');
  assert.equal(nativeCalls[1].behavior,'smooth', 'user-triggered phone navigation still animates natively');
  classes.add('motion-off');
  context.window.TT_SCROLL.to(1000);
  assert.equal(nativeCalls[2].behavior,'instant', 'native navigation respects reduced motion');
}
// Normal wheel and trackpad gestures retain their distance; only excessive
// queued travel is limited, and reversing always starts moving immediately.
{
  const {scroller} = page();
  for (const delta of [2, 24, 120, 300, -2, -24, -120, -300]) {
    assert.equal(wheel(scroller, {}, delta).input.deltaY, delta, 'ordinary input is not slowed or amplified');
  }
  scroller.queue(2180);
  assert.equal(wheel(scroller, {}, 120).input.deltaY, 20, 'queue only accepts the remaining travel budget');
  scroller.queue(2200);
  assert.equal(wheel(scroller, {}, 120).result, false, 'a full queue cannot accumulate a long delayed fling');
  const reverse = wheel(scroller, {}, -120);
  assert.notEqual(reverse.result, false, 'reversal is accepted even when the old queue is full');
  assert.equal(scroller.targetScroll, scroller.actualScroll, 'reversal clears the old direction');
  assert.equal(reverse.input.deltaY, -120, 'reversal preserves the new wheel distance');
}
console.log('Scroll handoff: native, mobile, hash restoration, field edges, reversals, keyboard, pause and responsive wheel scenarios passed.');
