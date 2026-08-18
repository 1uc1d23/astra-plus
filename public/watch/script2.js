(function () {
    'use strict';

    /* ─── Constants ──────────────────────────────────────────────── */
    const TMDB_IMG = 'https://image.tmdb.org/t/p/';
    const FADE_MS = 600;

    // Messages shown while connecting.
    const CONNECTING_MESSAGES = [
        'Connecting servers',
        'Discovering streams',
        'Negotiating connection',
        'Calibrating video',
        'Almost there',
    ];

    /* ─── State ───────────────────────────────────────────────────── */
    let overlayEl = null;
    let statusListEl = null;
    let statusMsgEl = null;
    let serverEls = [];
    let metadata = null;
    let connectingMessageTimer = null;
    let connectingMessageIndex = 0;

    /* ─── Helpers ────────────────────────────────────────────────── */

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    /** Convert total minutes → "Xh Ym" or "Ym" */
    function fmtRuntime(mins) {
        if (!mins || mins <= 0) return null;

        const h = Math.floor(mins / 60);
        const m = mins % 60;

        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    }

    /** Safely inject raw HTML into a container */
    function setHTML(el, html) {
        el.innerHTML = html;
    }

    /* ── Feather Icons configuration wrapper ── */
    const ICONS = {
        calendar: `<i data-feather="calendar"></i>`,
        clock: `<i data-feather="clock"></i>`,
        tv: `<i data-feather="tv"></i>`,
        check: `<i data-feather="check"></i>`,
        x: `<i data-feather="x"></i>`,
        xBig: `<i data-feather="x" style="width: 52px; height: 52px; stroke: #e05252; stroke-width: 1.8;"></i>`,
    };

    /* ─── Connecting message rotation ───────────────────────────── */

    function stopConnectingMessages() {
        if (connectingMessageTimer) {
            clearInterval(connectingMessageTimer);
            connectingMessageTimer = null;
        }
    }

    function startConnectingMessages() {
        stopConnectingMessages();

        if (!statusMsgEl) return;

        connectingMessageIndex = 0;

        statusMsgEl.classList.remove('ls-hidden');
        statusMsgEl.classList.add('ls-visible');

        statusMsgEl.innerHTML =
            `${CONNECTING_MESSAGES[0]} <span class="ls-spinner" style="margin-left: 6px;"></span>`;

        connectingMessageTimer = setInterval(() => {
            if (!statusMsgEl) return;

            connectingMessageIndex =
                (connectingMessageIndex + 1) % CONNECTING_MESSAGES.length;

            statusMsgEl.innerHTML =
                `${CONNECTING_MESSAGES[connectingMessageIndex]} <span class="ls-spinner" style="margin-left: 6px;"></span>`;
        }, 2000);
    }

    /* ─── DOM build ──────────────────────────────────────────────── */

    function buildOverlay() {
        if (document.getElementById('ls-overlay')) return;

        const servers = window.SERVERS || [
            { name: 'Alpha' },
            { name: 'Bravo' },
            { name: 'Charlie' },
            { name: 'Delta' },
            { name: 'Echo' },
        ];

        const rowsHTML = servers.map((s, i) => `
            <div class="ls-server-row" id="ls-row-${i}" data-index="${i}">
                <div class="ls-row-text">
                    <span id="ls-text-${i}">Trying ${s.name.trim()}</span>
                </div>
                <span class="ls-row-icon" id="ls-icon-${i}"></span>
            </div>
        `).join('');

        const html = `
            <div id="ls-overlay">
                <div id="ls-backdrop"></div>

                <div id="ls-content">

                    <!-- Error icon -->
                    <div id="ls-error-icon">${ICONS.xBig}</div>
                    <div id="ls-error-heading">Media Unavailable</div>
                    <div id="ls-error-sub">No streams found.</div>

                    <!-- Media logo / title -->
                    <img id="ls-logo" alt="" />
                    <div id="ls-title-text"></div>

                    <!-- Metadata tags -->
                    <div id="ls-tags"></div>

                    <!-- Status panel card -->
                    <div id="ls-status-panel">

                        <div id="ls-status-msg">
                            Connecting. This may take a moment
                            <span class="ls-spinner" style="margin-left: 6px;"></span>
                        </div>

                        <div id="ls-status-list">
                            ${rowsHTML}
                        </div>

                    </div>
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        document.body.appendChild(wrapper.firstElementChild);

        overlayEl = document.getElementById('ls-overlay');
        statusListEl = document.getElementById('ls-status-list');
        statusMsgEl = document.getElementById('ls-status-msg');

        const statusPanelEl = document.getElementById('ls-status-panel');

        statusMsgEl.classList.add('ls-visible');
        statusListEl.classList.add('ls-hidden');

        if (statusPanelEl) {
            statusPanelEl.classList.add('ls-visible');
        }

        serverEls = (window.SERVERS || servers).map((_, i) => ({
            row: document.getElementById(`ls-row-${i}`),
            icon: document.getElementById(`ls-icon-${i}`),
            label: document.getElementById(`ls-text-${i}`),
            name: (window.SERVERS || servers)[i].name
        }));
    }

    /* ─── TMDB fetch ─────────────────────────────────────────────── */

    async function fetchMetadata() {
        const id = window.TMDB_ID;
        const key = window.TMDB_API_KEY;

        if (!id || !key) return null;

        try {
            if (window.IS_TV) {
                const [showRes, imgRes] = await Promise.all([
                    fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${key}`),
                    fetch(`https://api.themoviedb.org/3/tv/${id}/images?api_key=${key}&include_image_language=en,null`),
                ]);

                const show = await showRes.json();
                const imgs = await imgRes.json();

                const episodeRuntime =
                    show.episode_run_time?.[0] || null;

                return {
                    title: show.name || show.original_name || '',
                    year: show.first_air_date
                        ? show.first_air_date.slice(0, 4)
                        : '',
                    runtime: episodeRuntime,
                    backdrop: show.backdrop_path
                        ? `${TMDB_IMG}w1280${show.backdrop_path}`
                        : '',
                    logo: imgs?.logos?.[0]?.file_path
                        ? `${TMDB_IMG}original${imgs.logos[0].file_path}`
                        : '',
                    isTv: true,
                    season: window.TMDB_SEASON,
                    episode: window.TMDB_EPISODE,
                };
            }

            const [movieRes, imgRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}`),
                fetch(`https://api.themoviedb.org/3/movie/${id}/images?api_key=${key}&include_image_language=en,null`),
            ]);

            const movie = await movieRes.json();
            const imgs = await imgRes.json();

            return {
                title: movie.title || movie.original_title || '',
                year: movie.release_date
                    ? movie.release_date.slice(0, 4)
                    : '',
                runtime: movie.runtime || null,
                backdrop: movie.backdrop_path
                    ? `${TMDB_IMG}w1280${movie.backdrop_path}`
                    : '',
                logo: imgs?.logos?.[0]?.file_path
                    ? `${TMDB_IMG}original${imgs.logos[0].file_path}`
                    : '',
                isTv: false,
            };

        } catch (err) {
            console.warn('[LaunchScreen] TMDB fetch failed:', err);
            return null;
        }
    }

    /* ─── Populate overlay with metadata ────────────────────────── */

    function showStatusMsg(text) {
        if (!statusMsgEl) return;

        statusMsgEl.textContent = text;
        statusMsgEl.classList.remove('ls-hidden');
        statusMsgEl.classList.add('ls-visible');
    }

    function applyMetadata(data) {
        if (!data) return;

        metadata = data;

        // Backdrop
        const backdropEl = document.getElementById('ls-backdrop');

        if (data.backdrop) {
            const img = new Image();

            img.onload = () => {
                backdropEl.style.backgroundImage =
                    `url('${data.backdrop}')`;

                backdropEl.classList.add('ls-loaded');
            };

            img.src = data.backdrop;
        }

        // Logo or title text
        const logoEl = document.getElementById('ls-logo');
        const titleTextEl = document.getElementById('ls-title-text');

        if (data.logo) {
            logoEl.src = data.logo;

            logoEl.onload = () => {
                logoEl.classList.add('ls-visible');
            };

            logoEl.onerror = () => {
                logoEl.classList.add('ls-hidden');
                titleTextEl.textContent = data.title;
                titleTextEl.classList.add('ls-show', 'ls-visible');
            };
        } else {
            logoEl.classList.add('ls-hidden');
            titleTextEl.textContent = data.title;
            titleTextEl.classList.add('ls-show', 'ls-visible');
        }

        // Tags
        const tagsEl = document.getElementById('ls-tags');
        const tagParts = [];

        if (data.year) {
            tagParts.push(`
                <span class="ls-tag">
                    ${ICONS.calendar}
                    <span>${data.year}</span>
                </span>
            `);
        }

        const rt = fmtRuntime(data.runtime);

        if (rt) {
            if (tagParts.length) {
                tagParts.push('<span class="ls-tag-dot"></span>');
            }

            tagParts.push(`
                <span class="ls-tag">
                    ${ICONS.clock}
                    <span>${rt}</span>
                </span>
            `);
        }

        if (data.isTv && data.season && data.episode) {
            if (tagParts.length) {
                tagParts.push('<span class="ls-tag-dot"></span>');
            }

            tagParts.push(`
                <span class="ls-tag">
                    ${ICONS.tv}
                    <span>S${data.season} E${data.episode}</span>
                </span>
            `);
        }

        if (tagParts.length) {
            setHTML(tagsEl, tagParts.join(''));

            if (window.feather) {
                window.feather.replace();
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    tagsEl.classList.add('ls-visible');
                });
            });
        } else {
            tagsEl.classList.add('ls-hidden');
        }
    }

    /* ─── Server status helpers ──────────────────────────────────── */

    function setServerSpinner(index) {
        stopConnectingMessages();

        if (statusMsgEl) {
            statusMsgEl.classList.remove('ls-visible');
            statusMsgEl.classList.add('ls-hidden');
        }

        statusListEl.classList.remove('ls-hidden');

        const el = serverEls[index];

        if (!el) return;

        el.label.textContent = `Trying ${el.name}`;
        el.row.classList.add('ls-active');
        el.row.classList.remove('ls-done', 'ls-fail');
        el.icon.innerHTML = `<span class="ls-spinner"></span>`;
    }

    function setServerOk(index) {
        const el = serverEls[index];

        if (!el) return;

        el.label.textContent = `${el.name} Connected`;

        el.row.classList.remove('ls-active', 'ls-fail');
        el.row.classList.add('ls-done');

        el.icon.innerHTML = `
            <span class="ls-icon-ok">
                ${ICONS.check}
            </span>
        `;

        if (window.feather) {
            window.feather.replace();
        }
    }

    function setServerFail(index) {
        const el = serverEls[index];

        if (!el) return;

        el.label.textContent = `${el.name} Failed`;

        el.row.classList.remove('ls-active', 'ls-done');
        el.row.classList.add('ls-fail');

        el.icon.innerHTML = `
            <span class="ls-icon-fail">
                ${ICONS.x}
            </span>
        `;

        if (window.feather) {
            window.feather.replace();
        }
    }

    /* ─── Public API ─────────────────────────────────────────────── */

    const LaunchScreen = {

        /** Call once before tryServers() begins. */
        async init() {
            buildOverlay();

            const data = await fetchMetadata();
            applyMetadata(data);

            if (window.feather) {
                window.feather.replace();
            }

            // Start rotating messages after the overlay is ready.
            startConnectingMessages();
        },

        /** Call when the player begins attempting server at index `n`. */
        onServerTry(n) {
            setServerSpinner(n);
        },

        /** Call when server at index `n` definitively fails. */
        onServerFail(n) {
            setServerFail(n);
        },

        /** Call when a server succeeds. */
        onSuccess(serverName) {
            stopConnectingMessages();

            // Mark the currently active server as connected.
            serverEls.forEach((el, i) => {
                if (el.row.classList.contains('ls-active')) {
                    setServerOk(i);
                }
            });

            // Hide the server list.
            statusListEl.classList.add('ls-hidden');

            // Show a green Connected state instead of "Fetching stream..."
            if (statusMsgEl) {
                statusMsgEl.classList.remove('ls-hidden');
                statusMsgEl.classList.add('ls-visible');

                statusMsgEl.innerHTML = `
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        gap: 7px;
                        color: #46ca76d2;
                    ">
                        <span style="width: 15px; height: 15px; display: inline-flex; align-items: center; justify-content: center;">
                            ${ICONS.check}
                        </span>
                        Connected${serverName ? ` to ${serverName}` : ''}
                    </span>
                `;

                if (window.feather) {
                    window.feather.replace();
                }
            }
        },

        /** Call when video actually begins rendering active frames. */
        onPlaybackStart() {
            stopConnectingMessages();

            if (!overlayEl || overlayEl.classList.contains('ls-fade-out')) {
                return;
            }

            overlayEl.classList.add('ls-fade-out');

            setTimeout(() => {
                overlayEl?.remove();
            }, FADE_MS);
        },

        /** Call when every server has failed. */
        onAllFailed() {
            stopConnectingMessages();

            if (!overlayEl) return;

            // IMPORTANT:
            // Hide "Connecting. This may take a moment" completely.
            if (statusMsgEl) {
                statusMsgEl.classList.remove('ls-visible');
                statusMsgEl.classList.add('ls-hidden');
            }

            // Also hide the server list so only the Media Unavailable
            // state remains visible.
            if (statusListEl) {
                statusListEl.classList.add('ls-hidden');
            }

            overlayEl.classList.add('ls-error');
        },
    };

    window.LaunchScreen = LaunchScreen;

})();