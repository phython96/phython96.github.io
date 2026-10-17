// Conceptual code-agent animation. It never calls a model or executes the code.
(function () {
    'use strict';
    var root = document.documentElement;
    var card = document.querySelector('.profile-card');
    var bench = document.querySelector('.agent-workbench');
    if (!card || !bench) return;

    var scene = card.querySelector('.agent-scene');
    var terminal = bench.querySelector('.agent-terminal-command');
    var caption = bench.querySelector('.agent-stage-caption');
    var toggle = bench.querySelector('.agent-motion-toggle');
    var steps = Array.from(bench.querySelectorAll('[data-agent-phase]'));
    var tabs = Array.from(bench.querySelectorAll('[role="tab"]'));
    var phases = ['read', 'plan', 'edit', 'verify', 'iterate'];
    var commands = [
        'repo.inspect()',
        'agent.plan(task, context)',
        'agent.edit(plan)',
        'repo.verify(patch)',
        'agent.revise(patch, feedback)'
    ];
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var phaseDuration = 2800;
    var elapsed = 0;
    var previousTime = 0;
    var lastPaint = 0;
    var frame = 0;
    var pointerFrame = 0;
    var active = false;
    var cardVisible = !('IntersectionObserver' in window);
    var benchVisible = cardVisible;
    var currentPhase = -1;
    var userPaused = false;
    try { userPaused = localStorage.getItem('agent-demo-paused') === 'true'; } catch (e) {}

    function render(complete) {
        var index = Math.floor(elapsed / phaseDuration) % phases.length;
        if (index !== currentPhase) {
            currentPhase = index;
            bench.dataset.phase = phases[index];
            steps.forEach(function (step, i) {
                step.setAttribute('aria-pressed', i === index ? 'true' : 'false');
            });
            caption.textContent = caption.dataset[phases[index]];
        }
        var length = complete ? commands[index].length : Math.floor((elapsed % phaseDuration) / 35);
        var text = commands[index].slice(0, length);
        if (terminal.textContent !== text) terminal.textContent = text;
        bench.style.setProperty('--agent-progress', ((elapsed % (phaseDuration * phases.length)) / (phaseDuration * phases.length)).toFixed(4));
    }

    function tick(time) {
        if (!active) return;
        if (previousTime) elapsed += Math.min(time - previousTime, 120);
        previousTime = time;
        // The UI only needs 25 fps; there is no work between frames when paused.
        if (time - lastPaint >= 40) {
            render(false);
            lastPaint = time;
        }
        frame = requestAnimationFrame(tick);
    }

    function clearPointer() {
        cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
        bench.classList.remove('is-hover');
        bench.style.removeProperty('--code-light-x');
        bench.style.removeProperty('--code-light-y');
    }

    function refresh() {
        var isBlue = root.dataset.accent === 'blue';
        var canAnimate = isBlue && !motion.matches && !document.hidden && !userPaused;
        scene.classList.toggle('is-resting', !canAnimate || !cardVisible);
        card.classList.toggle('agent-resting', !canAnimate || !cardVisible);
        bench.classList.toggle('is-resting', !canAnimate || !benchVisible);
        bench.dataset.userPaused = String(userPaused);
        toggle.setAttribute('aria-label', userPaused ? toggle.dataset.playLabel : toggle.dataset.pauseLabel);
        toggle.title = toggle.getAttribute('aria-label');
        var next = canAnimate && benchVisible;
        if (next && !active) {
            active = true;
            previousTime = 0;
            lastPaint = 0;
            frame = requestAnimationFrame(tick);
        } else if (!next) {
            active = false;
            cancelAnimationFrame(frame);
            frame = 0;
            previousTime = 0;
            render(true);
        }
        if (!isBlue || motion.matches || document.hidden || !benchVisible || !pointer.matches) clearPointer();
    }

    function setPaused(value) {
        userPaused = value;
        try { localStorage.setItem('agent-demo-paused', String(value)); } catch (e) {}
        refresh();
    }

    toggle.addEventListener('click', function () { setPaused(!userPaused); });
    steps.forEach(function (step, index) {
        step.addEventListener('click', function () {
            elapsed = index * phaseDuration + 1400;
            setPaused(true);
            render(true);
        });
    });

    function selectTab(index) {
        tabs.forEach(function (tab, i) {
            var selected = i === index;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
        });
    }
    tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () { selectTab(index); });
        tab.addEventListener('keydown', function (event) {
            var target;
            if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
            else if (event.key === 'Home') target = 0;
            else if (event.key === 'End') target = tabs.length - 1;
            else return;
            event.preventDefault();
            selectTab(target);
            tabs[target].focus();
        });
    });

    bench.addEventListener('pointermove', function (event) {
        if (root.dataset.accent !== 'blue' || motion.matches || !pointer.matches) return;
        if (pointerFrame) return;
        pointerFrame = requestAnimationFrame(function () {
            var bounds = bench.getBoundingClientRect();
            bench.style.setProperty('--code-light-x', ((event.clientX - bounds.left) / bounds.width * 100).toFixed(2) + '%');
            bench.style.setProperty('--code-light-y', ((event.clientY - bounds.top) / bounds.height * 100).toFixed(2) + '%');
            bench.classList.add('is-hover');
            pointerFrame = 0;
        });
    }, {passive: true});
    bench.addEventListener('pointerleave', clearPointer);
    document.addEventListener('visibilitychange', refresh);
    [motion, pointer].forEach(function (query) {
        if (query.addEventListener) query.addEventListener('change', refresh);
        else if (query.addListener) query.addListener(refresh);
    });
    new MutationObserver(refresh).observe(root, {attributes: true, attributeFilter: ['data-accent']});
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            cardVisible = entries[0].isIntersecting;
            refresh();
        }).observe(card);
        new IntersectionObserver(function (entries) {
            benchVisible = entries[0].isIntersecting;
            refresh();
        }, {threshold: .15}).observe(bench);
    }
    bench.querySelectorAll('button').forEach(function (button) { button.disabled = false; });
    render(true);
    refresh();
})();
