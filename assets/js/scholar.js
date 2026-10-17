// A small ink wash follows the pointer on the red homepage. CSS handles the
// landscape; this script stops it offscreen and when the tab is hidden.
(function () {
    'use strict';
    var root = document.documentElement;
    var card = document.querySelector('.profile-card');
    if (!card) return;
    var scene = card.querySelector('.scholar-scene');
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var frame = 0;
    var visible = true;
    var enabled = false;
    var x = 70;
    var y = 30;

    function clearInk() {
        cancelAnimationFrame(frame);
        frame = 0;
        card.classList.remove('ink-active');
        card.style.removeProperty('--ink-x');
        card.style.removeProperty('--ink-y');
        card.style.removeProperty('--ink-offset-x');
        card.style.removeProperty('--ink-offset-y');
    }
    function refresh() {
        var active = root.getAttribute('data-accent') === 'red' && !motion.matches && !document.hidden && visible;
        enabled = active && pointer.matches;
        scene.classList.toggle('is-resting', !active);
        if (!enabled) clearInk();
    }
    card.addEventListener('pointermove', function (event) {
        if (!enabled) return;
        var rect = card.getBoundingClientRect();
        x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
        y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
        if (frame) return;
        frame = requestAnimationFrame(function () {
            card.style.setProperty('--ink-x', x.toFixed(2) + '%');
            card.style.setProperty('--ink-y', y.toFixed(2) + '%');
            card.style.setProperty('--ink-offset-x', ((x - 50) * .1).toFixed(2) + 'px');
            card.style.setProperty('--ink-offset-y', ((y - 50) * .07).toFixed(2) + 'px');
            card.classList.add('ink-active');
            frame = 0;
        });
    }, { passive: true });
    card.addEventListener('pointerleave', clearInk);
    document.addEventListener('visibilitychange', refresh);
    [motion, pointer].forEach(function (query) {
        if (query.addEventListener) query.addEventListener('change', refresh);
        else if (query.addListener) query.addListener(refresh);
    });
    new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ['data-accent'] });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            refresh();
        }).observe(card);
    }
    refresh();
})();

// The reading line also works on publications and showcase pages, which have
// no profile scene. Content resizing (including expanded news) updates its range.
(function () {
    'use strict';
    var root = document.documentElement;
    var line = document.querySelector('.scholar-reading-progress span');
    var backdrop = document.querySelector('.scholar-backdrop');
    if (!line) return;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var frame = 0;
    var active = false;

    function update() {
        frame = 0;
        if (!active) return;
        var scroller = document.scrollingElement || root;
        var range = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        var progress = range ? Math.max(0, Math.min(1, scroller.scrollTop / range)) : 0;
        line.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
    }
    function schedule() {
        if (active && !frame) frame = requestAnimationFrame(update);
    }
    function refresh() {
        active = root.getAttribute('data-accent') === 'red' && !document.hidden;
        if (backdrop) backdrop.classList.toggle('is-resting', !active || motion.matches);
        cancelAnimationFrame(frame);
        frame = 0;
        if (active) schedule();
        else line.style.removeProperty('transform');
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('load', schedule, { once: true });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('pagehide', function () {
        active = false;
        cancelAnimationFrame(frame);
        frame = 0;
        if (backdrop) backdrop.classList.add('is-resting');
    });
    document.addEventListener('visibilitychange', refresh);
    if (motion.addEventListener) motion.addEventListener('change', refresh);
    else if (motion.addListener) motion.addListener(refresh);
    new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ['data-accent'] });
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    refresh();
})();
