(() => {
  'use strict';
  const action = document.querySelector('.hero-brief .brief-go');
  if (!action || !('IntersectionObserver' in window)) return;
  // Observe the action itself, so the one-time arrival happens when it can be
  // seen, independently of the parent brief's existing scroll-bound reveal.
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .75)) return;
    action.classList.add('brief-action-arrived');
    observer.disconnect();
  }, {threshold: .75, rootMargin: '0px 0px -12% 0px'});
  observer.observe(action);
})();
