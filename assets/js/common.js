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
        var cur = document.documentElement.getAttribute('data-accent') || 'purple';
        $('.accent-dot').removeClass('active');
        $('.accent-dot[data-accent="' + cur + '"]').addClass('active');
    };
    applyAccentActive();
    $('.accent-dot').on('click', function () {
        var accent = $(this).data('accent');
        document.documentElement.setAttribute('data-accent', accent);
        try { localStorage.setItem('accent', accent); } catch (e) {}
        applyAccentActive();
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
