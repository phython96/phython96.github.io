// aHR0cHM6Ly9naXRodWIuY29tL2x1b3N0MjYvYWNhZGVtaWMtaG9tZXBhZ2U=
$(function () {
    lazyLoadOptions = {
        scrollDirection: 'vertical',
        effect: 'fadeIn',
        effectTime: 300,
        placeholder: "",
        onError: function(element) {
            console.log('[lazyload] Error loading ' + element.data('src'));
        },
        afterLoad: function(element) {
            if (element.is('img')) {
                // remove background-image style
                element.css('background-image', 'none');
            } else if (element.is('div')) {
                // set the style to background-size: cover; 
                element.css('background-size', 'cover');
                element.css('background-position', 'center');
            }
        }
    }

    $('img.lazy, div.lazy:not(.always-load)').Lazy({visibleOnly: true, ...lazyLoadOptions});
    $('div.lazy.always-load').Lazy({visibleOnly: false, ...lazyLoadOptions});

    $('[data-toggle="tooltip"]').tooltip()

    var $grid = $('.grid').masonry({
        "percentPosition": true,
        "itemSelector": ".grid-item",
        "columnWidth": ".grid-sizer"
    });
    // layout Masonry after each image loads
    $grid.imagesLoaded().progress(function () {
        $grid.masonry('layout');
    });

    $(".lazy").on("load", function () {
        $grid.masonry('layout');
    });

    // Dark mode toggle (manual choice wins, persisted)
    $('#theme-toggle').on('click', function () {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    });

    // Follow the OS theme live, but only when the user hasn't made a manual choice
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onSchemeChange = function (e) {
            var stored = null;
            try { stored = localStorage.getItem('theme'); } catch (err) {}
            if (!stored) {
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        };
        if (mq.addEventListener) { mq.addEventListener('change', onSchemeChange); }
        else if (mq.addListener) { mq.addListener(onSchemeChange); }
    }

    // Reveal sections as they scroll into view
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
            revealEls.forEach(function (el) { io.observe(el); });
        } else {
            revealEls.forEach(function (el) { el.classList.add('in-view'); });
        }
    }

    // Accent color picker (persisted; applied pre-paint by the inline <head> script)
    var applyAccentActive = function () {
        var cur = document.documentElement.getAttribute('data-accent') || 'red';
        $('.accent-dot').removeClass('active');
        $('.accent-dot[data-accent="' + cur + '"]').addClass('active');
    };
    applyAccentActive();
    var triggerPosSwap = function () {
        var pl = document.querySelector('.positions-list');
        if (!pl) return;
        pl.classList.remove('swap-anim');
        void pl.offsetWidth; // force reflow to restart the animation
        pl.classList.add('swap-anim');
        setTimeout(function () { pl.classList.remove('swap-anim'); }, 600);
    };
    var WM_IMG = {
        red: "url('/assets/images/badges/PKU_red.png')",
        blue: "url('/assets/images/badges/deepseek.svg')",
        purple: ''
    };
    var WM_OP = {
        red: { light: 0.07, dark: 0.16 },
        blue: { light: 0.07, dark: 0.13 },
        purple: { light: 0, dark: 0 }
    };
    // Diagonal cross-wipe of the watermark, started in sync with the color ripple.
    // Uses two throwaway layers (explicit images) so it doesn't wait on the
    // delayed data-accent flip; the persistent layer is hidden until it catches up.
    var crossWipe = function (targetAccent, oldImg, oldOpacity) {
        var wm = document.querySelector('.profile-watermark');
        if (!wm) return;
        var root = document.documentElement;
        var theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var newImg = WM_IMG[targetAccent] || '';
        var newOp = (WM_OP[targetAccent] || WM_OP.purple)[theme];
        var mkLayer = function (img, op, cls) {
            var d = document.createElement('div');
            d.className = 'profile-watermark ' + cls;
            d.setAttribute('aria-hidden', 'true');
            d.style.backgroundImage = img;
            d.style.opacity = op;
            wm.parentNode.insertBefore(d, wm.nextSibling);
            void d.offsetWidth; // reflow so the animation runs
            return d;
        };
        wm.classList.add('wm-hidden');
        var layers = [];
        if (oldImg && oldImg !== 'none') layers.push(mkLayer(oldImg, oldOpacity, 'wm-out'));
        if (newImg) layers.push(mkLayer(newImg, newOp, 'wm-in'));
        // After the wipe, hand off to the persistent layer in a single frame:
        // kill its transition so it appears at the exact static opacity (no
        // fade-in stacking on top of the temp layer), then drop the temp layers.
        setTimeout(function () {
            wm.style.transition = 'none';
            wm.classList.remove('wm-hidden');
            void wm.offsetWidth; // commit the instant opacity
            layers.forEach(function (l) { if (l.parentNode) l.parentNode.removeChild(l); });
            requestAnimationFrame(function () { wm.style.transition = ''; });
        }, 700);
    };
    var ACCENT_GRAD = {
        purple: 'linear-gradient(135deg, #7c3aed, #db2777)',
        red: 'linear-gradient(135deg, #a4161a, #e5383b)',
        blue: 'linear-gradient(135deg, #4d6bfe, #38bdf8)'
    };
    $('.accent-dot').on('click', function (e) {
        var accent = $(this).data('accent');
        var root = document.documentElement;
        var prev = root.getAttribute('data-accent') || 'red';
        var crossesRed = (accent === 'red') !== (prev === 'red');
        var wm = document.querySelector('.profile-watermark');
        var oldImg = wm ? getComputedStyle(wm).backgroundImage : 'none';
        var oldOpacity = wm ? getComputedStyle(wm).opacity : '0';
        var apply = function () {
            root.setAttribute('data-accent', accent);
            try { localStorage.setItem('accent', accent); } catch (err) {}
            applyAccentActive();
            if (crossesRed) triggerPosSwap();
        };
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || accent === prev) { apply(); return; }

        // Cool color-sweep: a circle of the new palette expands from the clicked dot
        var x = e.clientX || window.innerWidth / 2;
        var y = e.clientY || 40;
        var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 8;
        var ripple = document.createElement('div');
        ripple.className = 'accent-ripple';
        ripple.style.background = ACCENT_GRAD[accent] || ACCENT_GRAD.purple;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = ripple.style.height = (r * 2) + 'px';
        document.body.appendChild(ripple);
        void ripple.offsetWidth; // reflow so the transition runs
        ripple.classList.add('expand');
        crossWipe(accent, oldImg, oldOpacity);                    // watermark wipe, synced with the sweep
        setTimeout(apply, 250);                                   // recolor under the sweep
        setTimeout(function () { ripple.classList.add('fade'); }, 540);
        setTimeout(function () { ripple.remove(); }, 950);
    });

    // Google Scholar citation count, cached on the google-scholar-stats branch
    // (updated daily by .github/workflows/google-scholar-stats.yml)
    var $gs = $('#gs-citations');
    if ($gs.length) {
        fetch('https://raw.githubusercontent.com/phython96/phython96.github.io/google-scholar-stats/gs_data.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (d) {
                if (d && typeof d.citedby === 'number') {
                    $gs.find('.gs-count').text(d.citedby.toLocaleString());
                    if (typeof d.hindex === 'number') { $('#gs-hindex').text(d.hindex); }
                    if (typeof d.i10index === 'number') { $('#gs-i10').text(d.i10index); }
                    $gs.css('display', '');
                }
            })
            .catch(function () {});
    }
})
