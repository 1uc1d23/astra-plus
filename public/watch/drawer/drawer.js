function initDrawer() {
    //     <div class="drawer-container" id="drawerContainer">
    //     <div class="backdrop" id="backdrop"></div>

    //     <div class="drawer-content" id="drawerContent">
    //         <div class="handle-area" id="handleArea">
    //             <div class="handle"></div>
    //         </div>

    //         <div class="body-content" id="bodyContent">
    //             ...
    //         </div>
    //     </div>
    // </div>
    const wrapper = document.getElementById('app-wrapper');
    const container = document.getElementById('drawerContainer');
    const content = document.getElementById('drawerContent');
    const handle = document.getElementById('handleArea');
    const backdrop = document.getElementById('backdrop');
    const bodyContent = document.getElementById('bodyContent');

    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let hasPulledDown = false;

    const drawerHeight = window.innerHeight * 0.6;

    function updateDynamicStyles(yOffset) {
        let progress = (drawerHeight - yOffset) / drawerHeight;
        progress = Math.max(0, Math.min(progress, 1.1));

        const scale = 1 - (progress * 0.03);
        const translateY = progress * 2;

        wrapper.style.transform = `scale(${scale}) translateY(${translateY}vh)`;
        backdrop.style.opacity = progress;
    }

    function openDrawer() {
        container.classList.add('active');

        content.style.transform = `translate3d(-50%, 100%, 0)`;
        updateDynamicStyles(drawerHeight);

        content.classList.add('smooth-snap');
        wrapper.classList.add('smooth-bg');
        backdrop.classList.add('smooth-bg');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                content.style.transform = `translate3d(-50%, 0, 0)`;
                updateDynamicStyles(0);
            });
        });
    }

    function closeDrawer() {
        content.classList.add('smooth-snap');
        wrapper.classList.add('smooth-bg');
        backdrop.classList.add('smooth-bg');

        content.style.transform = `translate3d(-50%, 100%, 0)`;
        updateDynamicStyles(drawerHeight);

        setTimeout(() => container.classList.remove('active'), 400);
    }

    function startDrag(e) {
        isDragging = true;
        startY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY;

        content.classList.remove('smooth-snap');
        wrapper.classList.remove('smooth-bg');
        backdrop.classList.remove('smooth-bg');

        bodyContent.classList.add('dragging');

        hasPulledDown = false;
    }

    function drag(e) {
        if (!isDragging) return;

        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY;
        if (!clientY) return;

        let deltaY = clientY - startY;

        if (deltaY > 0) {
            hasPulledDown = true;
        }

        if (deltaY < 0) {
            if (hasPulledDown) {
                const MAX_STRETCH = 60;
                const RESISTANCE = 360;

                currentY =
                    -MAX_STRETCH *
                    (1 - Math.exp(deltaY / RESISTANCE));
            } else {
                currentY = 0;
            }
        } else {
            currentY = deltaY;
        }

        content.style.transform =
            `translate3d(-50%, ${Math.round(currentY)}px, 0)`;

        updateDynamicStyles(currentY);
    }

    function endDrag() {
        if (!isDragging) return;
        isDragging = false;

        content.classList.add('smooth-snap');
        wrapper.classList.add('smooth-bg');
        backdrop.classList.add('smooth-bg');

        bodyContent.classList.remove('dragging');

        if (currentY > 120) {
            closeDrawer();
        } else {
            content.style.transform = `translate3d(-50%, 0, 0)`;
            updateDynamicStyles(0);
        }

        currentY = 0;
    }

    handle.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    handle.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('touchend', endDrag);

    backdrop.addEventListener('click', closeDrawer);
    backdrop.addEventListener('touchstart', (e) => {
        // Prevents passing the touch event down to underlying elements
        e.preventDefault();
        closeDrawer();
    }, { passive: false });

    // expose API
    window.openDrawer = openDrawer;
    window.closeDrawer = closeDrawer;
}