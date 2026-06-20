/* eslint-disable node/no-unsupported-features/node-builtins */
(function($, moment, ClipboardJS, config) {
    $('.article img:not(".not-gallery-item")').each(function() {
        // wrap images with link and add caption if possible
        if ($(this).parent('a').length === 0) {
            $(this).wrap('<a class="gallery-item" href="' + $(this).attr('src') + '"></a>');
            if (this.alt) {
                $(this).after('<p class="has-text-centered is-size-6 caption">' + this.alt + '</p>');
            }
        }
    });

    if (typeof $.fn.lightGallery === 'function') {
        $('.article').lightGallery({ selector: '.gallery-item' });
    }
    if (typeof $.fn.justifiedGallery === 'function') {
        if ($('.justified-gallery > p > .gallery-item').length) {
            $('.justified-gallery > p > .gallery-item').unwrap();
        }
        $('.justified-gallery').justifiedGallery();
    }

    if (typeof moment === 'function') {
        $('.article-meta time').each(function() {
            $(this).text(moment($(this).attr('datetime')).fromNow());
        });
    }

    $('.article > .content > table').each(function() {
        if ($(this).width() > $(this).parent().width()) {
            $(this).wrap('<div class="table-overflow"></div>');
        }
    });

    function adjustNavbar() {
        const navbarWidth = $('.navbar-main .navbar-start').outerWidth() + $('.navbar-main .navbar-end').outerWidth();
        if ($(document).outerWidth() < navbarWidth) {
            $('.navbar-main .navbar-menu').addClass('justify-content-start');
        } else {
            $('.navbar-main .navbar-menu').removeClass('justify-content-start');
        }
    }
    adjustNavbar();
    $(window).resize(adjustNavbar);

    function toggleFold(codeBlock, isFolded) {
        const $toggle = $(codeBlock).find('.fold i');
        !isFolded ? $(codeBlock).removeClass('folded') : $(codeBlock).addClass('folded');
        !isFolded ? $toggle.removeClass('fa-angle-right') : $toggle.removeClass('fa-angle-down');
        !isFolded ? $toggle.addClass('fa-angle-down') : $toggle.addClass('fa-angle-right');
    }

    function createFoldButton(fold) {
        return '<span class="fold">' + (fold === 'unfolded' ? '<i class="fas fa-angle-down"></i>' : '<i class="fas fa-angle-right"></i>') + '</span>';
    }

    $('figure.highlight table').wrap('<div class="highlight-body">');
    if (typeof config !== 'undefined'
        && typeof config.article !== 'undefined'
        && typeof config.article.highlight !== 'undefined') {

        $('figure.highlight').addClass('hljs');
        $('figure.highlight .code .line span').each(function() {
            const classes = $(this).attr('class').split(/\s+/);
            for (const cls of classes) {
                $(this).addClass('hljs-' + cls);
                $(this).removeClass(cls);
            }
        });


        const clipboard = config.article.highlight.clipboard;
        const fold = config.article.highlight.fold.trim();

        $('figure.highlight').each(function() {
            if ($(this).find('figcaption').length) {
                $(this).find('figcaption').addClass('level is-mobile');
                $(this).find('figcaption').append('<div class="level-left">');
                $(this).find('figcaption').append('<div class="level-right">');
                $(this).find('figcaption div.level-left').append($(this).find('figcaption').find('span'));
                $(this).find('figcaption div.level-right').append($(this).find('figcaption').find('a'));
            } else {
                if (clipboard || fold) {
                    $(this).prepend('<figcaption class="level is-mobile"><div class="level-left"></div><div class="level-right"></div></figcaption>');
                }
            }
        });

        if (typeof ClipboardJS !== 'undefined' && clipboard) {
            $('figure.highlight').each(function() {
                const id = 'code-' + Date.now() + (Math.random() * 1000 | 0);
                const button = '<a href="javascript:;" class="copy" title="Copy" data-clipboard-target="#' + id + ' .code"><i class="fas fa-copy"></i></a>';
                $(this).attr('id', id);
                $(this).find('figcaption div.level-right').append(button);
            });
            new ClipboardJS('.highlight .copy'); // eslint-disable-line no-new
        }

        if (fold) {
            $('figure.highlight').each(function() {
                $(this).addClass('foldable'); // add 'foldable' class as long as fold is enabled

                if ($(this).find('figcaption').find('span').length > 0) {
                    const span = $(this).find('figcaption').find('span');
                    if (span[0].innerText.indexOf('>folded') > -1) {
                        span[0].innerText = span[0].innerText.replace('>folded', '');
                        $(this).find('figcaption div.level-left').prepend(createFoldButton('folded'));
                        toggleFold(this, true);
                        return;
                    }
                }
                $(this).find('figcaption div.level-left').prepend(createFoldButton(fold));
                toggleFold(this, fold === 'folded');
            });

            $('figure.highlight figcaption .level-left').click(function() {
                const $code = $(this).closest('figure.highlight');
                toggleFold($code.eq(0), !$code.hasClass('folded'));
            });
        }
    }

    function slugifyHeading(text) {
        return text.toString().trim().toLowerCase()
            .replace(/['"’]/g, '')
            .replace(/[^0-9a-zA-Z\u4e00-\u9fa5]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function createReadingOutline($content) {
        const headings = [];
        $content.find('h1, h2, h3, h4, h5, h6').each(function(index) {
            const $heading = $(this);
            const text = $heading.text().trim();
            if (!text) {
                return;
            }

            let id = $heading.attr('id');
            if (!id) {
                const base = slugifyHeading(text) || `reading-heading-${index + 1}`;
                id = base;
                let suffix = 1;
                while (document.getElementById(id)) {
                    id = `${base}-${suffix++}`;
                }
                $heading.attr('id', id);
            }

            headings.push({
                id,
                text,
                level: parseInt(this.tagName.substring(1), 10)
            });
        });
        return headings;
    }

    function createReadingPanel(items) {
        const $panel = $('<aside class="reading-outline" id="reading-outline" aria-label="文章大纲"></aside>');
        $panel.append('<div class="reading-outline__label">目录</div>');
        const $nav = $('<nav class="reading-outline__nav"></nav>');

        if (items.length === 0) {
            $nav.append('<p class="reading-outline__empty">这篇文章还没有小标题</p>');
        } else {
            items.forEach(item => {
                const $link = $('<a></a>');
                $link.attr('href', `#${item.id}`);
                $link.attr('data-level', item.level);
                $link.addClass(`reading-outline__item is-level-${item.level}`);
                $link.text(item.text);
                $nav.append($link);
            });
        }

        $panel.append($nav);
        return $panel;
    }

    function initReadingMode() {
        const $readingToggle = $('#reading-mode-toggle');
        const $article = $('.article').first();
        const $content = $article.children('.content').first();

        if (!$readingToggle.length || !$content.length) {
            return;
        }

        const storageKey = 'icarus-reading-mode';
        const outlineItems = createReadingOutline($content);
        const $outline = createReadingPanel(outlineItems);
        const outlineState = outlineItems.map(item => ({
            id: item.id,
            element: document.getElementById(item.id),
            link: $outline.find(`.reading-outline__item[href="#${item.id}"]`)
        }));
        let activeOutlineId = null;
        let outlineTicking = false;

        $('body').append($outline);

        function updateActiveOutline() {
            if (!$('body').hasClass('reading-mode') || outlineState.length === 0) {
                return;
            }

            const marker = window.scrollY + 140;
            let current = outlineState[0];

            outlineState.forEach(item => {
                if (item.element && item.element.offsetTop <= marker) {
                    current = item;
                }
            });

            if (!current || current.id === activeOutlineId) {
                return;
            }

            activeOutlineId = current.id;
            $outline.find('.reading-outline__item').removeClass('is-active');
            current.link.addClass('is-active');
        }

        function requestOutlineUpdate() {
            if (outlineTicking) {
                return;
            }
            outlineTicking = true;
            window.requestAnimationFrame(() => {
                updateActiveOutline();
                outlineTicking = false;
            });
        }

        function setReadingMode(enabled) {
            $('body').toggleClass('reading-mode', enabled);
            $outline.toggleClass('is-active', enabled);
            $readingToggle.toggleClass('is-active', enabled);
            $readingToggle.attr('aria-pressed', enabled ? 'true' : 'false');
            $readingToggle.attr('title', enabled ? '退出沉浸式阅读' : '沉浸式阅读');
            $readingToggle.find('i')
                .toggleClass('fa-book-open', !enabled)
                .toggleClass('fa-times', enabled);

            try {
                window.localStorage.setItem(storageKey, enabled ? '1' : '0');
            } catch (error) {
                // Ignore storage failures in private browsing / locked-down browsers.
            }
        }

        $readingToggle.on('click', function(event) {
            event.preventDefault();
            const nextState = !$('body').hasClass('reading-mode');
            setReadingMode(nextState);

            if (nextState) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            requestOutlineUpdate();
        });

        const savedState = (() => {
            try {
                return window.localStorage.getItem(storageKey) === '1';
            } catch (error) {
                return false;
            }
        })();

        setReadingMode(savedState);

        $(window).on('scroll resize load', requestOutlineUpdate);
        requestOutlineUpdate();
    }

    initReadingMode();

    const $toc = $('#toc');
    if ($toc.length > 0) {
        const $mask = $('<div>');
        $mask.attr('id', 'toc-mask');

        $('body').append($mask);

        function toggleToc() { // eslint-disable-line no-inner-declarations
            $toc.toggleClass('is-active');
            $mask.toggleClass('is-active');
        }

        $toc.on('click', toggleToc);
        $mask.on('click', toggleToc);
        $('.navbar-main .catalogue').on('click', toggleToc);
    }
}(jQuery, window.moment, window.ClipboardJS, window.IcarusThemeSettings));
