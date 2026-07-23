// ═══════════════════════════════════════════════════════════
//  EPISODES DRAWER  —  script2.js
//  Depends on: drawer.js (initDrawer already called in HTML)
//              window.TMDB_ID, window.TMDB_SEASON, window.TMDB_EPISODE,
//              window.TMDB_API_KEY, window.IS_TV
// ═══════════════════════════════════════════════════════════

(function () {
    // ── State ───────────────────────────────────────────────
    let _seasons = [];
    let _episodesCache = {};      // { seasonNumber: [...episodes] }
    let _selectedSeason = null;
    let _currentSeason = null;
    let _currentEpisode = null;
    let _drawerReady = false;
    let _isFetching = false;

    const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';
    const TMDB_BASE = 'https://api.themoviedb.org/3';

    // ── DOM refs (populated after DOMContentLoaded) ──────────
    let episodesBtn, drawerContainer, bodyContent,
        seasonSelectorWrap, episodeListEl, drawerLoading;

    // ── Helpers ──────────────────────────────────────────────
    function tmdbKey() { return window.TMDB_API_KEY || ''; }
    function pad(n) { return String(n).padStart(2, '0'); }
    function fmtRuntime(mins) {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    function resumeKeyForEpisode(season, episode) {
        return `resume_tv_${window.TMDB_ID}_${season}_${episode}`;
    }

    function getEpisodeWatchPercent(ep, season, isCurrent) {
        if (isCurrent || !window.TMDB_ID) return 0;

        const watchedSeconds = Number(localStorage.getItem(resumeKeyForEpisode(season, ep.episode_number)));
        const durationSeconds = Number(ep.runtime || 0) * 60;

        const isPastEpisode = season < _currentSeason
            || (season === _currentSeason && ep.episode_number < _currentEpisode);
        if (isPastEpisode && (!Number.isFinite(watchedSeconds) || watchedSeconds <= 5)) return 100;

        if (!Number.isFinite(watchedSeconds) || watchedSeconds <= 5) return 0;
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return isPastEpisode ? 100 : 0;

        return Math.min(Math.max((watchedSeconds / durationSeconds) * 100, 1), 100);
    }

    async function fetchSeasons() {
        const res = await fetch(`${TMDB_BASE}/tv/${window.TMDB_ID}?api_key=${tmdbKey()}`);
        if (!res.ok) throw new Error('TMDB show fetch failed');
        const data = await res.json();
        if (String(window.TMDB_ID) === '95479') {
            return [
                { season_number: 1, name: 'Season 1' },
                { season_number: 2, name: 'Season 2' },
                { season_number: 3, name: 'Season 3' }
            ];
        }
        // Filter out specials (season 0) unless that's the only option
        const seasons = (data.seasons || []).filter(s => s.season_number > 0);
        return seasons;
    }

    async function fetchEpisodes(seasonNum) {
        if (_episodesCache[seasonNum]) return _episodesCache[seasonNum];
        let fetchSeason = seasonNum;
        if (String(window.TMDB_ID) === '95479') {
            fetchSeason = 1;
        }
        const res = await fetch(
            `${TMDB_BASE}/tv/${window.TMDB_ID}/season/${fetchSeason}?api_key=${tmdbKey()}`
        );
        if (!res.ok) throw new Error('TMDB season fetch failed');
        const data = await res.json();
        let eps = data.episodes || [];
        if (String(window.TMDB_ID) === '95479') {
            if (seasonNum === 1) {
                eps = eps.slice(0, 24);
            } else if (seasonNum === 2) {
                eps = eps.slice(24, 47).map(ep => ({ ...ep, episode_number: ep.episode_number - 24 }));
            } else if (seasonNum === 3) {
                eps = eps.slice(47, 59).map(ep => ({ ...ep, episode_number: ep.episode_number - 47 }));
            }
        }
        _episodesCache[seasonNum] = eps;
        return _episodesCache[seasonNum];
    }

    // ── Build season selector (dyn-item style) ────────────────
    function buildSeasonSelector(seasons, activeSeason) {
        const wrap = document.getElementById('ep-season-wrap');
        const btn = document.getElementById('ep-season-btn');
        const title = document.getElementById('ep-season-title');
        const menu = document.getElementById('ep-season-menu');
        const mainTitleText = document.getElementById('ep-drawer-main-title');
        if (!wrap || !btn || !menu) return;

        const active = seasons.find(s => s.season_number === activeSeason) || seasons[0];
        if (title) title.textContent = active ? `Season ${active.season_number}` : 'Season';
        
        // Dynamically update only the text next to the icon
        if (mainTitleText && active) {
            mainTitleText.textContent = `S${active.season_number}: ${active.name || 'Season ' + active.season_number}`;
        }

        menu.innerHTML = '';
        seasons.forEach(s => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'dyn-item ep-season-item' + (s.season_number === activeSeason ? ' active' : '');
            item.dataset.season = s.season_number;
            item.innerHTML = `
        Season ${s.season_number}
        <span class="dyn-check"><i data-feather="check"></i></span>`;
            item.addEventListener('click', () => {
                selectSeason(s.season_number);
                toggleSeasonMenu(false);
            });
            menu.appendChild(item);
        });

        if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14 });
    }

    function toggleSeasonMenu(forceState) {
        const wrap = document.getElementById('ep-season-wrap');
        if (!wrap) return;
        const isOpen = typeof forceState === 'boolean' ? forceState : !wrap.classList.contains('open');
        wrap.classList.toggle('open', isOpen);
    }

    // ── Build episode list ────────────────────────────────────
    function buildEpisodeList(episodes, currentEpNum) {
        if (!episodeListEl) return;
        episodeListEl.innerHTML = '';

        episodes.forEach((ep, idx) => {
            const isCurrent = ep.episode_number === currentEpNum && _selectedSeason === _currentSeason;
            const thumb = ep.still_path
                ? `${TMDB_IMG}${ep.still_path}`
                : null;
            const runtime = fmtRuntime(ep.runtime);
            const watchedPercent = getEpisodeWatchPercent(ep, _selectedSeason, isCurrent);
            const item = document.createElement('div');
            item.className = 'ep-item' + (isCurrent ? ' ep-item--current' : '');
            item.dataset.ep = ep.episode_number;
            item.dataset.season = _selectedSeason;
            item.style.animationDelay = `${idx * 30}ms`;

            item.innerHTML = `
        <div class="ep-thumb-wrap">
          ${thumb
                    ? `<img class="ep-thumb" src="${thumb}" alt="" loading="lazy" />`
                    : `<div class="ep-thumb ep-thumb--placeholder"><span class="material-symbols-rounded" style="font-size:22px;opacity:.35;">image_not_supported</span></div>`
                }
          ${isCurrent ? `
          <div class="ep-current-overlay">
            <div class="ep-wave-icon">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>` : ''}
          ${watchedPercent ? `
          <div class="ep-watch-progress" aria-hidden="true">
            <div class="ep-watch-progress-fill" style="--progress-width: ${watchedPercent.toFixed(2)}%; width: calc(${watchedPercent.toFixed(2)}% - 12px);"></div>
          </div>` : ''}
        </div>
        <div class="ep-info">
          <div class="ep-meta">
            <span class="ep-number">E${pad(ep.episode_number)}</span>
            ${runtime ? `<span class="ep-runtime">${runtime}</span>` : ''}
            ${isCurrent ? `<span class="ep-watching-badge">Watching</span>` : ''}
          </div>
          <div class="ep-title">${ep.name || `Episode ${ep.episode_number}`}</div>
          ${ep.overview ? `<div class="ep-desc">${ep.overview}</div>` : ''}
        </div>`;

            item.addEventListener('click', () => navigateToEpisode(_selectedSeason, ep.episode_number));
            episodeListEl.appendChild(item);
        });

        // Scroll current ep into view
        requestAnimationFrame(() => {
            const currentItem = episodeListEl.querySelector('.ep-item--current');
            if (currentItem) {
                currentItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });
    }

    // ── Season selection ──────────────────────────────────────
    async function selectSeason(seasonNum) {
        _selectedSeason = seasonNum;
        // Update season button label
        const title = document.getElementById('ep-season-title');
        if (title) title.textContent = `Season ${seasonNum}`;
        // Update active state on menu items
        document.querySelectorAll('.ep-season-item').forEach(el => {
            el.classList.toggle('active', Number(el.dataset.season) === seasonNum);
        });

        // Update the main drawer title to match the selected season
        const mainTitleText = document.getElementById('ep-drawer-main-title');
        if (mainTitleText) {
            const activeSeasonObj = _seasons.find(s => s.season_number === seasonNum);
            const seasonName = activeSeasonObj ? (activeSeasonObj.name || `Season ${seasonNum}`) : `Season ${seasonNum}`;
            mainTitleText.textContent = `S${seasonNum}: ${seasonName}`;
        }

        showEpisodeLoading(true);
        try {
            const episodes = await fetchEpisodes(seasonNum);
            buildEpisodeList(episodes, _currentEpisode);
        } catch (e) {
            console.error('Failed to load episodes:', e);
            showEpisodeError();
        } finally {
            showEpisodeLoading(false);
        }
    }

    function showEpisodeLoading(on) {
        if (!episodeListEl) return;
        if (on) {
            episodeListEl.innerHTML = `
        <div class="ep-loading">
          <div class="ep-loading-spinner"></div>
          <span>Loading episodes…</span>
        </div>`;
        }
    }

    function showEpisodeError() {
        if (!episodeListEl) return;
        episodeListEl.innerHTML = `
      <div class="ep-error">
        <span class="material-symbols-rounded" style="font-size:32px;opacity:.4;">error_outline</span>
        <span>Failed to load episodes</span>
      </div>`;
    }

    // ── Navigate to episode ───────────────────────────────────
    function navigateToEpisode(season, episode) {
        const url = new URL(window.location.href);
        url.searchParams.set('s', season);
        url.searchParams.set('e', episode);
        // Close drawer first, then navigate
        if (typeof window.closeDrawer === 'function') window.closeDrawer();
        setTimeout(() => { window.location.href = url.toString(); }, 300);
    }

    // ── Open drawer with episodes ─────────────────────────────
    async function openEpisodesDrawer() {
        if (!window.IS_TV) return;
        if (_isFetching) return;

        _currentSeason = Number(window.TMDB_SEASON) || 1;
        _currentEpisode = Number(window.TMDB_EPISODE) || 1;
        _selectedSeason = _currentSeason;

        // Open drawer immediately (shows loading state)
        if (typeof window.openDrawer === 'function') window.openDrawer();

        if (_isFetching) return;
        _isFetching = true;

        showEpisodeLoading(true);

        try {
            if (!_seasons.length) {
                _seasons = await fetchSeasons();
            }
            buildSeasonSelector(_seasons, _currentSeason);
            if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14 });

            const episodes = await fetchEpisodes(_currentSeason);
            buildEpisodeList(episodes, _currentEpisode);
        } catch (e) {
            console.error('Episodes drawer error:', e);
            showEpisodeError();
        } finally {
            _isFetching = false;
        }
    }

    function injectDrawerHTML() {
        // 1. Check if #app-wrapper already exists. If not, create it dynamically!
        let appWrapper = document.getElementById('app-wrapper');
        if (!appWrapper) {
            appWrapper = document.createElement('div');
            appWrapper.id = 'app-wrapper';

            // Move all existing body elements into the new wrapper (except script tags)
            while (document.body.firstChild) {
                const child = document.body.firstChild;
                if (child.tagName === 'SCRIPT') {
                    // Leave scripts at the body root so they don't break/re-execute
                    break;
                }
                appWrapper.appendChild(child);
            }
            document.body.appendChild(appWrapper);
        }

        // 2. Create the drawer container exactly as you had it
        const drawerEl = document.createElement('div');
        drawerEl.className = 'drawer-container';
        drawerEl.id = 'drawerContainer';
        drawerEl.innerHTML = `
      <div class="backdrop" id="backdrop"></div>
      <div class="drawer-content" id="drawerContent">
        <div class="handle-area" id="handleArea">
          <div class="handle"></div>
        </div>
        <div class="body-content" id="bodyContent">
          <div class="ep-drawer-header">
            <div class="ep-drawer-title">
              <i data-lucide="library" class="ep-drawer-title-icon"></i>
              <span id="ep-drawer-main-title">Episodes</span>
            </div>
            <div class="dyn-menu-wrap" id="ep-season-wrap">
              <button type="button" class="dyn-dropdown ep-season-dropdown" id="ep-season-btn"
                      onclick="document.getElementById('ep-season-wrap').classList.toggle('open')">
                <span id="ep-season-title">Season</span>
                <span class="dyn-chevron"><i data-feather="chevron-down"></i></span>
              </button>
              <div class="dyn-menu ep-season-menu" id="ep-season-menu"></div>
            </div>
          </div>
          <div class="ep-list" id="ep-list"></div>
        </div>
      </div>`;

        // The drawer container sits OUTSIDE the app-wrapper at the body root
        document.body.appendChild(drawerEl);
        lucide.createIcons();

        episodeListEl = document.getElementById('ep-list');
        bodyContent = document.getElementById('bodyContent');

        // Re-init drawer.js now that the DOM is ready
        if (typeof initDrawer === 'function') initDrawer();
        if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14 });

        // Close season menu on outside click
        document.addEventListener('click', e => {
            const wrap = document.getElementById('ep-season-wrap');
            if (wrap && !wrap.contains(e.target)) wrap.classList.remove('remove');
        });
    }

    // ── Inject Episodes button into player controls ───────────
    function injectEpisodesButton() {
        const rightGroup = document.querySelector('.right-group');
        if (!rightGroup) return;

        const btn = document.createElement('button');
        btn.className = 'btn ep-episodes-btn';
        btn.id = 'episodesBtn';
        btn.setAttribute('aria-label', 'Episodes');
        btn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:22px;">select_window_2</span>`;

        // Insert before the settings-wrap
        const settingsWrap = rightGroup.querySelector('.settings-wrap');
        if (settingsWrap) {
            rightGroup.insertBefore(btn, settingsWrap);
        } else {
            rightGroup.prepend(btn);
        }

        btn.addEventListener('click', e => {
            e.stopPropagation();
            openEpisodesDrawer();
            if (document.exitFullscreen) document.exitFullscreen();
        });

        episodesBtn = btn;
    }

    // ── Hide button for non-TV content ────────────────────────
    function syncEpisodesButton() {
        if (!episodesBtn) return;
        episodesBtn.style.display = window.IS_TV ? '' : 'none';
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        injectDrawerHTML();
        injectEpisodesButton();
        syncEpisodesButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
