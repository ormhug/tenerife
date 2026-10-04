/* Run with Node: node tools/test_scene_widgets.cjs (no browser or dependencies). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/scene-widget-model.js'), 'utf8'), context);
const model = context.window.TT_SCENE_WIDGET;

// Phone swipes must never resize/reposition a photo or reflow its text. Cover
// slow swipes, reversal, hash landings and gallery focus ownership.
for (const [width, height] of [[320, 578], [390, 648], [760, 900]]) {
  const layout = model.geometry(width, height);
  const first = model.sampleMobile(0, layout);
  const snapshots = [];
  for (let n = 0; n <= 740; n++) {
    const u = n / 100, state = model.sampleMobile(u, layout);
    snapshots.push(JSON.stringify(state));
    state.frames.forEach(frame => {
      assert.deepEqual(frame.box, first.frames[0].box, 'photo dimensions remain fixed');
      assert.deepEqual(frame.copy, first.frames[0].copy, 'copy never reflows during a swipe');
      assert.ok(frame.alpha >= 0 && frame.alpha <= 1);
      assert.ok(frame.copyAlpha >= 0 && frame.copyAlpha <= 1);
    });
    assert.ok(state.frames.filter(frame => frame.copyAlpha > 0).length <= 1, 'no overlapping labels');
    if (u < 5.85) assert.ok(state.frames.some(frame => frame.alpha === 1), 'no white flash through a dissolve');
    if (state.galleryActive) {
      assert.equal(state.galleryAlpha, 1, 'gallery links are readable before taking focus');
      assert.ok(state.frames.every(frame => frame.alpha === 0 && frame.copyAlpha === 0));
    }
  }
  for (let n = 740; n >= 0; n--) {
    assert.equal(JSON.stringify(model.sampleMobile(n / 100, layout)), snapshots[n], 'reverse phone swipe');
  }
  model.stops.forEach((stop, index) => {
    const state = model.sampleMobile(stop, layout);
    assert.equal(state.active, index);
    assert.equal(state.frames[index].alpha, 1);
    assert.equal(state.frames[index].copyAlpha, 1, 'phone hash target is readable');
  });
}
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, label, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);
};
const sameBox = (actual, expected, label) => {
  for (const key of Object.keys(expected)) close(actual[key], expected[key], `${label}.${key}`);
};
const opaqueOnly = (state, expected) => {
  state.frames.forEach((frame, i) => close(frame.alpha, i === expected ? 1 : 0, `photo ${i} alpha`));
  close(state.frames[expected].copyAlpha, 1, 'readable copy');
  assert.equal(state.active, expected);
  assert.equal(state.galleryActive, false);
};

let samples = 0;
const widths = [390, 800, 1280, 1480];
const heights = [592, 768, 900];
const boundaries = [.28, .7, .78, .84, 1.24, 1.25, 1.8, 2.6, 3.15, 3.95, 4.5, 5.3, 5.85, 6.02, 6.2, 6.3, 6.67, 6.8];

assert.equal(model.stops.length, 4);
assert.ok(model.stops.every((stop, i) => stop >= 0 && stop < model.total && (!i || stop > model.stops[i - 1])));

for (const width of widths) for (const height of heights) {
  const label = `${width}x${height}`;
  const layout = model.geometry(width, height);
  const savedLayout = plain(layout);
  const first = model.sample(0, layout);
  sameBox(first.frames[0].box, {x: 0, y: 0, w: width, h: height, r: 0}, `${label} first full photo`);
  sameBox(first.frames[0].copy, {x: 0, y: 0, w: width, h: height}, `${label} first full copy`);
  opaqueOnly(first, 0);
  assert.equal(first.frames[0].widget, false);

  // Halfway through the first morph the photo must genuinely shrink, not crossfade.
  const middle = model.sample(.765, layout).frames[0];
  close(middle.alpha, 1, `${label} shrink retains photo`);
  for (const key of ['x', 'y', 'w', 'h', 'r']) {
    close(middle.box[key], (layout.full[key] + layout.photos[0][key]) / 2, `${label} half shrink ${key}`);
  }
  const right = model.sample(1.5, layout);
  opaqueOnly(right, 0);
  assert.equal(right.frames[0].widget, true);
  sameBox(right.frames[0].box, layout.photos[0], `${label} first widget`);

  // Hash stops land on complete, readable scenes, including the full opening image.
  model.stops.forEach((stop, i) => {
    const state = model.sample(stop, layout);
    opaqueOnly(state, i);
    if (i) sameBox(state.frames[i].box, layout.photos[i], `${label} stop ${i}`);
  });
  // Each stop has a distinct shape; two successive left-side layouts avoid a
  // repetitive left/right swing while keeping readable copy clear of the image.
  assert.equal(new Set(layout.photos.map(photo => `${photo.w.toFixed(3)}/${photo.h.toFixed(3)}`)).size, 4,
    `${label} four distinct photo size profiles`);
  for (let i = 0; i < 4; i++) {
    const photo = layout.photos[i], copy = layout.copy[i];
    assert.ok(photo.x >= 0 && photo.y >= 0 && photo.x + photo.w <= width + 1e-6
      && photo.y + photo.h <= height + 1e-6, `${label} stable photo contained ${i}`);
    assert.ok(copy.x >= 0 && copy.x + copy.w <= width + 1e-6,
      `${label} stable copy horizontally contained ${i}`);
    if (layout.narrow) {
      close(photo.x + photo.w / 2, copy.x + copy.w / 2, `${label} stacked photo centered ${i}`);
      assert.ok(copy.y >= photo.y + photo.h, `${label} stacked copy clears photo ${i}`);
      assert.ok(copy.y + copy.h <= height, `${label} stacked copy contained ${i}`);
    } else if (i === 0 || i === 3) {
      assert.ok(copy.x + copy.w < photo.x, `${label} Teide/ocean photo right ${i}`);
    } else {
      assert.ok(photo.x + photo.w < copy.x, `${label} coast/Masca photo left ${i}`);
    }
  }
  if (!layout.narrow) {
    const coastRatio = layout.photos[1].w / layout.photos[1].h;
    const mascaRatio = layout.photos[2].w / layout.photos[2].h;
    assert.ok(coastRatio > mascaRatio, `${label} coast landscape changes to a taller Masca shape`);
    assert.ok(layout.copy[1].y !== layout.copy[3].y, `${label} text layout also varies vertically`);
  }

  // Dissolving photos must share one moving frame, including the compact arc,
  // rather than showing two semi-transparent cards on opposite sides.
  for (const start of [1.8, 3.15, 4.5]) {
    const transition = model.sample(start + .4, layout);
    const visible = transition.frames.filter(frame => frame.alpha > .01);
    assert.equal(visible.length, 2, `${label} dissolve pair at ${start}`);
    sameBox(visible[0].box, visible[1].box, `${label} shared transition frame at ${start}`);
    close(visible[0].alpha + visible[1].alpha, 1, `${label} complete image coverage at ${start}`);
    close(visible[0].copyAlpha + visible[1].copyAlpha, 0, `${label} copy changes without collision at ${start}`);
  }

  // New phases can reset invisible frames, but anything visible must stay continuous.
  for (const boundary of boundaries) {
    const before = model.sample(boundary - 1e-5, layout);
    const after = model.sample(boundary + 1e-5, layout);
    before.frames.forEach((frame, i) => {
      const next = after.frames[i];
      close(frame.alpha, next.alpha, `${label} alpha at ${boundary}/${i}`, .001);
      close(frame.copyAlpha, next.copyAlpha, `${label} copy alpha at ${boundary}/${i}`, .001);
      if (Math.max(frame.alpha, next.alpha) > .001) {
        for (const key of ['x', 'y', 'w', 'h', 'r']) {
          close(frame.box[key], next.box[key], `${label} visible photo at ${boundary}/${i}/${key}`, .1);
        }
      }
      if (Math.max(frame.copyAlpha, next.copyAlpha) > .001) {
        for (const key of ['x', 'y', 'w', 'h']) {
          close(frame.copy[key], next.copy[key], `${label} visible copy at ${boundary}/${i}/${key}`, .1);
        }
        close(frame.copyShift, next.copyShift, `${label} visible copy vertical motion at ${boundary}/${i}`, .1);
        close(frame.copyShiftX, next.copyShiftX, `${label} visible copy horizontal motion at ${boundary}/${i}`, .1);
      }
    });
  }

  const snapshots = [];
  for (let n = 0; n <= 740; n++) {
    const position = n / 100;
    const state = model.sample(position, layout);
    samples++;
    assert.ok(Number.isInteger(state.active) && state.active >= 0 && state.active < 4);
    for (const alpha of [state.galleryAlpha, ...state.frames.flatMap(frame => [frame.alpha, frame.copyAlpha, frame.shade])]) {
      assert.ok(Number.isFinite(alpha) && alpha >= 0 && alpha <= 1, `${label} opacity bounded at ${position}`);
    }
    state.frames.forEach((frame, i) => {
      for (const [key, value] of Object.entries(frame.box)) assert.ok(Number.isFinite(value), `${label} finite box ${i}/${key}`);
      for (const value of [...Object.values(frame.copy), frame.copyShift, frame.copyShiftX]) {
        assert.ok(Number.isFinite(value), `${label} finite copy geometry/motion at ${position}/${i}`);
      }
      assert.ok(frame.box.w > 0 && frame.box.h > 0 && frame.box.r >= 0, `${label} positive photo at ${position}`);
      assert.ok(frame.copy.w > 0 && frame.copy.h > 0, `${label} positive copy at ${position}`);
    });
    snapshots.push(plain(state));
  }
  // Sampling backwards must reproduce exact previous values: no time/state hysteresis.
  for (let n = 740; n >= 0; n--) assert.deepEqual(plain(model.sample(n / 100, layout)), snapshots[n], `${label} reverse ${n}`);
  assert.deepEqual(plain(layout), savedLayout, `${label} sampling does not mutate geometry`);
  assert.deepEqual(plain(model.sample(-1, layout)), plain(first), `${label} clamp before start`);
  const final = model.sample(model.total, layout);
  assert.deepEqual(plain(model.sample(model.total + 10, layout)), plain(final), `${label} clamp after end`);
  assert.equal(final.galleryActive, true);
  close(final.galleryAlpha, 1, `${label} gallery visible`);
  final.frames.forEach((frame, i) => {
    sameBox(frame.box, layout.gallery[i], `${label} final gallery ${i}`);
    close(frame.alpha, 1, `${label} gallery photo ${i}`);
    close(frame.copyAlpha, 0, `${label} gallery original copy hidden ${i}`);
    assert.ok(frame.box.x >= 0 && frame.box.y >= 0
      && frame.box.x + frame.box.w <= width && frame.box.y + frame.box.h <= height, `${label} gallery stays in viewport ${i}`);
  });
}

console.log(`PASS: ${widths.length * heights.length} layouts, ${samples} forward samples and matching reverse samples; distinct photo shapes, readable holds, shared transition paths, gallery, boundaries and hash stops.`);
