(function () {
    "use strict";

    function getViewportRect() {
        const vv = window.visualViewport;
        if (vv) {
            return {
                left: vv.offsetLeft || 0,
                top: vv.offsetTop || 0,
                width: vv.width,
                height: vv.height,
            };
        }
        const w = document.documentElement.clientWidth || window.innerWidth || 0;
        const h = document.documentElement.clientHeight || window.innerHeight || 0;
        return { left: 0, top: 0, width: w, height: h };
    }

    function createSnackbar(snackbarEl, getBaseEl) {
        let timer = null;
        let layoutScheduled = false;

        function layout() {
            if (!snackbarEl) return;

            const baseEl = typeof getBaseEl === "function" ? getBaseEl() : null;
            if (!baseEl) return;

            const baseRect = baseEl.getBoundingClientRect();
            const vp = getViewportRect();

            const vpLeft = vp.left;
            const vpRight = vp.left + vp.width;

            const visibleLeft = Math.max(baseRect.left, vpLeft);
            const visibleRight = Math.min(baseRect.right, vpRight);
            const visibleW = Math.max(0, visibleRight - visibleLeft);

            const centerX = Math.round(visibleLeft + visibleW / 2);
            snackbarEl.style.left = `${centerX}px`;

            const maxW = Math.max(240, Math.min(560, Math.round(visibleW - 24)));
            snackbarEl.style.maxWidth = `${maxW}px`;
        }

        function requestLayout() {
            if (layoutScheduled) return;
            layoutScheduled = true;
            requestAnimationFrame(() => {
                layoutScheduled = false;
                layout();
            });
        }

        function show(text, ms = 1800) {
            if (!snackbarEl) return;

            snackbarEl.textContent = String(text || "");

            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            requestLayout();
            snackbarEl.classList.add("is-visible");

            timer = setTimeout(() => {
                snackbarEl.classList.remove("is-visible");
            }, ms);
        }

        function bindAutoLayout() {
            if (!snackbarEl) return;

            window.addEventListener("resize", requestLayout);
            window.addEventListener("scroll", requestLayout, { passive: true });

            if (window.visualViewport) {
                window.visualViewport.addEventListener("resize", requestLayout);
                window.visualViewport.addEventListener("scroll", requestLayout);
            }

            const pane = document.querySelector(".editor-pane");
            if (pane) pane.addEventListener("scroll", requestLayout, { passive: true });

            window.addEventListener("toolbar:layout", requestLayout);

            requestLayout();
        }

        return {
            show,
            layout: requestLayout,
            bindAutoLayout,
        };
    }

    window.Snackbar = { createSnackbar };
})();
