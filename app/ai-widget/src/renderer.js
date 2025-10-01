import { emojiData } from '../../assets/emoji-data.js';

document.addEventListener('DOMContentLoaded', function () {

    function createSearchIndex(data) {
        return data.map(emoji => {
            const searchText = `${emoji.annotation || ''} ${emoji.tags || ''} ${emoji.group || ''} ${emoji.subgroup || ''}`.toLowerCase();
            const tokens = [...new Set(
                searchText
                    .split(/[,\s]+/)
                    .filter(t => t.length > 0)
            )];
            return {
                ...emoji,
                searchText,
                tokens
            };
        });
    }

    const searchIndex = createSearchIndex(emojiData || []);


    const searchInput = document.querySelector('.search-input');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const emojiContent = document.getElementById('emoji-content');
    const skinTonePopover = document.getElementById('skin-tone-popover');
    const skinToneOptions = document.getElementById('skin-tone-options');


    const RECENT_KEY = 'emoji_picker_recents_v1';
    function getRecents() {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function pushRecent(emojiChar) {
        try {
            let recents = getRecents();
            recents = recents.filter(e => e !== emojiChar);
            recents.unshift(emojiChar);
            if (recents.length > 64) recents = recents.slice(0, 64);
            localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
        } catch (e) { /* ignore */ }
    }

    function clearRecents() {
        try {
            localStorage.removeItem(RECENT_KEY);

            showClearedFeedback();

            const activeBtn = document.querySelector('.cat-btn.active');
            if (activeBtn && activeBtn.dataset.category === 'recent') {
                displayByCategory('recent');
            }
        } catch (e) { /* ignore */ }
    }

    function safeCopyToClipboard(text) {
        if (!text) return Promise.reject();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise((res, rej) => {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                res();
            } catch (err) {
                rej(err);
            }
        });
    }

    function showCopiedFeedback(emoji) {
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = `${emoji} copied!`;
        document.body.appendChild(feedback);
        requestAnimationFrame(() => feedback.classList.add('visible'));
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
            }, 300);
        }, 1400);
    }

    function showClearedFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback cleared-feedback';
        feedback.textContent = 'Recents cleared!';
        document.body.appendChild(feedback);
        requestAnimationFrame(() => feedback.classList.add('visible'));
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
            }, 300);
        }, 1400);
    }

    let longPressTimer = null;
    let isLongPress = false;
    let currentEmojiData = null;

    let categoryLongPressTimer = null;
    let isCategoryLongPress = false;

    function startLongPress(btn, emojiItem, e) {
        isLongPress = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            if (emojiItem && emojiItem.skinTones && emojiItem.skinTones.length > 1) {
                showSkinTonePopover(btn, emojiItem);
            }
        }, 500);
    }

    function endLongPress(emojiItem) {
        clearTimeout(longPressTimer);
        if (!isLongPress && emojiItem) {
            const emojiToCopy = emojiItem.emoji;
            safeCopyToClipboard(emojiToCopy)
                .then(() => {
                    pushRecent(emojiToCopy);
                    showCopiedFeedback(emojiToCopy);
                })
                .catch(() => { /* ignore */ });
        }
        isLongPress = false;
    }

    function startCategoryLongPress(btn, category) {
        isCategoryLongPress = false;
        clearTimeout(categoryLongPressTimer);
        categoryLongPressTimer = setTimeout(() => {
            isCategoryLongPress = true;
            if (category === 'recent') {
                clearRecents();
            }
        }, 800);
    }

    function endCategoryLongPress(btn, category) {
        clearTimeout(categoryLongPressTimer);
        if (!isCategoryLongPress) {

            if (!category) return;
            searchInput.value = '';
            suggestionsContainer.style.display = 'none';
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            displayByCategory(category);
        }
        isCategoryLongPress = false;
    }

    function showSkinTonePopover(btn, emojiItem) {
        currentEmojiData = emojiItem;
        skinToneOptions.innerHTML = '';

        (emojiItem.skinTones || []).forEach((tone, index) => {
            const option = document.createElement('button');
            option.className = 'skin-tone-option';
            option.textContent = tone;
            option.title = (emojiItem.skinToneLabels && emojiItem.skinToneLabels[index]) || '';

            option.addEventListener('click', () => {
                safeCopyToClipboard(tone)
                    .then(() => {
                        pushRecent(tone);
                        showCopiedFeedback(tone);
                    })
                    .catch(() => { });
                hideSkinTonePopover();
            });

            skinToneOptions.appendChild(option);
        });

        const rect = btn.getBoundingClientRect();
        const container = document.querySelector('.emoji-content');
        const picker = document.querySelector('.emoji-picker');

        if (!container || !picker) {
            skinTonePopover.style.left = `${rect.left + rect.width / 2}px`;
            let top = rect.top - 48 - 8;
            if (top < 8) top = rect.bottom + 8;
            skinTonePopover.style.top = `${top}px`;
            skinTonePopover.classList.add('visible');
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const pickerRect = picker.getBoundingClientRect();

        const numTones = emojiItem.skinTones.length;
        const popoverWidth = (numTones * 36) + ((numTones - 1) * 4) + 8;
        const popoverHeight = 44;

        let left = rect.left - pickerRect.left + (rect.width / 2) - (popoverWidth / 2);
        let top = rect.top - pickerRect.top - popoverHeight - 8;

        const minLeft = 8;
        const maxLeft = pickerRect.width - popoverWidth - 8;

        if (left < minLeft) {
            left = minLeft;
        } else if (left > maxLeft) {
            left = maxLeft;
        }

        const spaceAbove = rect.top - pickerRect.top;
        const spaceBelow = pickerRect.bottom - rect.bottom;

        if (spaceAbove < popoverHeight + 16) {
            top = rect.bottom - pickerRect.top + 8;

            if (top + popoverHeight > pickerRect.height - 8) {
                const spaceRight = pickerRect.right - rect.right;
                const spaceLeft = rect.left - pickerRect.left;

                if (spaceRight > popoverWidth + 16) {
                    left = rect.right - pickerRect.left + 8;
                    top = rect.top - pickerRect.top + (rect.height / 2) - (popoverHeight / 2);
                } else if (spaceLeft > popoverWidth + 16) {
                    left = rect.left - pickerRect.left - popoverWidth - 8;
                    top = rect.top - pickerRect.top + (rect.height / 2) - (popoverHeight / 2);
                } else {
                    top = Math.max(8, rect.top - pickerRect.top - popoverHeight - 8);
                }
            }
        }

        skinTonePopover.style.left = `${left}px`;
        skinTonePopover.style.top = `${top}px`;

        skinTonePopover.classList.add('visible');
    }

    function hideSkinTonePopover() {
        skinTonePopover.classList.remove('visible');
        currentEmojiData = null;
    }


    function calculateEditDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    function calculateSimilarity(s1, s2) {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        if (longer.includes(shorter)) return 0.9;
        const distance = calculateEditDistance(s1, s2);
        return 1 - (distance / Math.max(s1.length, s2.length));
    }

    function searchEmojis(query, limit = 10) {
        if (!query || !query.trim()) return [];
        const normalizedQuery = query.toLowerCase().trim();
        const queryTerms = normalizedQuery.split(/\s+/);

        const scored = searchIndex.map(emoji => {
            let score = 0;
            let matched = [];
            for (const term of queryTerms) {
                if (!term) continue;

                if ((emoji.annotation || '').toLowerCase().includes(term)) {
                    score += 10;
                    matched.push(term);
                    continue;
                }
                if ((emoji.tags || '').toLowerCase().includes(term)) {
                    score += 8;
                    matched.push(term);
                    continue;
                }
                if (((emoji.group || '') + ' ' + (emoji.subgroup || '')).toLowerCase().includes(term)) {
                    score += 5;
                    matched.push(term);
                    continue;
                }

                for (const token of emoji.tokens) {
                    if (token.startsWith(term)) {
                        score += 6;
                        matched.push(term);
                        break;
                    }
                    if (term.length > 1 && calculateSimilarity(term, token) > 0.7) {
                        score += 4;
                        matched.push(term);
                        break;
                    }
                }
            }
            return { emoji, score, matchedTerms: Array.from(new Set(matched)) };
        });

        return scored
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }


    function showSuggestions(query) {
        suggestionsContainer.innerHTML = '';
        if (!query || query.trim().length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const results = searchEmojis(query, 4);
        if (!results || results.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <div class="suggestion-emoji">${result.emoji.emoji}</div>
                <div class="suggestion-text">
                    <div class="suggestion-name">${result.emoji.annotation}</div>
                    <div class="suggestion-tags">${(result.emoji.tags || '').split(',').slice(0, 3).join(',')}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                searchInput.value = result.emoji.annotation;
                performSearch(result.emoji.annotation);
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(item);
        });

        suggestionsContainer.style.display = 'block';
    }

    function buildEmojiButton(emojiItem) {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        if (emojiItem.skinTones && emojiItem.skinTones.length > 1) btn.classList.add('has-skin-tones');
        btn.textContent = emojiItem.emoji;
        btn.title = emojiItem.annotation || '';

        btn.addEventListener('mousedown', (e) => startLongPress(btn, emojiItem, e));
        btn.addEventListener('mouseup', () => endLongPress(emojiItem));
        btn.addEventListener('mouseleave', () => {
            clearTimeout(longPressTimer);
            isLongPress = false;
        });

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startLongPress(btn, emojiItem, e);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            endLongPress(emojiItem);
        });

        btn.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
            isLongPress = false;
        });

        return btn;
    }

    function displayByCategory(category) {
        emojiContent.innerHTML = '';

        let filtered = [];
        if (category === 'recent') {
            const recents = getRecents();
            if (recents.length === 0) {
                emojiContent.innerHTML = '<div class="no-results">No recently used emojis</div>';
                return;
            }
            filtered = recents.map(ch => searchIndex.find(e => e.emoji === ch)).filter(Boolean);
        } else {
            filtered = searchIndex.filter(e => (e.group || '') === category);
        }

        if (!filtered || filtered.length === 0) {
            emojiContent.innerHTML = '<div class="no-results">No emojis in this category</div>';
            return;
        }

        const section = document.createElement('div');
        section.className = 'emoji-section';

        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = (category || '').toUpperCase();

        const grid = document.createElement('div');
        grid.className = 'emoji-grid';

        filtered.forEach(item => grid.appendChild(buildEmojiButton(item)));

        section.appendChild(title);
        section.appendChild(grid);
        emojiContent.appendChild(section);
    }

    function displaySearchResults(results) {
        emojiContent.innerHTML = '';

        if (!results || results.length === 0) {
            emojiContent.innerHTML = '<div class="no-results">No emojis found. Try different search terms.</div>';
            return;
        }

        const section = document.createElement('div');
        section.className = 'emoji-section';

        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = `SEARCH RESULTS (${results.length})`;

        const grid = document.createElement('div');
        grid.className = 'emoji-grid';

        results.forEach(result => {
            const item = result.emoji || result;
            grid.appendChild(buildEmojiButton(item));
        });

        section.appendChild(title);
        section.appendChild(grid);
        emojiContent.appendChild(section);
    }

    function performSearch(query) {
        if (!query || !query.trim()) {
            displayByCategory('smileys and people');
            return;
        }
        const results = searchEmojis(query, 48);
        displaySearchResults(results);
    }


    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value;
            showSuggestions(q);
            performSearch(q);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value && suggestionsContainer.children.length > 0) {
                suggestionsContainer.style.display = 'block';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
        if (!skinTonePopover.contains(e.target) && !e.target.classList.contains('emoji-btn')) {
            hideSkinTonePopover();
        }
    });

    document.querySelectorAll('.cat-btn').forEach(btn => {
        const category = btn.dataset.category;


        btn.addEventListener('mousedown', (e) => {
            startCategoryLongPress(btn, category);
        });

        btn.addEventListener('mouseup', (e) => {
            endCategoryLongPress(btn, category);
        });

        btn.addEventListener('mouseleave', () => {
            clearTimeout(categoryLongPressTimer);
            isCategoryLongPress = false;
        });


        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startCategoryLongPress(btn, category);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            endCategoryLongPress(btn, category);
        });

        btn.addEventListener('touchcancel', () => {
            clearTimeout(categoryLongPressTimer);
            isCategoryLongPress = false;
        });
    });

    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            try { window.close(); } catch (e) { }
        });
    }

    const minimizeBtn = document.querySelector('.minimize-btn');
    const electronAPI = /** @type {any} */ (window).electronAPI;
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            try { electronAPI?.minimize?.(); } catch (e) { }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (skinTonePopover.classList.contains('visible')) {
                hideSkinTonePopover();
            } else {
                try { window.close(); } catch (err) { }
            }
        }
    });

    window.addEventListener('resize', hideSkinTonePopover);
    window.addEventListener('scroll', hideSkinTonePopover, true);


    displayByCategory('smileys and people');
});
