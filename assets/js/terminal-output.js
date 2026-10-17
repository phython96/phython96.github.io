// Reveal semantic output blocks after a command, without delaying the data.
(function () {
    'use strict';
    var root = document.documentElement;
    var main = document.querySelector('.site-main');
    if (!main) return;
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var timer = 0;
    var pieces = [];
    var selectors = {
        whoami: '.terminal-kv > div, .terminal-output-label, .terminal-prose p',
        experience: '.terminal-output-label, .terminal-records > li',
        news: '.terminal-log-header, .terminal-log > li',
        papers: 'h2, .publication-row',
        projects: 'h1, .grid-item > div',
        agent: '.terminal-section-command, .agent-editor-tabs, .agent-line, .agent-terminal, .agent-demo-heading, .agent-phases, .agent-demo-caption',
        help: '.terminal-section-command, .terminal-help-title, .terminal-help-intro, .terminal-help-list > div, .terminal-help-keys',
        theme: '.terminal-section-command, .terminal-help-title, .terminal-help-intro, .terminal-help-list > div',
        message: '.terminal-section-command, .terminal-message-text, .terminal-message-help'
    };
    function clear() {
        clearTimeout(timer);
        pieces.forEach(function (piece) {
            piece.classList.remove('terminal-output-piece');
            piece.style.removeProperty('--terminal-piece-delay');
        });
        pieces = [];
        main.classList.remove('is-output-revealing');
        main.style.removeProperty('--terminal-scan-distance');
    }
    main.addEventListener('terminal:output', function (event) {
        clear();
        var panel = event.detail.panel;
        if (root.dataset.accent !== 'blue') return;
        if (panel.classList.contains('reveal')) panel.classList.add('in-view');
        if (!event.detail.animate || motion.matches) return;
        var selector = selectors[panel.dataset.terminalPanel];
        if (!selector) return;
        pieces = Array.from(panel.querySelectorAll(selector)).filter(function (piece) {
            var rect = piece.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        pieces.forEach(function (piece, index) {
            piece.style.setProperty('--terminal-piece-delay', (80 + Math.min(index * 55, 550)) + 'ms');
            piece.classList.add('terminal-output-piece');
        });
        main.style.setProperty('--terminal-scan-distance', Math.min(main.clientHeight, 720) + 'px');
        void main.offsetWidth;
        main.classList.add('is-output-revealing');
        timer = window.setTimeout(clear, 1200);
    });
    new MutationObserver(function () { if (root.dataset.accent !== 'blue') clear(); })
        .observe(root, {attributes: true, attributeFilter: ['data-accent']});
    function motionChanged() { if (motion.matches) clear(); }
    if (motion.addEventListener) motion.addEventListener('change', motionChanged);
    else if (motion.addListener) motion.addListener(motionChanged);
    window.addEventListener('pagehide', clear);
})();
