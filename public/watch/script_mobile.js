// ─────────────────────────────────────────────────────────────
// PHONE CONTROLS
// Wires up the big center play/pause, rewind 10 / forward 10,
// and back button that only render on phone-width screens.
// Relies on window.PlayerAPI (exposed at the bottom of script.js)
// so it reuses the exact same play/pause/rewind/forward/show-hide
// logic as the desktop controls — no duplicated state.
// ─────────────────────────────────────────────────────────────
(function () {
    function init() {
        const API = window.PlayerAPI;
        if (!API) {
            // script.js hasn't finished setting up yet — try again shortly.
            requestAnimationFrame(init);
            return;
        }

        const BackBtn = document.getElementById('backBtn');
        const phonePlayPause = document.getElementById('phonePlayPause');
        const phoneRewind10Btn = document.getElementById('phoneRewind10Btn');
        const phoneForward10Btn = document.getElementById('phoneForward10Btn');

        // ── Back button (top-left, only shown on phones) ──
        if (BackBtn) {
            BackBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/';
                }
            });
        }

        // ── Big center play / pause ──
        if (phonePlayPause) {
            phonePlayPause.addEventListener('click', (e) => {
                e.stopPropagation();
                API.togglePlay();
                API.showControls();
            });
        }

        // ── Rewind 10s ──
        if (phoneRewind10Btn) {
            phoneRewind10Btn.addEventListener('click', (e) => {
                e.stopPropagation();
                API.rewind(10);
            });
        }

        // ── Forward 10s ──
        if (phoneForward10Btn) {
            phoneForward10Btn.addEventListener('click', (e) => {
                e.stopPropagation();
                API.forward(10);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();