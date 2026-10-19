// Minecraft-theme presentation only. Navigation remains ordinary links and
// page content remains semantic; this script adds depth, reveal and HUD state.
(function () {
    'use strict';

    var root = document.documentElement;
    var world = document.querySelector('.voxel-world');
    var hotbar = Array.from(document.querySelectorAll('.voxel-hotbar a[data-voxel-target]'));
    var surfaceSelector = [
        '.profile-card',
        '#experience .card',
        '.news-card',
        '.my-0.bg-white',
        '.my-3.bg-white',
        '.voxel-page-intro'
    ].join(',');
    var surfaces = [];
    var surfaceObserver = null;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var pointerFrame = 0;
    var activeFrame = 0;

    function isVoxel() {
        return root.getAttribute('data-accent') === 'minecraft';
    }

    function collectSurfaces() {
        surfaces = Array.from(document.querySelectorAll(surfaceSelector));
        surfaces.forEach(function (surface, index) {
            surface.classList.add('voxel-surface');
            surface.style.setProperty('--voxel-build-delay', Math.min(index * 70, 280) + 'ms');
        });
    }

    function revealSurfaces() {
        if (surfaceObserver) surfaceObserver.disconnect();
        if (!('IntersectionObserver' in window) || motion.matches) {
            surfaces.forEach(function (surface) { surface.classList.add('voxel-surfaced'); });
            return;
        }
        surfaceObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('voxel-surfaced');
                surfaceObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.06,
            rootMargin: '0px 0px -4% 0px'
        });
        surfaces.forEach(function (surface) { surfaceObserver.observe(surface); });
    }

    function setActiveSlot(name) {
        if (!hotbar.length) return;
        hotbar.forEach(function (link) {
            var active = link.dataset.voxelTarget === name;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    function updateActiveSlot() {
        activeFrame = 0;
        if (!isVoxel()) return;
        if (/publications(?:\.html)?\/?$/.test(location.pathname)) {
            setActiveSlot('papers');
            return;
        }
        var current = 'top';
        var threshold = Math.min(window.innerHeight * 0.4, 360);
        ['experience', 'news'].forEach(function (name) {
            var section = document.querySelector('[data-voxel-target="' + name + '"]');
            if (!section) return;
            var selector = name === 'news' ? '#news' : '#experience';
            var target = document.querySelector(selector);
            if (!target) return;
            if (target.getBoundingClientRect().top <= threshold) current = name;
        });
        setActiveSlot(current);
    }

    function queueActiveSlot() {
        if (activeFrame) return;
        activeFrame = requestAnimationFrame(updateActiveSlot);
    }

    function activate() {
        document.body.classList.add('voxel-active');
        collectSurfaces();
        revealSurfaces();
        updateActiveSlot();
    }

    function deactivate() {
        document.body.classList.remove('voxel-active');
        if (surfaceObserver) surfaceObserver.disconnect();
        if (world) {
            world.style.removeProperty('--voxel-px');
            world.style.removeProperty('--voxel-py');
        }
    }

    function syncMode() {
        if (isVoxel()) activate();
        else deactivate();
    }

    if (world) {
        window.addEventListener('pointermove', function (event) {
            if (!isVoxel() || motion.matches || pointerFrame) return;
            pointerFrame = requestAnimationFrame(function () {
                var x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
                var y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
                world.style.setProperty('--voxel-px', x.toFixed(3));
                world.style.setProperty('--voxel-py', y.toFixed(3));
                pointerFrame = 0;
            });
        }, {passive: true});
    }

    window.addEventListener('scroll', queueActiveSlot, {passive: true});
    window.addEventListener('resize', queueActiveSlot, {passive: true});
    document.addEventListener('visibilitychange', function () {
        document.body.classList.toggle('voxel-paused', document.hidden);
    });
    if (motion.addEventListener) motion.addEventListener('change', syncMode);
    else if (motion.addListener) motion.addListener(syncMode);

    new MutationObserver(syncMode).observe(root, {
        attributes: true,
        attributeFilter: ['data-accent']
    });

    syncMode();
})();
