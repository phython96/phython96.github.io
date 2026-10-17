// Idle commands are decorative text, never input values or executable commands.
(function () {
    'use strict';
    var root = document.documentElement;
    var form = document.querySelector('.terminal-command-form');
    var input = document.querySelector('#terminal-command');
    var wrap = document.querySelector('.terminal-input-wrap');
    var preview = document.querySelector('.terminal-idle-text');
    if (!form || !input || !wrap || !preview) return;

    var commands = Array.from(document.querySelectorAll('.terminal-shortcuts [data-terminal-command]'))
        .map(function (item) { return item.dataset.terminalCommand; });
    if (!commands.length) return;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var timer = 0;
    var composing = false;
    var index = 0;
    var length = 0;
    var phase = 'typing';
    var TYPE_MS = 70;
    var DELETE_MS = 35;
    var HOLD_MS = 3000; // Three complete caret blink cycles.
    var GAP_MS = 450;
    var QUIET_MS = 3500;

    function allowed() {
        return root.dataset.accent === 'blue' && !document.hidden && !motion.matches && !input.disabled && !composing;
    }
    function clear() {
        clearTimeout(timer);
        timer = 0;
        wrap.classList.remove('is-idle-preview');
        preview.textContent = '';
    }
    function schedule(callback, delay) {
        clearTimeout(timer);
        timer = window.setTimeout(callback, delay);
    }
    function step() {
        timer = 0;
        if (!allowed() || input.value !== '') { clear(); return; }
        var word = commands[index];
        if (phase === 'typing') {
            length += 1;
            preview.textContent = word.slice(0, length);
            if (length === word.length) {
                phase = 'deleting';
                schedule(step, HOLD_MS);
            } else schedule(step, TYPE_MS);
        } else if (phase === 'deleting') {
            length -= 1;
            preview.textContent = word.slice(0, length);
            if (length === 0) {
                phase = 'gap';
                schedule(step, GAP_MS);
            } else schedule(step, DELETE_MS);
        } else {
            index = (index + 1) % commands.length;
            phase = 'typing';
            step();
        }
    }
    function begin() {
        timer = 0;
        if (!allowed() || input.value !== '') { clear(); return; }
        length = 0;
        phase = 'typing';
        wrap.classList.add('is-idle-preview');
        step();
    }
    function activity() {
        clear();
        // Recheck later, including programmatic history/completion changes.
        // A nonempty draft is never replaced, however long the user pauses.
        if (allowed()) schedule(begin, QUIET_MS);
    }
    function sync() {
        clear();
        if (allowed() && input.value === '') schedule(begin, GAP_MS);
    }

    ['focus', 'blur', 'pointerdown', 'keydown', 'input', 'change'].forEach(function (event) {
        input.addEventListener(event, activity);
    });
    input.addEventListener('beforeinput', clear);
    input.addEventListener('compositionstart', function () { composing = true; clear(); });
    input.addEventListener('compositionend', function () { composing = false; activity(); });
    // Capture runs before the command router, so Enter cannot submit an IME
    // composition. Enter on an idle preview still submits the empty real input.
    form.addEventListener('submit', function (event) {
        if (composing) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        activity();
    }, true);
    document.addEventListener('click', function (event) {
        if (event.target.closest('[data-terminal-command]')) activity();
    });
    new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-accent']});
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', clear);
    window.addEventListener('pageshow', sync);
    if (motion.addEventListener) motion.addEventListener('change', sync);
    else if (motion.addListener) motion.addListener(sync);
    sync();
})();
