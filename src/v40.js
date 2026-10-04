(() => {
  'use strict';
  // No labels on photos: the "4 options" chip of each collection card moves
  // into its glass caption. The cards are built by playlists-v31.js, which may
  // re-render them on language change, so this runs again on every change.
  function moveCounts() {
    document.querySelectorAll('.playlist-category').forEach(card => {
      const count = card.querySelector(':scope > .playlist-count');
      const copy = card.querySelector('.playlist-copy');
      if (count && copy) copy.append(count);
    });
  }
  moveCounts();
  const grid = document.querySelector('.playlist-categories');
  if (grid) new MutationObserver(moveCounts).observe(grid, {childList: true, subtree: true});
  document.addEventListener('tenerife:language', moveCounts);
})();
