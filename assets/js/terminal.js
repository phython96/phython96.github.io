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
    var commands = ['whoami', 'experience', 'news', 'papers', 'projects', 'agent', 'lang', 'help'];
    var aliases = {about: 'whoami', profile: 'whoami', 'cat profile.md': 'whoami', 'agent --visualize': 'agent', ls: 'help'};
    var panels = Array.from(main.querySelectorAll('[data-terminal-panel]'));
    var defaultView = main.dataset.terminalDefault || 'whoami';
    var hashes = {whoami: '', experience: '#experience', news: '#news', agent: '#agent-demo', help: '#help'};
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var history = [];
    var historyIndex = 0;
    var draft = '';
    var wasBlue = false;
    var hasYearNavigation = document.body.getAttribute('data-spy') === 'scroll' && !!document.querySelector('#navbar-year');
    var spyFrame = 0;
    var yearLinks = hasYearNavigation ? Array.from(document.querySelectorAll('#navbar-year a')) : [];

    function updateYearNavigation() {
        if (!hasYearNavigation || root.dataset.accent !== 'blue' || main.dataset.terminalView !== 'papers') return;
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

    function selectPanel(name, resetScroll) {
        var panel = panels.find(function (item) { return item.dataset.terminalPanel === name; });
        if (!panel) return false;
        panels.forEach(function (item) { item.classList.toggle('is-terminal-active', item === panel); });
        main.dataset.terminalView = name;
        shortcuts.forEach(function (item) {
            if (item.dataset.terminalCommand === name) item.setAttribute('aria-current', 'true');
            else item.removeAttribute('aria-current');
        });
        if (resetScroll) main.scrollTo({top: 0, behavior: 'instant'});
        requestAnimationFrame(function () {
            // Images and Masonry grids may have initialized while their panel
            // was hidden. Let their existing resize handlers measure it again.
            window.dispatchEvent(new Event('resize'));
            scheduleYearNavigation();
        });
        return true;
    }

    function rememberPanel(name) {
        var hash = name === defaultView ? '' : (hashes[name] || '');
        window.history.replaceState(null, '', location.pathname + location.search + hash);
    }

    function restorePanel() {
        var name = Object.keys(hashes).find(function (key) { return hashes[key] && hashes[key] === location.hash; }) || defaultView;
        if (location.hash === '#about') name = 'whoami';
        var yearAnchor = defaultView === 'papers' && location.hash.indexOf('#year-') === 0;
        if (!selectPanel(name, !yearAnchor)) selectPanel(defaultView, !yearAnchor);
        if (yearAnchor) {
            var year = document.getElementById(location.hash.slice(1));
            if (year) scrollToTarget(year);
        }
    }

    function showMessage(command, message) {
        main.querySelector('.terminal-message-command').textContent = command;
        main.querySelector('.terminal-message-text').textContent = message;
        selectPanel('message', true);
        response.textContent = message;
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
        var language = /^(?:lang )?(en|zh)$/.exec(command);
        if (language) command = 'lang';
        input.value = '';
        if (commands.indexOf(command) === -1) {
            showMessage(text, response.dataset.unknown);
            return;
        }
        if (command === 'lang') {
            var currentLanguage = root.lang === 'en' ? 'en' : 'zh';
            if (language && language[1] === currentLanguage) {
                response.textContent = '❯ ' + text;
                return;
            }
            var switcher = document.querySelector('[data-language-switch]');
            if (switcher) {
                var destination = new URL(switcher.href, location.href);
                destination.hash = location.hash;
                window.location.assign(destination.href);
            }
            return;
        }
        var route = shortcuts.find(function (item) { return item.dataset.terminalCommand === command; });
        // The homepage also contains selected papers for the other themes;
        // the terminal's papers command always opens the complete collection.
        if ((command === 'papers' || command === 'projects') && defaultView !== command) {
            if (route && route.href) window.location.assign(route.href);
            return;
        }
        if (selectPanel(command, true)) {
            rememberPanel(command);
            response.textContent = '❯ ' + text;
        } else if (defaultView === 'whoami') {
            showMessage(text, response.dataset.missing);
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
        if (blue && !wasBlue) restorePanel();
        wasBlue = blue;
    }
    new MutationObserver(refresh).observe(root, {attributes: true, attributeFilter: ['data-accent']});
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('hashchange', function () { if (root.dataset.accent === 'blue') restorePanel(); });
    main.addEventListener('scroll', scheduleYearNavigation, {passive: true});
    window.addEventListener('resize', scheduleYearNavigation);
    if (document.fonts) document.fonts.ready.then(scheduleYearNavigation);
    if (motion.addEventListener) motion.addEventListener('change', refresh);
    else if (motion.addListener) motion.addListener(refresh);
    form.querySelectorAll('[disabled]').forEach(function (el) { el.disabled = false; });
    shortcuts.forEach(function (el) { if (el.tagName === 'BUTTON') el.disabled = false; });
    refresh();
})();
