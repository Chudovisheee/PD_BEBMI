document.addEventListener('DOMContentLoaded', function() {

    const UI_CONFIG = {
        totalStandardPages: 12, // кол-во стандартных страниц
        imageExtension: 'png', // формат картинок которые скрипт подсасывает из table-of-content

        hiddenPages: ['6_1.html', '6_2.html', '6_3.html'],
        //тут лежат нестандартные страницы (например, когда у вас несколько версий одной страницы должны переключаться скриптом и быть в разных html)
        customPages: [
            { filename: '6_1.html', label: '6.1', image: 'page-6-1', insertAfter: 6 },
            { filename: '6_2.html', label: '6.2', image: 'page-6-2', insertAfter: 6 },
            { filename: '6_3.html', label: '6.3', image: 'page-6-3', insertAfter: 6 },
        ],
        // тут страницы с нестандартными переходами
        customNavigation: {
            '6_1.html': { next: '6.html', prev: '6.html' },
            '6_2.html': { next: '6.html', prev: '6.html' },
            '6_3.html': { next: '6.html', prev: '6.html' },

        },
        //тут страницы на которых нужно выключит навигацию стрелками клавы
        disabledKeyboardPages: ['6.html'],

        //Тут лежат подсказки
        pageHints: {
            'index.html': 'Добро пожаловать! Нажмите кнопку "ЧИТАТЬ ДАЛЕЕ", чтобы начать.',
            '6.html': 'Пройдите все двери чтобы попасть на следующую страницу.',


        }
    };

    function getCurrentFilename() {
        return window.location.pathname
            .split('/')
            .pop()
            .toLowerCase()
            .split('?')[0]
            .split('#')[0] || 'index.html';
    }

    function el(tag, classes = '', attrs = {}, children = []) {
        const element = document.createElement(tag);
        if (classes) element.className = classes;
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'dataset') {
                Object.entries(value).forEach(([dk, dv]) => element.dataset[dk] = dv);
            } else {
                element.setAttribute(key, value);
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child) {
                element.appendChild(child);
            }
        });
        return element;
    }

    function getImagePath(imageName) {
        return `./assets/img/table-of-content/${imageName}.${UI_CONFIG.imageExtension}`;
    }

    function getPageId(filename) {
        if (filename === 'index.html') return 'chapter-one--page-index';
        return `chapter-one--page-${filename.replace('.html', '')}`;
    }

    function getSortedPages() {
        const pages = [];
        pages.push({ filename: 'index.html', sortKey: 0, label: '0', image: 'page-index', isIndex: true });

        for (let i = 1; i <= UI_CONFIG.totalStandardPages; i++) {
            pages.push({
                filename: `${i}.html`,
                sortKey: i,
                label: `${i}`,
                image: `page-${i}`,
                isIndex: false
            });
        }

        if (UI_CONFIG.customPages) {
            UI_CONFIG.customPages.forEach(cp => {
                pages.push({
                    filename: cp.filename,
                    sortKey: cp.insertAfter ? cp.insertAfter + 0.1 : 999,
                    label: cp.label,
                    image: cp.image,
                    isIndex: false,
                    isCustom: true
                });
            });
        }
        return pages.sort((a, b) => a.sortKey - b.sortKey);
    }

    function generateUI() {
        const pages = getSortedPages();
        const currentFilename = getCurrentFilename();
        const currentPage = pages.find(p => p.filename === currentFilename) || pages[0];
        const maxPageNum = UI_CONFIG.totalStandardPages;
        const currentNum = currentPage.isIndex ? 0 : (parseFloat(currentPage.label) || 0);
        const progressPercent = Math.min(100, Math.max(0, (currentNum / maxPageNum) * 100));

        const sidebar = el('div', '', { id: 'UI__sidebar' });
        const menuBtn = el('button', 'button-blue top-right', {
            id: 'UI__menu-button',
            'aria-label': 'Открыть содержание',
            onclick: 'menuToggle()'
        }, [el('img', '', { draggable: 'false', src: './svg/UI/hamburger.svg', alt: '' })]);
        sidebar.appendChild(menuBtn);

        const toc = el('div', 'wrapper', { id: 'UI__table-of-content' });
        toc.appendChild(el('span', 'heading', {}, ['Содержание']));

        const progressBox = el('div', 'progress-box', {});
        const progressText = el('div', 'progress-box__text', {}, [
            el('span', 'first-page', {}, [String(currentNum)]),
            el('span', 'last-page', {}, [String(maxPageNum)])
        ]);
        const progressBar = el('div', 'progress-bar', { style: `width: ${progressPercent}%` });
        progressBox.append(progressText, progressBar);
        toc.appendChild(progressBox);

        const content = el('div', 'content', {});
        content.appendChild(el('div', 'content__chapter', {}, [
            el('img', 'preview', { draggable: 'false', id: 'chapter-one', src: getImagePath('page-1'), srcset: `${getImagePath('page-1')} 2x` })
        ]));

        pages.forEach(page => {

        if (UI_CONFIG.hiddenPages && UI_CONFIG.hiddenPages.includes(page.filename)) {
          return;
        }

        const isActive = page.filename === currentFilename;
        const link = el('a', '', { draggable: 'false', href: page.filename });
        const pageDiv = el('div', `content__page ${isActive ? 'active' : ''}`, {});

        pageDiv.appendChild(el('img', 'content__play', { draggable: 'false', src: './svg/UI/tocPlay.svg' }));
        pageDiv.appendChild(el('span', '', {}, [page.label]));
        pageDiv.appendChild(el('img', 'preview', {
          draggable: 'false', id: getPageId(page.filename), src: getImagePath(page.image), srcset: `${getImagePath(page.image)} 2x`
        }));

        link.appendChild(pageDiv);
        content.appendChild(link);
        });

        toc.appendChild(content);
        sidebar.appendChild(toc);

        const navigation = el('div', 'click', { id: 'UI__navigation' });

        const prevBtn = el('button', 'button-blue bottom', { id: 'UI__previous-page-button' }, [
            el('img', '', { draggable: 'false', src: './svg/UI/arrowLeft.svg', alt: 'Назад' })
        ]);
        const topBtn = el('button', 'button-blue bottom', { id: 'UI__go-top-button' }, [
            el('img', '', { draggable: 'false', src: './svg/UI/arrowUp.svg', alt: 'Наверх' })
        ]);
        const nextBtn = el('button', 'button-black bottom', { id: 'UI__next-page-button' }, [
            el('span','', {}, ['ЧИТАТЬ ДАЛЕЕ']),
            el('img', '', { draggable: 'false', src: './svg/UI/arrowRight.svg', alt: 'Вперед' })
        ]);

        const bottomBtn = el('button', 'button-black bottom', { id: 'UI__go-bottom-button' }, [
            el('img', '', { draggable: 'false', src: './svg/UI/scroll.svg', alt: '' }),
            el('img', '', { draggable: 'false', src: './svg/UI/arrowDown.svg', alt: 'Вниз' })
        ]);

        const hintBtn = el('button', 'button-blue bottom', { id: 'UI__hint-button', 'aria-label': 'Показать подсказку' }, [
            el('img', '', { draggable: 'false', src: './svg/UI/hint.svg', alt: 'Подсказка' })
        ]);

        navigation.append(prevBtn, topBtn, nextBtn, bottomBtn, hintBtn);

        // --- Модальное окно подсказки ---
        const modal = el('div', 'hint-modal', { id: 'UI__hint-modal' }, [
            el('div', 'hint-modal__overlay', { id: 'hint-modal-overlay' }),
            el('div', 'hint-modal__content', {}, [
                el('button', 'hint-modal__close', { id: 'hint-modal-close', 'aria-label': 'Закрыть' }, ['×']),
                el('h3', 'hint-modal__title', {}, ['Подсказка']),
                el('p', 'hint-modal__text', { id: 'hint-modal-text' }, [''])
            ])
        ]);

        const uiContainer = el('div', '', { id: 'UI' });
        uiContainer.append(sidebar, navigation, modal);
        document.body.appendChild(uiContainer);

        return { pages, currentPage, prevBtn, nextBtn, topBtn, bottomBtn, hintBtn, modal, sidebar };
    }

    function navigate(direction) {
        const pages = getSortedPages();
        const currentFilename = getCurrentFilename();
        const currentIndex = pages.findIndex(p => p.filename === currentFilename);

        if (currentIndex === -1) return;

        if (UI_CONFIG.customNavigation[currentFilename]) {
            const target = direction === 'next'
                ? UI_CONFIG.customNavigation[currentFilename].next
                : UI_CONFIG.customNavigation[currentFilename].prev;
            if (target) {
                window.location.href = target;
                return;
            }
        }

        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (targetIndex >= 0 && targetIndex < pages.length) {
            window.location.href = pages[targetIndex].filename;
        }
    }

    function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    function scrollToBottom() { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }

    window.menuToggle = function() {
        const sidebar = document.getElementById('UI__sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    };

    function openHintModal() {
        const currentFilename = getCurrentFilename();
        const hintText = UI_CONFIG.pageHints[currentFilename] || 'Для этой страницы подсказка не предусмотрена.';

        const textElement = document.getElementById('hint-modal-text');
        if (textElement) textElement.textContent = hintText;

        const modal = document.getElementById('UI__hint-modal');
        if (modal) modal.classList.add('active');
    }

    function closeHintModal() {
        const modal = document.getElementById('UI__hint-modal');
        if (modal) modal.classList.remove('active');
    }

    const ui = generateUI();

    ui.prevBtn.addEventListener('click', (e) => { e.preventDefault(); navigate('prev'); });
    ui.nextBtn.addEventListener('click', (e) => { e.preventDefault(); navigate('next'); });
    ui.topBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToTop(); });
    ui.bottomBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToBottom(); });

    ui.hintBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openHintModal();
    });

    document.getElementById('hint-modal-close').addEventListener('click', closeHintModal);
    document.getElementById('hint-modal-overlay').addEventListener('click', closeHintModal);

    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('UI__hint-modal');

        if (e.key === 'Escape') {
            if (modal && modal.classList.contains('active')) {
                e.preventDefault();
                e.stopPropagation();
                closeHintModal();
                return;
            }
        }

        if (modal && modal.classList.contains('active')) {
            return;
        }

        const currentFile = getCurrentFilename();
        if (UI_CONFIG.disabledKeyboardPages.includes(currentFile)) {
            return;
        }

        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (['input', 'textarea', 'select', 'button'].includes(tag)) {
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            navigate('prev');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            navigate('next');
        }
    }, true);

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('UI__sidebar');
        const menuBtn = document.getElementById('UI__menu-button');
        if (sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
});
