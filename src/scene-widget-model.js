/* Geometry only: each frame is a reversible function of the scroll position. */
(() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => {const t = clamp(n); return t * t * (3 - 2 * t);};
  const mix = (a, b, t) => a + (b - a) * t;
  const interpolate = (a, b, t) => Object.fromEntries(Object.keys(a).map(k => [k, mix(a[k], b[k], t)]));
  const total = 7.4;
  const stops = [.14, 2.85, 4.2, 5.55];

  function geometry(width, height) {
    const narrow = width < 960;
    const margin = narrow ? 22 : Math.max(38, width * .045);
    const gap = narrow ? 14 : Math.max(30, width * .045);
    const available = width - margin * 2;
    const split = (available - gap) * .51;
    // A landscape, a compact coast, a portrait valley, then a low ocean view.
    // Coast and Masca stay on the same side, breaking the repeated left/right swing.
    const photos = narrow ? [
      {x: margin, y: 22, w: available, h: height * .43, r: 20},
      {x: margin + available * .05, y: 34, w: available * .9, h: height * .35, r: 20},
      {x: margin + available * .1, y: 20, w: available * .8, h: height * .44, r: 20},
      {x: margin, y: 44, w: available, h: height * .34, r: 20}
    ] : [
      {x: width - margin - split, y: height * .1, w: split, h: height * .8, r: 20},
      {x: margin, y: height * .23, w: available * .43, h: height * .6, r: 20},
      {x: margin + available * .065, y: height * .07, w: available * .32, h: height * .86, r: 20},
      {x: margin + available * .47, y: height * .28, w: available * .53, h: height * .6, r: 20}
    ];
    const copy = narrow ? photos.map(photo => ({x: margin, y: photo.y + photo.h + 16,
      w: available, h: height - photo.y - photo.h - 34})) : [
      {x: margin, y: 0, w: available - split - gap, h: height},
      {x: margin + available * .5, y: height * .08, w: available * .5, h: height * .84},
      {x: margin + available * .48, y: 0, w: available * .49, h: height},
      {x: margin, y: -height * .06, w: available * .41, h: height}
    ];
    const galleryGap = narrow ? 12 : 20;
    const galleryTop = narrow ? 84 : 86;
    const galleryWidth = (width - margin * 2 - galleryGap) / 2;
    const galleryHeight = (height - galleryTop - margin - galleryGap) / 2;
    const gallery = [];
    for (let i = 0; i < 4; i++) {
      gallery.push({x: margin + (i % 2) * (galleryWidth + galleryGap),
        y: galleryTop + Math.floor(i / 2) * (galleryHeight + galleryGap),
        w: galleryWidth, h: galleryHeight, r: 16});
    }
    return {width, height, narrow, photos, copy, gallery,
      full: {x: 0, y: 0, w: width, h: height, r: 0},
      fullCopy: {x: 0, y: 0, w: width, h: height}};
  }

  function sample(position, layout) {
    const u = Math.max(0, Math.min(total, position));
    const frames = layout.photos.map((box, i) => ({box: {...box}, alpha: 0, shade: 0,
      layer: i + 1, copy: layout.copy[i], copyAlpha: 0, copyShift: 0, copyShiftX: 0, widget: true}));
    let active = 0, galleryAlpha = 0, galleryActive = false;
    if (u < 1.8) {
      const shrink = ease((u - .28) / .97);
      const first = frames[0];
      first.box = interpolate(layout.full, layout.photos[0], shrink);
      first.alpha = 1;
      first.shade = 1 - shrink;
      first.widget = u >= .78;
      first.copy = first.widget ? layout.copy[0] : layout.fullCopy;
      first.copyAlpha = first.widget ? ease((u - .84) / .4) : 1 - ease((u - .3) / .4);
      first.copyShift = first.widget ? (1 - first.copyAlpha) * 18 : 0;
      first.copyShiftX = first.widget && !layout.narrow ? (1 - first.copyAlpha) * -28 : 0;
    } else if (u < 5.85) {
      const step = Math.min(2, Math.floor((u - 1.8) / 1.35));
      const progress = u - (1.8 + step * 1.35);
      const blend = ease(progress / .8);
      const outgoing = frames[step], incoming = frames[step + 1];
      const movingBox = interpolate(layout.photos[step], layout.photos[step + 1], blend);
      const arc = Math.sin(Math.PI * blend);
      // Shape and path vary together; both photos occupy the same frame during
      // the dissolve, so changing direction never flashes a second card.
      const contraction = 1 - arc * [ .09, .04, .07 ][step];
      const dw = movingBox.w * (1 - contraction), dh = movingBox.h * (1 - contraction);
      movingBox.x += dw / 2 + (layout.narrow ? 0 : [0, 24, -18][step] * arc);
      movingBox.y += dh / 2 + [ -24, 18, 36 ][step] * arc;
      movingBox.w -= dw;
      movingBox.h -= dh;
      outgoing.box = {...movingBox};
      incoming.box = {...movingBox};
      outgoing.alpha = 1 - blend;
      outgoing.copyAlpha = 1 - ease(progress / .34);
      outgoing.copyShift = [-18, -32, 14][step] * (1 - outgoing.copyAlpha);
      outgoing.copyShiftX = layout.narrow ? 0 : [-30, 0, 24][step] * (1 - outgoing.copyAlpha);
      incoming.alpha = blend;
      incoming.copyAlpha = ease((progress - .4) / .4);
      incoming.copyShift = (1 - incoming.copyAlpha) * [24, 36, -20][step];
      incoming.copyShiftX = layout.narrow ? 0 : (1 - incoming.copyAlpha) * [30, 0, -28][step];
      active = blend >= .5 ? step + 1 : step;
    } else {
      const gather = ease((u - 5.85) / .95);
      frames.forEach((frame, i) => {
        const target = layout.gallery[i];
        if (i === 3) {
          frame.box = interpolate(layout.photos[i], target, gather);
          frame.alpha = 1;
          frame.copyAlpha = 1 - ease((u - 5.85) / .35);
          frame.copyShift = -18 * (1 - frame.copyAlpha);
        } else {
          frame.box = {...target, y: target.y + (1 - gather) * 48};
          frame.alpha = ease((u - 6.02) / .65);
        }
      });
      active = 3;
      galleryAlpha = ease((u - 6.3) / .5);
      galleryActive = u >= 6.55;
    }
    return {frames, active, galleryAlpha, galleryActive};
  }
  // Phone scrolling runs independently of JS. Keep photo/text geometry fixed
  // throughout the sequence so missed scroll events cannot trigger a relayout
  // and rerasterisation of several photographs at once.
  function sampleMobile(position, layout) {
    const u = Math.max(0, Math.min(total, position));
    const frames = layout.photos.map((_, i) => ({box: layout.photos[0], alpha: 0, shade: 0,
      layer: i + 1, copy: layout.copy[0], copyAlpha: 0, copyShift: 0, copyShiftX: 0, widget: true}));
    let active = 0;
    if (u < 1.8) {
      frames[0].alpha = frames[0].copyAlpha = 1;
    } else if (u < 5.85) {
      const step = Math.min(2, Math.floor((u - 1.8) / 1.35));
      const progress = u - (1.8 + step * 1.35);
      const blend = ease(progress / .55);
      // Keep the outgoing image opaque beneath the incoming image: a normal
      // crossfade otherwise exposes the white background between photographs.
      frames[step].alpha = blend < 1 ? 1 : 0;
      frames[step + 1].alpha = blend;
      frames[step].copyAlpha = 1 - ease(progress / .22);
      frames[step + 1].copyAlpha = ease((progress - .24) / .26);
      active = progress >= .24 ? step + 1 : step;
    } else {
      active = 3;
      frames[3].alpha = frames[3].copyAlpha = 1 - ease((u - 5.85) / .3);
    }
    const galleryAlpha = ease((u - 6.15) / .4);
    return {frames, active, galleryAlpha, galleryActive: u >= 6.55};
  }
  window.TT_SCENE_WIDGET = {total, stops, geometry, sample, sampleMobile};
})();
