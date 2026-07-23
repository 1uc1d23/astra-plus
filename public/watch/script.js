const params = new URLSearchParams(window.location.search);
window.TMDB_ID = params.get('id');
window.TMDB_SEASON = params.get('s');
window.TMDB_EPISODE = params.get('e');
window.IS_TV = Boolean(window.TMDB_ID && window.TMDB_SEASON && window.TMDB_EPISODE);

window.TMDB_API_KEY = 'ea021b3b0775c8531592713ab727f254';
window.NETFLIX_MODE = '1';
window.MEDIA_INFO = { title: '', subtitle: '', description: '', logo: '' };

(function () {
    const video = document.getElementById('video');
    const playerWrap = document.getElementById('playerWrap');
    const playPause = document.getElementById('playPause');
    const playIcon = document.getElementById('playIcon');
    const pipBtn = document.getElementById('pipBtn');
    const fsBtn = document.getElementById('fsBtn');
    const fsIcon = document.getElementById('fsIcon');
    const toast = document.getElementById('toast');
    const speedToast = document.getElementById('1.5xSpeed');
    const volumeContainer = document.getElementById('volumeContainer');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    const channelOverlay = document.getElementById('channelOverlay');
    const channelName = document.getElementById('channelName');
    const channelSubtitle = document.getElementById('channelSubtitle');
    const spinner = document.getElementById('spinner');
    const controls = document.getElementById('controls');
    const shadowOverlay = document.getElementById('shadowOverlay');
    const subtitlesBtn = document.getElementById('subtitlesBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const speedOptions = document.getElementById('speedOptions');
    const qualityOptions = document.getElementById('qualityOptions');
    const serverOptions = document.getElementById('serverOptions');
    const serverValue = document.getElementById('serverValue');

    // Caption sync
    const captionSyncLinkElement = document.getElementById('captionSyncLink');
    const syncValueText = document.getElementById('captionSyncValue');
    const captionSyncSlider = document.getElementById('captionSync');
    const captionSyncContainer = document.getElementById('captionSyncContainer');
    const syncBtnLeft = document.getElementById('captionSyncLeft');
    const syncBtnRight = document.getElementById('captionSyncRight');

    const captionLanguageValue = document.getElementById('captionLanguageValue');
    const captionFontSize = document.getElementById('captionFontSize');
    const captionFontSizeValue = document.getElementById('captionFontSizeValue');
    const captionFontWeightValue = document.getElementById('captionFontWeightValue');
    const captionBgOpacity = document.getElementById('captionBgOpacity');
    const captionBgOpacityValue = document.getElementById('captionBgOpacityValue');
    const progressWrap = document.getElementById('progressWrap');
    const progressFill = document.getElementById('progressFill');
    const progressBuffer = document.getElementById('progressBuffer');
    const progressThumb = document.getElementById('progressThumb');
    const progressPreview = document.getElementById('progressPreview');
    const previewTime = document.getElementById('previewTime');
    const remainingTime = document.getElementById('remainingTime');
    const subtitleOverlay = document.getElementById('subtitleOverlay');
    const episodeActions = document.getElementById('episodeActions');
    const skipIntroBtn = document.getElementById('skipIntroBtn');
    const skipRecapBtn = document.getElementById('skipRecapBtn');
    const nextEpisodeBtn = document.getElementById('nextEpisodeBtn');
    const pulseIcon = document.getElementById('pulse-icon');
    const pulseSvg = document.getElementById('pulse-svg');

    let SERVERS = [];

    let hls = null;
    let hideTimer = null;
    let toastTimer = null;
    let pauseOverlayTimer = null;
    let isDraggingProgress = false;
    let dragSeekTime = 0;
    let settingsOpen = false;
    let captionsEnabled = false;
    let englishSubtitleTrack = null;
    const captionSyncKey = `captionSync_${window.TMDB_ID}_${window.TMDB_SEASON || 'movie'}_${window.TMDB_EPISODE || ''}`;
    let captionSyncDelay = Number(localStorage.getItem(captionSyncKey) || 0);
    let availableSubtitleTracks = [];
    let captionSettings = {
        languageUrl: '',
        fontSize: 24,
        fontWeight: 500,
        bgOpacity: 0,
        fontFamily: 'Geist',
        enabled: false
    };
    let currentServer = SERVERS[0];
    let serverOpen = false;
    let captionsyncOpen = false;
    let episodeMarkers = {
        intro: null,
        recap: null,
        credits: null
    };
    let episodeTitle

    const savedCaptionSettings = JSON.parse(localStorage.getItem('captionSettings') || 'null');
    if (savedCaptionSettings) {
        captionSettings = { ...captionSettings, ...savedCaptionSettings, enabled: false };
    }

    if (captionFontSize) captionFontSize.value = captionSettings.fontSize;
    if (captionBgOpacity) captionBgOpacity.value = captionSettings.bgOpacity;
    if (captionSyncSlider) {
        captionSyncSlider.value = captionSyncDelay;
    }
    if (syncValueText) {
        syncValueText.textContent = `${captionSyncDelay > 0 ? '+' : ''}${captionSyncDelay.toFixed(1)}s`;
    }

    // ─────────────────────────────────────────
    // SETTINGS PANEL — tab switching
    // ─────────────────────────────────────────
    const settingsTabs = document.getElementById('settingsTabs');
    const settingsPanels = document.querySelectorAll('.settings-panel');

    if (settingsTabs) {
        settingsTabs.addEventListener('click', function (e) {
            const tab = e.target.closest('.settings-tab');
            if (!tab) return;
            e.stopPropagation();
            const target = tab.dataset.tab;
            settingsTabs.querySelectorAll('.settings-tab').forEach(t =>
                t.classList.toggle('active', t === tab)
            );
            settingsPanels.forEach(p =>
                p.classList.toggle('active', p.id === 'panel-' + target)
            );
        });
    }

    // ─────────────────────────────────────────
    // SETTINGS OPEN / CLOSE
    // ─────────────────────────────────────────
    function openSettings(open) {
        if (typeof open === 'undefined') open = !settingsOpen;
        settingsOpen = open;
        settingsMenu.classList.toggle('open', settingsOpen);
        settingsMenu.setAttribute('aria-hidden', String(!settingsOpen));
        settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
        settingsBtn.classList.toggle('active', settingsOpen);
        if (settingsOpen) volumeContainer.classList.remove('open');
    }

    function closeSettings() {
        openSettings(false);
        document.querySelectorAll('.dyn-menu-wrap').forEach(w => w.classList.remove('open'));
    }

    // ─────────────────────────────────────────
    // TOAST
    // ─────────────────────────────────────────
    function showToast(msg, ms = 2000) {
        clearTimeout(toastTimer);
        toast.innerHTML = msg;
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
    }

    // ─────────────────────────────────────────
    // FORMAT TIME
    // ─────────────────────────────────────────
    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
        const total = Math.floor(seconds);
        const hrs = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    // ─────────────────────────────────────────
    // API URL HELPERS
    // ─────────────────────────────────────────
    function getApiUrl() {
        if (window.IS_TV) {
            return `https://stream-fetcher-worker.muhammadbilal3rd.workers.dev/?url=${encodeURIComponent(`https://streamdata.vaplayer.ru/api.php?tmdb=${window.TMDB_ID}&type=tv&season=${window.TMDB_SEASON}&episode=${window.TMDB_EPISODE}`)}`;
        }
        return `https://stream-fetcher-worker.muhammadbilal3rd.workers.dev/?url=${encodeURIComponent(`https://streamdata.vaplayer.ru/api.php?tmdb=${window.TMDB_ID}&type=movie`)}`;
    }

    function getSubtitleApiUrl() {
        if (window.IS_TV) return `https://sub.vdrk.site/v2/tv/${window.TMDB_ID}/${window.TMDB_SEASON}/${window.TMDB_EPISODE}`;
        return `https://sub.vdrk.site/v2/movie/${window.TMDB_ID}`;
    }

    function getProxyUrl(targetUrl) {
        return 'https://proxy-vert-eight-82.vercel.app/proxy?url=' + encodeURIComponent(targetUrl);
    }

    function getResumeKey() {
        if (window.IS_TV) return `resume_tv_${window.TMDB_ID}_${window.TMDB_SEASON}_${window.TMDB_EPISODE}`;
        return `resume_${window.TMDB_ID}`;
    }

    // ─────────────────────────────────────────
    // TMDB TITLE
    // ─────────────────────────────────────────
    async function loadMovieTitle() {
        if (!window.TMDB_ID) return;
        try {
            if (window.IS_TV) {
                let fetchSeason = window.TMDB_SEASON;
                let fetchEpisode = window.TMDB_EPISODE;
                if (String(window.TMDB_ID) === '95479') {
                    if (Number(window.TMDB_SEASON) === 2) {
                        fetchSeason = 1;
                        fetchEpisode = Number(window.TMDB_EPISODE) + 24;
                    } else if (Number(window.TMDB_SEASON) === 3) {
                        fetchSeason = 1;
                        fetchEpisode = Number(window.TMDB_EPISODE) + 47;
                    }
                }
                const [showRes, episodeRes] = await Promise.all([
                    fetch(`https://api.themoviedb.org/3/tv/${window.TMDB_ID}?api_key=${window.TMDB_API_KEY}&append_to_response=images`),
                    fetch(`https://api.themoviedb.org/3/tv/${window.TMDB_ID}/season/${fetchSeason}/episode/${fetchEpisode}?api_key=${window.TMDB_API_KEY}`)
                ]);
                const showData = await showRes.json();
                const episodeData = await episodeRes.json();
                const showTitle = showData.name || showData.original_name || 'Unknown Show';
                episodeTitle = episodeData.name || 'Episode';
                const title = `S${window.TMDB_SEASON} E${window.TMDB_EPISODE} "${episodeTitle}"`;
                const imagesRes = await fetch(`https://api.themoviedb.org/3/tv/${window.TMDB_ID}/images?api_key=${window.TMDB_API_KEY}&include_image_language=en,null`);
                const imagesData = await imagesRes.json();
                const logo = imagesData?.logos?.[0]?.file_path ? `https://image.tmdb.org/t/p/original${imagesData.logos[0].file_path}` : '';
                window.MEDIA_INFO = {
                    title: showTitle,
                    subtitle: `<span style="opacity:1;">S${window.TMDB_SEASON} E${window.TMDB_EPISODE}</span> <div style="font-size:10px;opacity:0.5;">&bull;</div> <span style="font-weight:400;opacity:0.8;">${episodeTitle}</span>`,
                    description: episodeData.overview || showData.overview || '',
                    logo
                };
                document.title = `${title} - ${showTitle}`;
                channelName.textContent = title;
                channelSubtitle.textContent = showTitle;
                return;
            }
            const res = await fetch(`https://api.themoviedb.org/3/movie/${window.TMDB_ID}?api_key=${window.TMDB_API_KEY}&append_to_response=images`);
            const data = await res.json();
            const title = data.title || data.name || 'Unknown Title';
            const tagline = data.tagline || title;
            const imagesRes = await fetch(`https://api.themoviedb.org/3/movie/${window.TMDB_ID}/images?api_key=${window.TMDB_API_KEY}&include_image_language=en,null`);
            const imagesData = await imagesRes.json();
            const logo = imagesData?.logos?.[0]?.file_path ? `https://image.tmdb.org/t/p/original${imagesData.logos[0].file_path}` : '';
            window.MEDIA_INFO = {
                title,
                subtitle: `<i style="margin: 5px 0;">${tagline}</i>`,
                description: data.overview || '',
                logo
            };
            document.title = title;
            channelName.textContent = title;
            channelSubtitle.style.display = 'none';
        } catch (err) {
            console.error('Failed to load TMDB title', err);
            document.title = 'Player';
            channelName.textContent = 'Unknown Title';
            channelSubtitle.style.display = 'none';
        }
    }

    // ─────────────────────────────────────────
    // RESUME PLAYBACK
    // ─────────────────────────────────────────
    function savePlaybackTime() {
        if (!window.TMDB_ID) return;
        if (Number.isFinite(video.currentTime) && video.currentTime > 5) {
            localStorage.setItem(
                getResumeKey(),
                JSON.stringify({
                    progress: video.currentTime,
                    updatedAt: Date.now()
                })
            );
        }
    }

    function restorePlaybackTime() {
        const rawVal = localStorage.getItem(getResumeKey());
        if (!rawVal) return;

        let saved = 0;
        try {
            if (rawVal.startsWith("{")) {
                const parsed = JSON.parse(rawVal);
                saved = Number(parsed.progress) || 0;
            } else {
                saved = Number(rawVal) || 0;
            }
        } catch {
            saved = Number(rawVal) || 0;
        }

        if (Number.isFinite(saved) && saved > 0) {
            video.currentTime = saved;
            showToast(`Resumed at ${formatTime(saved)}`);
        }
    }

    // ─────────────────────────────────────────
    // SUBTITLE HELPERS
    // ─────────────────────────────────────────
    function getSubtitleLabel(lang, index) {
        const normalized = String(lang || '').trim().toLowerCase();
        const labels = {
            ara: 'Arabic', ar: 'Arabic',
            eng: 'English', en: 'English',
            fre: 'French', fra: 'French', fr: 'French',
            spa: 'Spanish', es: 'Spanish',
            ger: 'German', deu: 'German', de: 'German',
            ita: 'Italian', it: 'Italian',
            por: 'Portuguese', pt: 'Portuguese',
            rus: 'Russian', ru: 'Russian',
            chi: 'Chinese', zho: 'Chinese', zh: 'Chinese',
            jpn: 'Japanese', ja: 'Japanese',
            kor: 'Korean', ko: 'Korean',
            dut: 'Dutch', nld: 'Dutch', nl: 'Dutch',
            hin: 'Hindi', hi: 'Hindi',
            ben: 'Bengali', bn: 'Bengali',
            tur: 'Turkish', tr: 'Turkish'
        };
        return labels[normalized] || lang || `Subtitle ${index + 1}`;
    }

    function getSubtitleSrclang(lang) {
        const normalized = String(lang || '').trim().toLowerCase();
        const srclangMap = {
            ara: 'ar', eng: 'en', fre: 'fr', fra: 'fr', spa: 'es',
            ger: 'de', deu: 'de', ita: 'it', por: 'pt', rus: 'ru',
            chi: 'zh', zho: 'zh', jpn: 'ja', kor: 'ko', dut: 'nl',
            nld: 'nl', hin: 'hi', ben: 'bn', tur: 'tr'
        };
        return srclangMap[normalized] || normalized.slice(0, 2) || 'en';
    }

    function getDefaultSubtitles(json) {
        const subtitles = json?.data?.[0]?.subtitles || json?.[0]?.subtitles || json?.subtitles || [];
        return subtitles.filter(sub => sub?.url).map((sub, index) => ({
            label: getSubtitleLabel(sub.lang, index),
            url: sub.url,
            srclang: getSubtitleSrclang(sub.lang),
            default: Boolean(sub.default)
        }));
    }

    // ─────────────────────────────────────────
    // SERVER / STREAM FETCHING
    // ─────────────────────────────────────────
    async function fetchUniformSubtitles() {
        try {
            const response = await fetch(getSubtitleApiUrl());
            if (!response.ok) return [];
            const json = await response.json();
            if (!Array.isArray(json)) return [];
            return json.filter(sub => sub?.file).map((sub, index) => ({
                label: sub.label || `Subtitle ${index + 1}`,
                url: sub.file,
                srclang: (sub.label || '').slice(0, 2).toLowerCase() || 'en'
            }));
        } catch {
            return [];
        }
    }

    async function fetchStreamsData() {
        const response = await fetch(getApiUrl());
        if (!response.ok) throw new Error('Failed to fetch streams');
        const resData = await response.json();

        // Extract the stream URLs from the new data structure
        let streamArray = [];
        if (resData && resData.data && Array.isArray(resData.data.stream_urls)) {
            streamArray = resData.data.stream_urls;
        }

        // Load thumbnails if they exist in the API response
        if (resData && resData.thumbnails_url) {
            loadThumbnails(resData.thumbnails_url);
        } else {
            thumbnailCues = [];
        }

        // The new API returns direct .m3u8 URLs, so all items are already HLS streams
        const hlsStreams = streamArray.filter(url => typeof url === 'string');
        if (!hlsStreams.length) throw new Error('No HLS streams found');

        // Populate SERVERS dynamically by wrapping each stream URL with the proxy
        SERVERS = hlsStreams.map((url, idx) => {
            return {
                name: `Server ${idx + 1}`,
                value: `https://stream-fetcher-worker.muhammadbilal3rd.workers.dev/?url=${encodeURIComponent(url)}`,
                id: `server_${idx}`
            };
        });

        // Render dynamically populated server dropdown options
        if (serverMenu) {
            serverMenu.innerHTML = '';
            SERVERS.forEach((srv, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'dyn-item';
                btn.dataset.server = srv.id;
                btn.innerHTML = `${srv.name} <span class="dyn-check"><i data-feather="check"></i></span>`;

                btn.onclick = () => {
                    currentServer = srv;
                    updateServerActive();

                    window.VIDEO_STREAM_URL = currentServer.value;
                    loadVideoSource();

                    const wrap = serverMenu.closest('.dyn-menu-wrap');
                    if (wrap) wrap.classList.remove('open');
                };
                serverMenu.appendChild(btn);
            });
            if (typeof feather !== 'undefined') feather.replace();
        }
    }

    // ─────────────────────────────────────────
    // EPISODE MARKERS
    // ─────────────────────────────────────────
    function markerFromRange(range) {
        if (!range || !Number.isFinite(range.end_ms)) return null;
        return {
            start: Number.isFinite(range.start_ms) ? range.start_ms / 1000 : 0,
            end: range.end_ms / 1000
        };
    }

    function creditsMarkerFromRange(range) {
        if (!range || !Number.isFinite(range.start_ms)) return null;
        return {
            start: range.start_ms / 1000,
            end: Number.isFinite(range.end_ms) ? range.end_ms / 1000 : null
        };
    }

    function parseToSeconds(value) {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return 0;
        if (!value.includes(':')) return parseFloat(value) || 0;
        const parts = value.split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        if (parts.length === 2) return (parts[0] * 60) + parts[1];
        return 0;
    }

    async function fetchEpisodeMarkers() {
        episodeMarkers = { intro: null, recap: null, credits: null };
        if (!window.IS_TV) { updateEpisodeActions(); return; }

        let segmentsData = null;
        try {
            const resolveTarget = `https://api.introdb.app/trpc/metadata.resolveShow?batch=1&input=${JSON.stringify({ "0": { "input": `tmdb:${window.TMDB_ID}` } })}`;
            const resolveResponse = await fetch(getProxyUrl(resolveTarget));
            const resolveData = await resolveResponse.json();
            const imdbId = resolveData[0]?.result?.data?.imdbId;
            if (!imdbId) throw new Error('No IMDB ID found');
            const targetUrl = `https://api.introdb.app/segments?imdb_id=${imdbId}&season=${window.TMDB_SEASON}&episode=${window.TMDB_EPISODE}`;
            const response = await fetch(getProxyUrl(targetUrl));
            if (!response.ok) throw new Error('Intro segment request failed');
            segmentsData = await response.json();
        } catch (err) {
            console.warn('Primary marker fetch failed, trying Episode 1 fallback:', err);
            try {
                const resolveTarget = `https://api.introdb.app/trpc/metadata.resolveShow?batch=1&input=${JSON.stringify({ "0": { "input": `tmdb:${window.TMDB_ID}` } })}`;
                const resolveResponse = await fetch(getProxyUrl(resolveTarget));
                const resolveData = await resolveResponse.json();
                const imdbId = resolveData[0]?.result?.data?.imdbId;
                if (imdbId) {
                    const fallbackUrl = `https://api.introdb.app/segments?imdb_id=${imdbId}&season=${window.TMDB_SEASON}&episode=1`;
                    const fallbackResponse = await fetch(getProxyUrl(fallbackUrl));
                    if (fallbackResponse.ok) segmentsData = await fallbackResponse.json();
                }
            } catch (fallbackErr) {
                console.error('Fallback to Episode 1 failed:', fallbackErr);
            }
        }

        if (segmentsData) {
            const introSegment = segmentsData.intro;
            if (introSegment && (introSegment.start_sec !== undefined || introSegment.end_sec !== undefined)) {
                episodeMarkers.intro = markerFromRange({
                    start_ms: parseToSeconds(introSegment.start_sec) * 1000,
                    end_ms: parseToSeconds(introSegment.end_sec) * 1000
                });
            }
            const outroSegment = segmentsData.outro;
            if (outroSegment && (outroSegment.start_sec !== undefined || outroSegment.end_sec !== undefined)) {
                episodeMarkers.credits = creditsMarkerFromRange({
                    start_ms: parseToSeconds(outroSegment.start_sec) * 1000,
                    end_ms: parseToSeconds(outroSegment.end_sec) * 1000
                });
            }
            const recapSegment = segmentsData.recap;
            if (recapSegment && (recapSegment.start_sec !== undefined || recapSegment.end_sec !== undefined)) {
                episodeMarkers.recap = markerFromRange({
                    start_ms: parseToSeconds(recapSegment.start_sec) * 1000,
                    end_ms: parseToSeconds(recapSegment.end_sec) * 1000
                });
            }
        }

        updateEpisodeActions();
    }

    function initializeSubtitles() {
        captionsEnabled = String(captionSettings.enabled) === 'true';

        if (captionsEnabled) {
            const selectedTrack = getSelectedSubtitle();
            const subtitleUrl = selectedTrack?.url || window.SUBTITLE_VTT_URL;

            if (subtitleUrl && subtitleUrl !== 'ENTER_LINK') {
                captionSettings.languageUrl = subtitleUrl;
                window.SUBTITLE_VTT_URL = subtitleUrl;

                for (const track of video.textTracks) track.mode = 'disabled';

                removeSubtitleTrackElement();
                englishSubtitleTrack = document.createElement('track');
                englishSubtitleTrack.kind = 'subtitles';
                englishSubtitleTrack.label = selectedTrack?.label || 'Captions';
                englishSubtitleTrack.srclang = selectedTrack?.srclang || 'en';
                englishSubtitleTrack.src = subtitleUrl;
                englishSubtitleTrack.default = true;
                video.appendChild(englishSubtitleTrack);

                englishSubtitleTrack.track.addEventListener('cuechange', updateSubtitleOverlay);
                englishSubtitleTrack.addEventListener('load', () => applyCaptionSyncOffset(captionSyncDelay));
                englishSubtitleTrack.track.mode = 'hidden';

                applyCaptionSyncOffset(captionSyncDelay);
            }
        } else {
            for (const track of video.textTracks) track.mode = 'disabled';
        }
    }

    // ─────────────────────────────────────────
    // VIDEO SOURCE LOADING
    // ─────────────────────────────────────────
    async function loadVideoSource() {
        if (hls) { hls.destroy(); hls = null; }
        video.pause();
        video.src = '';

        for (const track of [...video.querySelectorAll('track')]) track.remove();

        englishSubtitleTrack = null;
        initializeSubtitles();
        captionSyncDelay = Number(localStorage.getItem(captionSyncKey) || 0);
        if (captionSyncSlider) captionSyncSlider.value = captionSyncDelay;
        if (syncValueText) syncValueText.textContent = `${captionSyncDelay > 0 ? '+' : ''}${captionSyncDelay.toFixed(1)}s`;

        syncCaptionButton();
        updateSubtitleOverlay();

        const HlsEngine = window.Hls || Hls;
        if (HlsEngine && HlsEngine.isSupported()) {
            hls = new HlsEngine({
                enableWorker: true,
                xhrSetup: (xhr) => { xhr.withCredentials = false; },
                maxBufferLength: 45, // A balanced 45-second safety cushion
                maxMaxBufferLength: 120, // Caps total downloaded headway to 2 minutes instead of 10
                maxBufferSize: 60 * 1000 * 1000, // Halves the maximum memory footprint to 60MB
                fragLoadingMaxRetry: 6,
                fragLoadingRetryDelay: 500
            });
            const streamUrl = window.VIDEO_STREAM_URL;
            const isMp4 = streamUrl && streamUrl.includes('.mp4');

            if (isMp4) {
                video.preload = "auto";
                video.setAttribute('fetchpriority', 'high');
                video.src = streamUrl;
                video.load();
                video.crossOrigin = "anonymous";
                video.addEventListener('canplay', () => {
                    restorePlaybackTime();
                    attemptAutoplay();
                }, { once: true });
                spinner.style.display = 'none';
                return;
            }

            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(streamUrl);
            });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                buildQualityOptions();
                restorePlaybackTime();
                attemptAutoplay();
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, updateQualityActive);
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data?.fatal) {
                    showToast('Stream Error');
                    console.error('HLS error:', data);
                }
            });
        } else {
            video.src = window.VIDEO_STREAM_URL;
            buildQualityOptions();
            video.addEventListener('loadedmetadata', () => {
                restorePlaybackTime();
                attemptAutoplay();
            }, { once: true });
        }
    }

    async function initStreams() {
        spinner.style.display = 'block';
        try {
            await fetchStreamsData();
            currentServer = SERVERS[0]; // Pick the first available HLS by default
            updateServerActive();

            window.VIDEO_STREAM_URL = currentServer.value;
            const subtitles = await fetchUniformSubtitles();
            await setAvailableSubtitles(subtitles);

            window.isAlpha = false;
            await loadVideoSource();
            buildQualityOptions();

            window.LaunchScreen?.onSuccess(currentServer.name);
            spinner.style.display = 'none';
        } catch (err) {
            console.error(err);
            window.LaunchScreen?.onAllFailed();
            spinner.style.display = 'none';
            showToast('Failed to load streams');
        }
    }

    function updateServerActive() {
        if (serverMenu) {
            serverMenu.querySelectorAll('.dyn-item').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.server === currentServer.id);
            });
        }
        if (serverTitle) serverTitle.textContent = currentServer?.name || 'Default';
        if (serverValue) serverValue.textContent = currentServer?.name || 'Default';
    }

    // ─────────────────────────────────────────
    // PLAYER INIT
    // ─────────────────────────────────────────
    async function initPlayer() {
        await window.LaunchScreen?.init();
        if (!window.TMDB_ID) { showToast('TMDB ID not set'); spinner.style.display = 'none'; return; }
        spinner.style.display = 'block';
        try {
            await loadMovieTitle();
            try {
                await fetchEpisodeMarkers();
            } catch (markerErr) {
                console.warn('Failed to load episode markers', markerErr);
                episodeMarkers = { intro: null, credits: null };
                updateEpisodeActions();
            }
            await initStreams();
        } catch (err) {
            console.error(err);
            showToast('Failed to load stream');
        }
    }

    async function attemptAutoplay() {
        try {
            video.muted = false;
            if (video.volume === 0) { video.volume = 1; volumeSlider.value = 1; }
            updateVolumeIcon();
            await video.play();
        } catch {
            try {
                video.muted = true;
                updateVolumeIcon();
                await video.play();
                showToast('Unmute to hear audio');
            } catch {
                showToast('Press play to start');
            }
        }
    }
    let thumbnailCues = [];

    function parseVttTime(timeStr) {
        const parts = timeStr.trim().split(':');
        let secs = 0;
        if (parts.length === 3) {
            secs += parseFloat(parts[0]) * 3600;
            secs += parseFloat(parts[1]) * 60;
            secs += parseFloat(parts[2]);
        } else if (parts.length === 2) {
            secs += parseFloat(parts[0]) * 60;
            secs += parseFloat(parts[1]);
        }
        return secs;
    }

    async function loadThumbnails(vttUrl) {
        if (!vttUrl) {
            thumbnailCues = [];
            return;
        }
        try {
            const vttBaseUrl = new URL(vttUrl).origin;
            const response = await fetch(vttUrl);
            const text = await response.text();
            const regex = /(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*-->\s*(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\r?\n([^\r\n]+)/g;
            let match;
            thumbnailCues = [];

            while ((match = regex.exec(text)) !== null) {
                const start = parseVttTime(match[1]);
                const end = parseVttTime(match[2]);
                const payload = match[3].trim();
                const [imgPath, hash] = payload.split('#xywh=');
                if (imgPath && hash) {
                    const [x, y, w, h] = hash.split(',').map(Number);
                    const absoluteImgUrl = imgPath.startsWith('/') ? `${vttBaseUrl}${imgPath}` : imgPath;
                    thumbnailCues.push({ start, end, url: absoluteImgUrl, x, y, w, h });
                }
            }
        } catch (e) {
            console.error('Failed parsing thumbnails VTT:', e);
            thumbnailCues = [];
        }
    }

    // ─────────────────────────────────────────
    // QUALITY OPTIONS
    // ─────────────────────────────────────────
    function buildQualityOptions() {
        if (!qualityOptions) return;
        qualityOptions.innerHTML = '';

        // If it's the new Alpha API, build options using the parsed array
        if (window.isAlpha && window.alphaStreams) {
            window.alphaStreams.forEach((stream, index) => {
                const chip = document.createElement('button');
                chip.className = 's-chip';
                chip.dataset.quality = String(index);
                chip.textContent = stream.label.endsWith('p') ? stream.label : `${stream.label}p`;
                qualityOptions.appendChild(chip);
            });
            updateQualityActive();
            return;
        }

        const auto = document.createElement('button');
        auto.className = 's-chip active';
        auto.dataset.quality = '-1';
        auto.textContent = 'Auto';
        qualityOptions.appendChild(auto);
        if (hls && hls.levels && hls.levels.length) {
            [...hls.levels]
                .map((level, index) => ({ level, index }))
                .filter(item => item.level.height)
                .sort((a, b) => b.level.height - a.level.height)
                .forEach(({ level, index }) => {
                    const chip = document.createElement('button');
                    chip.className = 's-chip';
                    chip.dataset.quality = String(index);
                    chip.textContent = `${level.height}p`;
                    qualityOptions.appendChild(chip);
                });
        }
    }

    function setQuality(levelIndex) {
        if (window.isAlpha) {
            const target = window.alphaStreams?.[levelIndex];
            if (!target) return;
            window.currentAlphaQualityIndex = levelIndex;

            const video = document.querySelector('video');
            if (video) {
                const currentTime = video.currentTime;
                const isPaused = video.paused;

                // Direct MP4 swap (destroying any active HLS instance components if they exist)
                if (typeof hls !== 'undefined' && hls) {
                    hls.detachMedia();
                }
                video.src = target.url;
                video.load();

                // Restore playback time seamlessly
                video.currentTime = currentTime;
                if (!isPaused) video.play().catch(() => { });
            }
            updateQualityActive();
            showToast(`Quality: ${target.label.endsWith('p') ? target.label : target.label + 'p'}`);
            return;
        }

        if (!hls) { showToast('Quality is automatic'); return; }
        hls.currentLevel = levelIndex;
        updateQualityActive();
        showToast(levelIndex === -1 ? 'Quality: Auto' : `Quality: ${hls.levels[levelIndex]?.height || '?'}p`);
    }

    function updateQualityActive() {
        const current = window.isAlpha ? window.currentAlphaQualityIndex : (hls ? hls.currentLevel : -1);
        if (!qualityOptions) return;
        qualityOptions.querySelectorAll('.s-chip').forEach(chip => {
            chip.classList.toggle('active', Number(chip.dataset.quality) === current);
        });
    }

    // ─────────────────────────────────────────
    // PROGRESS BAR
    // ─────────────────────────────────────────
    function getBufferedEnd() {
        if (!video.buffered || video.buffered.length === 0) return 0;
        const current = video.currentTime || 0;
        for (let i = 0; i < video.buffered.length; i++) {
            if (video.buffered.start(i) <= current && video.buffered.end(i) >= current) {
                return video.buffered.end(i);
            }
        }
        return video.buffered.end(0);
    }

    function updateProgressUi() {
        if (isDraggingProgress) return;
        const duration = video.duration;
        const current = Math.min(Math.max(video.currentTime || 0, 0), Number.isFinite(duration) ? duration : 0);
        const progress = duration ? (current / duration) * 100 : 0;
        const buffered = duration ? Math.min((getBufferedEnd() / duration) * 100, 100) : 0;
        progressFill.style.width = `${progress}%`;
        progressBuffer.style.width = `${buffered}%`;
        progressThumb.style.left = `${progress}%`;
        remainingTime.innerHTML = `<span style="color:white;">${formatTime(current)}</span> / ${formatTime(duration)}${episodeTitle ? ` &nbsp;&nbsp;&bull;&nbsp;&nbsp; ${episodeTitle}` : ''}`;
        progressWrap.setAttribute('aria-valuenow', String(Math.round(progress)));
        progressWrap.setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(duration)}`);
        updateEpisodeActions();
    }

    function updateProgressUiAt(time) {
        const duration = video.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const current = Math.min(Math.max(time || 0, 0), duration);
        const progress = (current / duration) * 100;
        progressFill.style.width = `${progress}%`;
        progressThumb.style.left = `${progress}%`;
        remainingTime.innerHTML = `<span style="color:white;">${formatTime(current)}</span> / ${formatTime(duration)}${episodeTitle ? ` &nbsp;&nbsp;&bull;&nbsp;&nbsp; ${episodeTitle}` : ''}`;
    }

    function isInMarkerWindow(marker, current, duration) {
        if (!marker || !Number.isFinite(current)) return false;
        const end = Number.isFinite(marker.end) ? marker.end : duration;
        return current >= marker.start && current < end;
    }

    function updateEpisodeActions() {
        if (!window.IS_TV) {
            skipIntroBtn.classList.remove('show');
            skipRecapBtn.classList.remove('show');
            nextEpisodeBtn.classList.remove('show');
            episodeActions.setAttribute('aria-hidden', 'true');
            return;
        }
        const current = video.currentTime || 0;
        const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
        const showSkipIntro = isInMarkerWindow(episodeMarkers.intro, current, duration);
        const showSkipRecap = isInMarkerWindow(episodeMarkers.recap, current, duration);
        const showNextEpisode = isInMarkerWindow(episodeMarkers.credits, current, duration);
        skipIntroBtn.classList.toggle('show', showSkipIntro);
        skipRecapBtn.classList.toggle('show', showSkipRecap);
        nextEpisodeBtn.classList.toggle('show', showNextEpisode);
        episodeActions.setAttribute('aria-hidden', String(!showSkipIntro && !showSkipRecap && !showNextEpisode));
    }

    function skipIntro() {
        video.play();
        if (!episodeMarkers.intro?.end) return;
        video.currentTime = Math.min(episodeMarkers.intro.end, video.duration || episodeMarkers.intro.end);
        updateEpisodeActions();
    }

    function skipRecap() {
        video.play();
        if (!episodeMarkers.recap?.end) return;
        video.currentTime = Math.min(episodeMarkers.recap.end, video.duration || episodeMarkers.recap.end);
        updateEpisodeActions();
    }

    function goToNextEpisode() {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('e', String(Number(window.TMDB_EPISODE) + 1));
        window.location.href = nextUrl.toString();
    }

    function progressTimeFromEvent(event) {
        const rect = progressWrap.getBoundingClientRect();
        const pointerX = event.touches ? event.touches[0].clientX : event.clientX;
        const ratio = Math.min(Math.max((pointerX - rect.left) / rect.width, 0), 1);
        return { ratio, time: ratio * video.duration };
    }

    function updateProgressPreview(event) {
        if (!Number.isFinite(video.duration)) return;
        const { ratio, time } = progressTimeFromEvent(event);
        progressPreview.style.left = `${ratio * 100}%`;
        previewTime.textContent = formatTime(time);

        const thumbBox = progressPreview.querySelector('.preview-thumb-box');
        if (thumbBox) {
            const matchingCue = thumbnailCues.find(cue => time >= cue.start && time <= cue.end);
            if (matchingCue) {
                thumbBox.style.display = 'block';
                thumbBox.style.width = `${matchingCue.w}px`;
                thumbBox.style.height = `${matchingCue.h}px`;
                thumbBox.style.backgroundImage = `url(${matchingCue.url})`;
                thumbBox.style.backgroundPosition = `-${matchingCue.x}px -${matchingCue.y}px`;
            } else {
                thumbBox.style.display = 'none';
            }
        }
    }

    function clampToSeekable(targetTime) {
        const seekable = video.seekable;
        if (!seekable || seekable.length === 0) return targetTime;
        for (let i = 0; i < seekable.length; i++) {
            if (targetTime >= seekable.start(i) && targetTime <= seekable.end(i)) return targetTime;
        }
        const last = seekable.length - 1;
        return Math.min(Math.max(targetTime, seekable.start(last)), seekable.end(last));
    }

    function scrubProgress(event) {
        if (!Number.isFinite(video.duration)) return;
        const { time } = progressTimeFromEvent(event);
        dragSeekTime = clampToSeekable(time);
        updateProgressUiAt(dragSeekTime);
        updateProgressPreview(event);
    }

    // ─────────────────────────────────────────
    // CAPTION STYLE
    // ─────────────────────────────────────────
    function getSelectedSubtitle() {
        return availableSubtitleTracks.find(t => t.url === captionSettings.languageUrl) || null;
    }

    function formatWeightLabel(weight) {
        return { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold' }[weight] || String(weight);
    }

    function applyCaptionStyle() {
        subtitleOverlay.style.fontSize = `${captionSettings.fontSize}px`;
        subtitleOverlay.style.fontWeight = String(captionSettings.fontWeight);
        subtitleOverlay.style.setProperty('--caption-bg-opacity', String(captionSettings.bgOpacity / 100));
        subtitleOverlay.style.fontFamily = captionSettings.fontFamily;
        if (captionFontSizeValue) captionFontSizeValue.textContent = `${captionSettings.fontSize}px`;
        if (captionFontWeightValue) captionFontWeightValue.textContent = formatWeightLabel(captionSettings.fontWeight);
        if (captionBgOpacityValue) captionBgOpacityValue.textContent = `${captionSettings.bgOpacity}%`;
    }

    function saveCaptionSettings() {
        localStorage.setItem('captionSettings', JSON.stringify(captionSettings));
    }

    function syncCaptionSettingsUI() {
        document.getElementById('captionFontFamilyTitle').textContent = captionSettings.fontFamily;
        document.getElementById('captionFontFamilyValue').textContent = captionSettings.fontFamily;
        document.querySelectorAll('#captionFontFamilyMenu .dyn-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === captionSettings.fontFamily);
        });
        const weightMap = { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold' };
        document.getElementById('captionFontWeightTitle').textContent = weightMap[captionSettings.fontWeight] || 'Medium';
        if (captionFontWeightValue) captionFontWeightValue.textContent = weightMap[captionSettings.fontWeight] || 'Medium';
        document.querySelectorAll('#captionFontWeightMenu .dyn-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value == captionSettings.fontWeight);
        });
        if (captionFontSize) captionFontSize.value = captionSettings.fontSize;
        if (captionFontSizeValue) captionFontSizeValue.textContent = captionSettings.fontSize + 'px';
        if (captionBgOpacity) captionBgOpacity.value = captionSettings.bgOpacity;
        if (captionBgOpacityValue) captionBgOpacityValue.textContent = captionSettings.bgOpacity + '%';
        applyCaptionStyle();
    }

    // ─────────────────────────────────────────
    // DROPDOWN MENU HELPERS (global)
    // ─────────────────────────────────────────
    window.toggleDropdownMenu = function (menuId) {
        const menu = document.getElementById(menuId);
        if (!menu) return;
        const currentWrapper = menu.closest('.dyn-menu-wrap');
        const isAlreadyOpen = currentWrapper.classList.contains('open');
        document.querySelectorAll('.dyn-menu-wrap').forEach(w => w.classList.remove('open'));
        if (!isAlreadyOpen) currentWrapper.classList.add('open');
    };

    window.selectFontWeight = function (value, label) {
        document.getElementById('captionFontWeightTitle').textContent = label;
        captionSettings.fontWeight = value;
        applyCaptionStyle();
        document.querySelectorAll('#captionFontWeightMenu .dyn-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === value);
        });
        document.getElementById('captionFontWeightMenu').closest('.dyn-menu-wrap').classList.remove('open');
        saveCaptionSettings();
    };

    window.selectFontFamily = async function (font) {
        captionSettings.fontFamily = font;
        const fontMap = {
            'Geist': '"Geist"',
            'Geist Mono': '"Geist Mono"',
            'Inter': '"Inter", sans-serif',
            'Oswald': '"Oswald", sans-serif'
        };
        const resolvedFont = fontMap[font] || font;
        if (document.fonts && document.fonts.load) {
            try { await document.fonts.load(`16px ${resolvedFont}`); await document.fonts.ready; } catch { }
        }
        subtitleOverlay.style.fontFamily = resolvedFont;
        document.querySelectorAll('#captionFontFamilyMenu .dyn-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === font);
        });
        document.getElementById('captionFontFamilyValue').textContent = font;
        document.getElementById('captionFontFamilyTitle').textContent = font;
        document.getElementById('captionFontFamilyMenu').closest('.dyn-menu-wrap').classList.remove('open');
        saveCaptionSettings();
    };

    window.selectLanguage = function (url, label) {
        if (url === '') {
            captionSettings.languageUrl = '';
            window.SUBTITLE_VTT_URL = null;
            hideEnglishSubtitles();
        } else {
            captionSettings.languageUrl = url;
            window.SUBTITLE_VTT_URL = url;
            removeSubtitleTrackElement();
            showEnglishSubtitles();
        }
        updateCaptionLanguageMenu();
        const langMenu = document.getElementById('captionLanguageMenu');
        if (langMenu) langMenu.closest('.dyn-menu-wrap').classList.remove('open');
        saveCaptionSettings();
    };

    // Close dyn menus on outside click
    window.addEventListener('click', function (e) {
        if (!e.target.closest('.dyn-menu-wrap')) {
            document.querySelectorAll('.dyn-menu-wrap').forEach(w => w.classList.remove('open'));
        }
    });

    // ─────────────────────────────────────────
    // CAPTION LANGUAGE MENU
    // ─────────────────────────────────────────
    function updateCaptionLanguageMenu() {
        const selectedTrack = getSelectedSubtitle();
        const languageMenu = document.getElementById('captionLanguageMenu');
        const languageBtn = document.getElementById('captionLanguageBtn');
        if (!languageMenu) return;
        languageMenu.replaceChildren();

        if (availableSubtitleTracks.length === 0) {
            if (languageBtn) languageBtn.disabled = true;
            const noSubsBtn = document.createElement('button');
            noSubsBtn.className = 'dyn-item active';
            noSubsBtn.type = 'button';
            noSubsBtn.innerHTML = `No subtitles <span class="dyn-check"><i data-feather="check"></i></span>`;
            languageMenu.appendChild(noSubsBtn);
            if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14 });
            if (captionLanguageValue) captionLanguageValue.textContent = 'Off';
            return;
        }

        if (languageBtn) languageBtn.disabled = false;

        const offBtn = document.createElement('button');
        offBtn.className = (!captionsEnabled || !selectedTrack) ? 'dyn-item active' : 'dyn-item';
        offBtn.type = 'button';
        offBtn.innerHTML = `Off <span class="dyn-check"><i data-feather="check"></i></span>`;
        offBtn.onclick = () => window.selectLanguage('', 'Off');
        languageMenu.appendChild(offBtn);

        availableSubtitleTracks.forEach(track => {
            const btn = document.createElement('button');
            const isActive = captionsEnabled && selectedTrack && track.url === captionSettings.languageUrl;
            const cleanLangKey = track.label.replace(/\d+/g, '').trim().split(' ')[0];
            let flagEmoji = '';
            if (window.languageFlags[cleanLangKey]) {
                const flagData = window.languageFlags[cleanLangKey];
                // Uses the exact Apple format you requested dynamically: name + unicode suffix
                flagEmoji = `<img src="https://em-content.zobj.net/source/apple/453/flag-${flagData.name}_${flagData.unicode}.png" style="width:18px;height:13px;object-fit:cover;display:inline-block;vertical-align:middle;margin-right:6px;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);">`;
            }
            btn.className = isActive ? 'dyn-item active' : 'dyn-item';
            btn.type = 'button';
            btn.setAttribute('data-url', track.url);
            btn.innerHTML = `<div class="dyn-item-left">${flagEmoji}<span>${track.label}</span></div><span class="dyn-check"><i data-feather="check"></i></span>`;
            btn.onclick = () => window.selectLanguage(track.url, track.label);
            languageMenu.appendChild(btn);
        });

        if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14 });

        const displayLabel = captionsEnabled && selectedTrack ? selectedTrack.label : 'Off';
        const titleEl = document.getElementById('captionLanguageTitle');
        if (titleEl) titleEl.textContent = displayLabel;
        if (captionLanguageValue) captionLanguageValue.textContent = displayLabel;
    }

    window.languageFlags = window.languageFlags || {};

    async function setAvailableSubtitles(tracks = [], preferredUrl = '') {
        availableSubtitleTracks = tracks;
        const englishTrack = availableSubtitleTracks.find(t => t.label.toLowerCase() === 'english')
            || availableSubtitleTracks.find(t => t.label.toLowerCase().startsWith('english'))
            || availableSubtitleTracks.find(t => t.label.toLowerCase().includes('eng'));
        const preferredTrack = availableSubtitleTracks.find(t => t.url === preferredUrl) || englishTrack || availableSubtitleTracks[0] || null;
        captionSettings.languageUrl = preferredTrack?.url || '';
        window.SUBTITLE_VTT_URL = captionSettings.languageUrl || null;

        const fetchPromises = availableSubtitleTracks.map(async (track) => {
            const cleanLang = track.label.replace(/[^a-zA-Z\s]/g, '').trim().split(' ')[0];
            if (!cleanLang || window.languageFlags[cleanLang]) return;
            const targetLangLower = cleanLang.toLowerCase();
            // Fallback object for core subtitle languages to save API calls, fully decoded dynamically below
            const baseLanguages = {
                'arabic': 'SA', 'english': 'GB', 'spanish': 'ES', 'french': 'FR',
                'chinese': 'CN', 'portuguese': 'PT', 'russian': 'RU', 'japanese': 'JP',
                'german': 'DE', 'korean': 'KR', 'italian': 'IT', 'danish': 'DK',
                'dutch': 'NL', 'panjabi': 'IN', 'hausa': 'NG', 'turkish': 'TR', 'polish': 'PL',
                'persian': 'IR', 'greek': 'GR', 'romanian': 'RO'
            };

            let countryData = null;
            if (baseLanguages[targetLangLower]) {
                try {
                    const res = await fetch(`https://restcountries.com/v3.1/alpha/${baseLanguages[targetLangLower]}`);
                    if (res.ok) { const d = await res.json(); countryData = d[0]; }
                } catch { }
            }

            if (!countryData) {
                try {
                    const response = await fetch(`https://restcountries.com/v3.1/lang/${encodeURIComponent(cleanLang)}`);
                    if (response.ok) { const data = await response.json(); countryData = data[0]; }
                } catch { }
            }

            if (countryData && countryData.name?.common && countryData.cca2) {
                // Formats country name to match URL slug style (e.g., "Saudi Arabia" -> "saudi-arabia")
                const formattedName = countryData.name.common.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                // Decodes the 2-letter country code into Apple's regional indicator hex pair format
                const unicodePairs = [...countryData.cca2.toUpperCase()].map(char => (char.charCodeAt(0) + 127397).toString(16)).join('-');

                window.languageFlags[cleanLang] = { name: formattedName, unicode: unicodePairs };
            }
        });

        await Promise.all(fetchPromises);
        updateCaptionLanguageMenu();
    }

    // ─────────────────────────────────────────
    // SUBTITLE TRACK MANAGEMENT
    // ─────────────────────────────────────────
    function removeSubtitleTrackElement() {
        subtitleOverlay.replaceChildren();
        subtitleOverlay.classList.remove('show');
        if (englishSubtitleTrack) {
            englishSubtitleTrack.track.removeEventListener('cuechange', updateSubtitleOverlay);
            englishSubtitleTrack.remove();
            englishSubtitleTrack = null;
        }
    }

    function syncCaptionButton() {
        subtitlesBtn.classList.toggle('active', captionsEnabled);
        subtitlesBtn.setAttribute('aria-pressed', String(captionsEnabled));
        updateCaptionLanguageMenu();
        updateSubtitleOverlay();
    }

    function updateSubtitleOverlay() {
        subtitleOverlay.replaceChildren();
        const track = englishSubtitleTrack?.track;
        if (!captionsEnabled || !track?.cues?.length) {
            subtitleOverlay.classList.remove('show');
            return;
        }
        const adjustedTime = (video.currentTime || 0) + captionSyncDelay;
        const visibleCues = [...track.cues].filter(cue =>
            cue.startTime <= adjustedTime && cue.endTime > adjustedTime && (cue.text || '').trim()
        );
        if (!visibleCues.length) { subtitleOverlay.classList.remove('show'); return; }
        for (const cue of visibleCues) {
            if (subtitleOverlay.childNodes.length) subtitleOverlay.appendChild(document.createElement('br'));
            if (typeof cue.getCueAsHTML === 'function') subtitleOverlay.appendChild(cue.getCueAsHTML());
            else subtitleOverlay.appendChild(document.createTextNode(cue.text || ''));
        }
        subtitleOverlay.classList.add('show');
    }

    document.getElementById("captionSyncReset").addEventListener("click", resetCaptionSync);
    function resetCaptionSync() {
        captionSyncDelay = 0;
        document.getElementById('captionSync').value = 0;
        document.getElementById('captionSyncValue').textContent = '0s';
        updateSubtitleOverlay();
    }

    function showEnglishSubtitles() {
        const selectedTrack = getSelectedSubtitle();
        const subtitleUrl = selectedTrack?.url || window.SUBTITLE_VTT_URL;
        if (!subtitleUrl || subtitleUrl === 'ENTER_LINK') { showToast('Subtitles unavailable'); return; }
        captionSettings.languageUrl = subtitleUrl;
        window.SUBTITLE_VTT_URL = subtitleUrl;
        for (const track of video.textTracks) track.mode = 'disabled';
        if (!englishSubtitleTrack || englishSubtitleTrack.getAttribute('src') !== subtitleUrl) {
            removeSubtitleTrackElement();
            englishSubtitleTrack = document.createElement('track');
            englishSubtitleTrack.kind = 'subtitles';
            englishSubtitleTrack.label = selectedTrack?.label || 'Captions';
            englishSubtitleTrack.srclang = selectedTrack?.srclang || 'en';
            englishSubtitleTrack.src = subtitleUrl;
            englishSubtitleTrack.default = true;
            video.appendChild(englishSubtitleTrack);
            englishSubtitleTrack.track.addEventListener('cuechange', updateSubtitleOverlay);
        }
        englishSubtitleTrack.addEventListener('load', () => applyCaptionSyncOffset(captionSyncDelay));
        englishSubtitleTrack.track.mode = 'hidden';
        captionsEnabled = true;
        applyCaptionSyncOffset(captionSyncDelay);
        syncCaptionButton();
        showToast(`${selectedTrack?.label || 'Captions'} on`);
    }

    function hideEnglishSubtitles() {
        for (const track of video.textTracks) track.mode = 'disabled';
        captionsEnabled = false;
        syncCaptionButton();
        showToast('Subtitles off');
    }

    function toggleEnglishSubtitles() {
        if (captionsEnabled) hideEnglishSubtitles();
        else showEnglishSubtitles();
        captionSettings.enabled = captionsEnabled;
        saveCaptionSettings();
    }

    // ─────────────────────────────────────────
    // PLAYBACK STATE
    // ─────────────────────────────────────────
    function updatePlayState() {
        if (video.paused) {
            playIcon.textContent = 'play_arrow';
            playPause.setAttribute('aria-pressed', 'false');
        } else {
            playIcon.textContent = 'pause';
            playPause.setAttribute('aria-pressed', 'true');
        }
    }

    function triggerPulse(isPlay) {
        pulseSvg.innerHTML = isPlay
            ? '<path d="M8 5v14l11-7z"/>'
            : '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        pulseIcon.classList.remove('animate');
        void pulseIcon.offsetWidth;
        pulseIcon.classList.add('animate');
    }

    async function togglePlay() {
        if (video.paused) {
            try { await video.play(); triggerPulse(true); } catch { showToast('Tap play to start'); }
        } else {
            video.pause();
            triggerPulse(false);
        }
        updatePlayState();
    }

    function updateVolumeIcon() {
        if (video.muted || video.volume === 0) volumeIcon.textContent = 'volume_off';
        else if (video.volume < 0.5) volumeIcon.textContent = 'volume_down';
        else volumeIcon.textContent = 'volume_up';
    }

    function toggleMute() {
        if (video.muted || video.volume === 0) {
            video.muted = false;
            video.volume = Number(volumeSlider.value) || 0.5;
        } else {
            video.muted = true;
        }
        volumeSlider.value = video.muted ? 0 : video.volume;
        updateVolumeIcon();
    }

    // ─────────────────────────────────────────
    // CAPTION SYNC
    // ─────────────────────────────────────────
    function applyCaptionSyncOffset(newOffset) {
        captionSyncDelay = Number(newOffset);
        localStorage.setItem(captionSyncKey, String(captionSyncDelay));
        if (video.paused) updateSubtitleOverlay();
    }

    function updateCaptionSyncUI(value) {
        const v = Number(value);
        const label = v === 0 ? '0s' : (v > 0 ? `+${v.toFixed(1)}s` : `${v.toFixed(1)}s`);
        if (syncValueText) syncValueText.textContent = label;
        if (captionSyncSlider) captionSyncSlider.value = v;
        applyCaptionSyncOffset(v);
    }

    // ─────────────────────────────────────────
    // FULLSCREEN / PiP
    // ─────────────────────────────────────────
    function toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (playerWrap.requestFullscreen) playerWrap.requestFullscreen();
            else if (playerWrap.webkitRequestFullscreen) playerWrap.webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
    }

    function updateFullscreenIcon() {
        const inFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        fsIcon.textContent = inFs ? 'fullscreen_exit' : 'fullscreen';
    }

    // ─────────────────────────────────────────
    // CHANNEL OVERLAY / PAUSE OVERLAY
    // ─────────────────────────────────────────
    function syncChannelOverlay(state) {
        channelOverlay.style.display = '';
        channelOverlay.style.opacity = state;
    }

    const netflixPauseOverlay = document.getElementById('netflixPauseOverlay');
    const netflixLogo = document.getElementById('netflixLogo');
    const netflixSubtitle = document.getElementById('netflixSubtitle');
    const netflixDescription = document.getElementById('netflixDescription');

    function updatePauseOverlay() {
        if (!window.NETFLIX_MODE || !netflixPauseOverlay) return;
        clearTimeout(pauseOverlayTimer);
        if (video.paused) {
            netflixLogo.src = window.MEDIA_INFO.logo || '';
            netflixLogo.style.display = window.MEDIA_INFO.logo ? 'block' : 'none';
            netflixSubtitle.innerHTML = window.MEDIA_INFO.subtitle || '';
            if (netflixDescription) netflixDescription.textContent = window.MEDIA_INFO.description || '';
            netflixPauseOverlay.classList.remove('show');
            pauseOverlayTimer = setTimeout(() => {
                if (video.paused) netflixPauseOverlay.classList.add('show');
            }, 3000);
        } else {
            netflixPauseOverlay.classList.remove('show');
        }
    }

    // ─────────────────────────────────────────
    // CONTROLS VISIBILITY
    // ─────────────────────────────────────────
    function showControls() {
        if (isHolding) return;
        clearTimeout(hideTimer);
        controls.style.opacity = '1';
        shadowOverlay.style.opacity = '1';
        controls.style.transform = 'translateX(-50%) translateY(0)';
        playerWrap.classList.add('controls-visible');
        syncChannelOverlay(1);
        hideTimer = setTimeout(() => {
            if (!video.paused && !isDraggingProgress && !settingsOpen) {
                controls.style.opacity = '0';
                shadowOverlay.style.opacity = '0';
                controls.style.transform = 'translateX(-50%) translateY(6px)';
                playerWrap.classList.remove('controls-visible');
                syncChannelOverlay(0);
            }
        }, 2000);
    }

    // ─────────────────────────────────────────
    // EVENT LISTENERS
    // ─────────────────────────────────────────

    // Progress bar
    progressWrap.addEventListener('pointermove', event => {
        if (isDraggingProgress) { scrubProgress(event); return; }
        updateProgressPreview(event);
    });
    progressWrap.addEventListener('pointerdown', event => {
        if (!Number.isFinite(video.duration)) return;
        event.preventDefault();
        isDraggingProgress = true;
        progressWrap.classList.add('is-dragging');
        progressWrap.setPointerCapture(event.pointerId);
        scrubProgress(event);
    });
    progressWrap.addEventListener('pointerup', event => {
        if (!isDraggingProgress) return;
        event.preventDefault();
        scrubProgress(event);
        isDraggingProgress = false;
        progressWrap.classList.remove('is-dragging');
        if (progressWrap.hasPointerCapture(event.pointerId)) progressWrap.releasePointerCapture(event.pointerId);
        video.currentTime = dragSeekTime;
        updateProgressUi();
    });
    progressWrap.addEventListener('pointercancel', event => {
        isDraggingProgress = false;
        progressWrap.classList.remove('is-dragging');
        if (progressWrap.hasPointerCapture(event.pointerId)) progressWrap.releasePointerCapture(event.pointerId);
        updateProgressUi();
    });

    // Playback
    playPause.addEventListener('click', togglePlay);
    skipIntroBtn.addEventListener('click', skipIntro);
    skipRecapBtn.addEventListener('click', skipRecap);
    nextEpisodeBtn.addEventListener('click', goToNextEpisode);

    // Volume
    volumeBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', event => {
        video.volume = Number(event.target.value);
        video.muted = video.volume === 0;
        updateVolumeIcon();
    });

    // Subtitles
    subtitlesBtn.addEventListener('click', toggleEnglishSubtitles);

    // Settings button
    settingsBtn.addEventListener('click', event => {
        event.stopPropagation();
        openSettings();
        showControls();
    });

    // Close settings on outside click
    document.addEventListener('click', event => {
        if (settingsOpen && !settingsMenu.contains(event.target) && event.target !== settingsBtn) {
            closeSettings();
        }
    });

    // Speed chips
    if (speedOptions) {
        speedOptions.addEventListener('click', event => {
            event.stopPropagation();
            const chip = event.target.closest('.s-chip');
            if (!chip || !chip.dataset.speed) return;
            const speed = Number(chip.dataset.speed);
            video.playbackRate = speed;
            speedOptions.querySelectorAll('.s-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            showToast(`Speed: ${speed}×`);
        });
    }

    // Quality chips
    if (qualityOptions) {
        qualityOptions.addEventListener('click', event => {
            const chip = event.target.closest('.s-chip');
            if (!chip) return;
            setQuality(Number(chip.dataset.quality));
        });
    }

    // Server chips
    if (serverOptions) {
        serverOptions.addEventListener('click', async event => {
            const chip = event.target.closest('.s-chip');
            if (!chip) return;
            const server = SERVERS.find(s => s.id === chip.dataset.server);
            if (!server || server === currentServer) return; // Ignore if already selected

            spinner.style.display = 'block';
            currentServer = server;
            updateServerActive();

            window.VIDEO_STREAM_URL = server.value;
            await loadVideoSource();
            buildQualityOptions();

            spinner.style.display = 'none';
            showToast(`${server.name} connected`);
        });
    }

    // Caption sync link toggle
    if (captionSyncLinkElement && captionSyncContainer) {
        captionSyncLinkElement.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            captionsyncOpen = !captionsyncOpen;
            captionSyncContainer.style.display = captionsyncOpen ? 'block' : 'none';
        });
    }

    // Caption sync slider
    if (captionSyncSlider) {
        captionSyncSlider.addEventListener('input', event => {
            updateCaptionSyncUI(Number(event.target.value));
        });
    }

    // Caption sync buttons
    if (syncBtnLeft) {
        syncBtnLeft.addEventListener('click', () => {
            updateCaptionSyncUI(Math.round((captionSyncDelay - 0.1) * 10) / 10);
        });
    }
    if (syncBtnRight) {
        syncBtnRight.addEventListener('click', () => {
            updateCaptionSyncUI(Math.round((captionSyncDelay + 0.1) * 10) / 10);
        });
    }

    // Caption style sliders
    if (captionFontSize) {
        captionFontSize.addEventListener('input', event => {
            captionSettings.fontSize = Number(event.target.value);
            applyCaptionStyle();
            saveCaptionSettings();
        });
    }
    if (captionBgOpacity) {
        captionBgOpacity.addEventListener('input', event => {
            captionSettings.bgOpacity = Number(event.target.value);
            applyCaptionStyle();
            saveCaptionSettings();
        });
    }

    // PiP
    pipBtn.addEventListener('click', async () => {
        if (!document.pictureInPictureEnabled) { showToast('Picture-in-Picture not supported'); return; }
        try {
            if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else await video.requestPictureInPicture();
        } catch { showToast('Unable to enter Picture-in-Picture'); }
    });

    // Fullscreen
    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

    // Keyboard shortcuts
    document.addEventListener('keydown', event => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;
        switch (event.key) {
            case 'k':
            case 'K':
                event.preventDefault();
                togglePlay();
                break;

            case ' ':
                event.preventDefault();
                if (!event.repeat) {
                    startSpaceHold();
                }
                break;
            case 'm': case 'M':
                toggleMute(); break;
            case 'f': case 'F':
                toggleFullscreen(); break;
            case 'c': case 'C':
                toggleEnglishSubtitles(); break;
            case 'ArrowRight':
                showToast('<i data-feather="fast-forward" style="margin-right:6px;"></i> 10s', 1000);
                if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14, fill: 'currentColor' });
                video.currentTime = Math.min((video.currentTime || 0) + 10, video.duration || Infinity);
                break;
            case 'ArrowLeft':
                showToast('<i data-feather="rewind" style="margin-right:6px;"></i> 10s', 1000);
                if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14, fill: 'currentColor' });
                video.currentTime = Math.max((video.currentTime || 0) - 10, 0);
                break;
            case 'ArrowUp':
                video.volume = Math.min(video.volume + 0.05, 1);
                volumeSlider.value = video.volume;
                updateVolumeIcon();
                showToast('<i data-feather="volume-2" style="margin-right:6px;"></i>' + Math.round(video.volume * 100) + '%', 1000);
                if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14, fill: 'currentColor' });
                updateVolumeIcon();
                break;
            case 'ArrowDown':
                video.volume = Math.max(video.volume - 0.05, 0);
                volumeSlider.value = video.volume;
                updateVolumeIcon();
                showToast('<i data-feather="volume-2" style="margin-right:6px;"></i>' + Math.round(video.volume * 100) + '%', 1000);
                if (typeof feather !== 'undefined') feather.replace({ width: 14, height: 14, fill: 'currentColor' });
                updateVolumeIcon();
                break;
        }
        if (!spaceHeld) showControls();
    });

    // Mouse / touch to show controls
    ['mousemove', 'touchstart', 'touchmove', 'mouseenter'].forEach(eventName => {
        playerWrap.addEventListener(eventName, showControls, { passive: true });
    });

    // Video state events
    video.addEventListener('play', () => { updatePlayState(); updatePauseOverlay(); showControls(); });
    video.addEventListener('pause', () => { updatePlayState(); updatePauseOverlay(); showControls(); savePlaybackTime(); });
    video.addEventListener('ended', () => { updatePlayState(); if (window.IS_TV) { goToNextEpisode(); } localStorage.removeItem(getResumeKey()); spinner.style.display = 'none'; });
    video.addEventListener('waiting', () => { if (!video.paused && !video.ended) spinner.style.display = 'block'; });
    video.addEventListener('playing', () => { spinner.style.display = 'none'; });
    video.addEventListener('canplay', () => { spinner.style.display = 'none'; });
    video.addEventListener('volumechange', updateVolumeIcon);
    video.addEventListener('timeupdate', () => {
        updateProgressUi();
        updateSubtitleOverlay();
        updateProgressUiAt(video.currentTime || 0);
        updateEpisodeActions();
    });
    video.addEventListener('playing', () => { window.LaunchScreen?.onPlaybackStart(); });
    video.addEventListener('progress', updateProgressUi);
    video.addEventListener('durationchange', updateProgressUi);
    video.addEventListener('loadedmetadata', updateProgressUi);
    video.addEventListener('seeked', () => {
        if (!captionsEnabled || !englishSubtitleTrack?.track) return;
        englishSubtitleTrack.track.mode = 'disabled';
        requestAnimationFrame(() => {
            englishSubtitleTrack.track.mode = 'hidden';
            updateSubtitleOverlay();
        });
    });

    let holdTimeout;
    let isHolding = false;
    let pausedDuringHold = false;
    let spaceHeld = false;
    let spaceHoldTriggered = false;

    const startHold = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;

        isHolding = false;
        holdTimeout = setTimeout(() => {
            isHolding = true;
            video.playbackRate = 1.5;

            speedToast.classList.add('show');
            if (video.paused) {
                video.play();
                pausedDuringHold = true;
            }
        }, 400); // 400ms threshold to detect a "hold"
    };

    const endHold = (e) => {
        clearTimeout(holdTimeout);
        speedToast.classList.remove('show')

        if (isHolding) {
            video.playbackRate = 1.0;
            e.preventDefault();
        } else if (e.type === 'click') {
            togglePlay();
        }
        if (pausedDuringHold) {
            video.pause();
            pausedDuringHold = false;
        }
    };

    const startSpaceHold = () => {
        if (spaceHeld) return;

        spaceHeld = true;
        spaceHoldTriggered = false;

        holdTimeout = setTimeout(() => {
            spaceHoldTriggered = true;
            isHolding = true;
            video.playbackRate = 1.5;

            speedToast.classList.add('show');

            if (video.paused) {
                video.play();
                pausedDuringHold = true;
            }
        }, 400);
    };

    const endSpaceHold = () => {
        if (!spaceHeld) return;

        clearTimeout(holdTimeout);

        if (spaceHoldTriggered) {
            video.playbackRate = 1.0;
            speedToast.classList.remove('show');
            isHolding = false;
        } else {
            togglePlay();
        }

        if (pausedDuringHold) {
            video.pause();
            pausedDuringHold = false;
        }

        spaceHeld = false;
        spaceHoldTriggered = false;
    };

    // Mouse Events
    video.addEventListener('mousedown', startHold);
    video.addEventListener('click', endHold);
    video.addEventListener('mouseleave', () => {
        if (isHolding) {
            clearTimeout(holdTimeout);
            video.playbackRate = 1.0;
            isHolding = false;
        }
    });

    // Touch Events
    video.addEventListener('touchstart', startHold, { passive: true });
    video.addEventListener('touchend', endHold);
    video.addEventListener('touchcancel', () => {
        clearTimeout(holdTimeout);
        video.playbackRate = 1.0;
        isHolding = false;
    });

    // Spacebar (tap = play/pause, hold = 2x)
    document.addEventListener('keydown', (e) => {
        if (e.code !== 'Space') return;

        e.preventDefault();
        startSpaceHold();
    });

    document.addEventListener('keyup', (e) => {
        if (e.code !== 'Space') return;

        e.preventDefault();
        endSpaceHold();
    });

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    updatePlayState();
    updateVolumeIcon();
    syncCaptionButton();
    buildQualityOptions();
    syncChannelOverlay();
    updatePauseOverlay();
    showControls();
    syncCaptionSettingsUI();
    updateCaptionLanguageMenu();
    setInterval(savePlaybackTime, 5000);
    initPlayer();

    // Hide sync container on boot
    if (captionSyncContainer) captionSyncContainer.style.display = 'none';

    // Feather icons
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof feather !== 'undefined') feather.replace();
    });

    // Expose for external use
    window.toggleDropdownMenu = window.toggleDropdownMenu;
    window.selectFontWeight = window.selectFontWeight;
    window.selectLanguage = window.selectLanguage;
    window.selectFontFamily = window.selectFontFamily;
    window._videoPlayer = video;
    window._hlsPlayer = hls;
})();