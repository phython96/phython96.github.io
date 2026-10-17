// Site navigation in a terminal UI. Commands select existing page content;
// no input is evaluated as JavaScript, shell code, or a model request.
(function () {
    'use strict';
    var root = document.documentElement;
    var shell = document.querySelector('.site-shell');
    var main = document.querySelector('.site-main');
    var form = document.querySelector('.terminal-command-form');
    if (!shell || !main || !form) return;
    var input = form.querySelector('input');
    var response = document.querySelector('.terminal-response');
    var shortcuts = Array.from(document.querySelectorAll('[data-terminal-command]'));
    var commands = ['whoami', 'experience', 'news', 'papers', 'projects', 'agent', 'help'];
    var aliases = {about: 'whoami', profile: 'whoami', 'cat profile.md': 'whoami', 'agent --visualize': 'agent', ls: 'help'};
    var targets = {whoami: '#about', experience: '#experience', news: '#news', agent: '#agent-demo'};
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var history = [];
    var historyIndex = 0;
    var draft = '';
    var wasBlue = false;
    var hasYearNavigation = document.body.getAttribute('data-spy') === 'scroll' && !!document.querySelector('#navbar-year');
    var spyFrame = 0;
    var yearLinks = hasYearNavigation ? Array.from(document.querySelectorAll('#navbar-year a')) : [];

    function updateYearNavigation() {
        if (!hasYearNavigation || root.dataset.accent !== 'blue') return;
        var current = yearLinks[0];
        var top = main.getBoundingClientRect().top + 80;
        yearLinks.forEach(function (link) {
            var section = document.getElementById(link.hash.slice(1));
            if (section && section.getBoundingClientRect().top <= top) current = link;
        });
        if (main.scrollTop + main.clientHeight >= main.scrollHeight - 2) current = yearLinks[yearLinks.length - 1];
        yearLinks.forEach(function (link) { link.classList.toggle('active', link === current); });
    }

    function scheduleYearNavigation() {
        if (!hasYearNavigation || root.dataset.accent !== 'blue') return;
        cancelAnimationFrame(spyFrame);
        spyFrame = requestAnimationFrame(updateYearNavigation);
    }

    function syncYearNavigation(blue) {
        var jq = window.jQuery;
        if (!hasYearNavigation) return;
        cancelAnimationFrame(spyFrame);
        // Prevent Bootstrap's window-load handler from also observing the body.
        if (blue) document.body.removeAttribute('data-spy');
        else document.body.setAttribute('data-spy', 'scroll');
        if (blue) {
            if (jq && jq.fn.scrollspy && jq(document.body).data('bs.scrollspy')) jq(document.body).scrollspy('dispose');
            scheduleYearNavigation();
        } else if (jq && jq.fn.scrollspy) {
            spyFrame = requestAnimationFrame(function () {
                if (jq(document.body).data('bs.scrollspy')) jq(document.body).scrollspy('refresh');
                else jq(document.body).scrollspy({target: '#navbar-year', offset: 100});
            });
        }
    }

    function scrollToTarget(target) {
        requestAnimationFrame(function () {
            main.scrollTo({
                top: target.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 20,
                behavior: motion.matches ? 'instant' : 'smooth'
            });
        });
    }

    function run(raw) {
        if (root.dataset.accent !== 'blue') return;
        var text = raw.trim();
        if (!text) return;
        if (history[history.length - 1] !== text) history.push(text);
        if (history.length > 30) history.shift();
        historyIndex = history.length;
        draft = '';
        var command = text.toLowerCase().replace(/\s+/g, ' ');
        command = aliases[command] || command;
        input.value = '';
        if (commands.indexOf(command) === -1) {
            response.textContent = response.dataset.unknown;
            return;
        }
        if (command === 'help') {
            response.textContent = response.dataset.help;
            return;
        }
        var route = shortcuts.find(function (item) { return item.dataset.terminalCommand === command; });
        var target = targets[command] ? document.querySelector(targets[command]) : null;
        if (target) {
            if (command === 'agent') shell.classList.add('terminal-demo-open');
            else if (command === 'whoami') {
                shell.classList.remove('terminal-demo-open');
                if (location.hash === '#agent-demo') window.history.replaceState(null, '', location.pathname + location.search);
            }
            response.textContent = '❯ ' + text;
            scrollToTarget(target);
        } else if (targets[command] && document.querySelector('#about')) {
            response.textContent = response.dataset.missing;
        } else if (route && route.href) {
            window.location.assign(route.href);
        }
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        run(input.value);
    });
    shortcuts.forEach(function (shortcut) {
        shortcut.addEventListener('click', function (event) {
            if (root.dataset.accent !== 'blue') return;
            event.preventDefault();
            run(shortcut.dataset.terminalCommand);
        });
    });
    input.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            if (!history.length) return;
            event.preventDefault();
            if (historyIndex === history.length) draft = input.value;
            historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
            input.value = historyIndex === history.length ? draft : history[historyIndex];
        } else if (event.key === 'Tab' && !event.shiftKey && input.value.trim()) {
            var matches = commands.filter(function (name) { return name.indexOf(input.value.trim().toLowerCase()) === 0; });
            if (matches.length === 1) {
                event.preventDefault();
                input.value = matches[0];
            }
        } else if (event.key === 'Escape') {
            input.value = '';
            historyIndex = history.length;
        }
    });

    function refresh() {
        var blue = root.dataset.accent === 'blue';
        shell.classList.toggle('terminal-resting', !blue || motion.matches || document.hidden);
        if (blue !== wasBlue || (hasYearNavigation && !wasBlue)) syncYearNavigation(blue);
        if (blue && !wasBlue && location.hash === '#agent-demo') {
            var demo = document.querySelector('#agent-demo');
            if (demo) {
                shell.classList.add('terminal-demo-open');
                scrollToTarget(demo);
            }
        }
        wasBlue = blue;
    }
    new MutationObserver(refresh).observe(root, {attributes: true, attributeFilter: ['data-accent']});
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('hashchange', function () { wasBlue = false; refresh(); });
    main.addEventListener('scroll', scheduleYearNavigation, {passive: true});
    window.addEventListener('resize', scheduleYearNavigation);
    if (document.fonts) document.fonts.ready.then(scheduleYearNavigation);
    if (motion.addEventListener) motion.addEventListener('change', refresh);
    else if (motion.addListener) motion.addListener(refresh);
    form.querySelectorAll('[disabled]').forEach(function (el) { el.disabled = false; });
    shortcuts.forEach(function (el) { if (el.tagName === 'BUTTON') el.disabled = false; });
    refresh();
})();
