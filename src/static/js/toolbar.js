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

    function createFloatingToolbar({ editor, appEl, isMobile, getBaseEl, baseScale = 0.8 } = {}) {
        if (!editor || !editor.ui?.view?.toolbar?.element) return null;

        const wrap = document.createElement("div");
        wrap.className = "ck-floating-toolbar";
        document.body.appendChild(wrap);

        const inner = document.createElement("div");
        inner.className = "ck-floating-toolbar-inner";
        wrap.appendChild(inner);

        const toolbarEl = editor.ui.view.toolbar.element;
        inner.appendChild(toolbarEl);

        let wantFocusVisible = false;
        let wantSelectionVisible = false;

        let layoutScheduled = false;
        let lastLeft = null;
        let lastWidth = null;
        let lastScale = null;

        function isBlockedByMobileSidebar() {
            if (typeof isMobile !== "function") return false;
            if (!appEl) return false;
            return isMobile() && appEl.classList.contains("sidebar-shown");
        }

        function applyVisibility() {
            const wanted = wantFocusVisible || wantSelectionVisible;
            const allowed = !isBlockedByMobileSidebar();
            wrap.classList.toggle("is-visible", !!(wanted && allowed));
        }

        function hardResetToolbarStyles() {
            toolbarEl.style.setProperty("position", "static", "important");
            toolbarEl.style.setProperty("left", "0px", "important");
            toolbarEl.style.setProperty("right", "auto", "important");
            toolbarEl.style.setProperty("top", "auto", "important");
            toolbarEl.style.setProperty("bottom", "auto", "important");
            toolbarEl.style.setProperty("transform", "none", "important");

            toolbarEl.style.setProperty("display", "inline-flex", "important");
            toolbarEl.style.setProperty("width", "fit-content", "important");
            toolbarEl.style.setProperty("max-width", "none", "important");
            toolbarEl.style.setProperty("margin", "0 auto", "important");
            toolbarEl.style.setProperty("box-sizing", "border-box", "important");
        }

        function layoutToolbar() {
            if (!wrap.classList.contains("is-visible")) return;

            const baseEl = typeof getBaseEl === "function" ? getBaseEl() : null;
            if (!baseEl) return;

            const baseRect = baseEl.getBoundingClientRect();
            const vp = getViewportRect();

            const vpLeft = vp.left;
            const vpRight = vp.left + vp.width;

            const visibleLeft = Math.max(baseRect.left, vpLeft);
            const visibleRight = Math.min(baseRect.right, vpRight);
            const visibleW = Math.max(0, visibleRight - visibleLeft);

            const maxW = 600;
            const margin = Math.max(12, Math.min(28, Math.round(visibleW * 0.06)));
            const gutter = 10;

            let available = Math.round(visibleW - margin * 2);
            available = Math.max(240, Math.min(maxW, available));
            available = Math.min(available, Math.max(240, Math.round(vp.width - gutter * 2)));

            const centerX = visibleLeft + visibleW / 2;
            let left = Math.round(centerX - available / 2);

            const minLeft = Math.round(visibleLeft + gutter);
            const maxLeft = Math.round(visibleRight - available - gutter);
            left = Math.max(minLeft, Math.min(maxLeft, left));

            if (lastLeft !== left) {
                wrap.style.left = `${left}px`;
                wrap.style.right = "auto";
                lastLeft = left;
            }

            if (lastWidth !== available) {
                wrap.style.width = `${available}px`;
                lastWidth = available;
            }

            hardResetToolbarStyles();

            const natural = toolbarEl.scrollWidth || 0;

            const autoScale = natural > 0 ? Math.min(1, available / natural) : 1;
            const scale = Math.min(autoScale, baseScale);
            const rounded = Math.round(scale * 1000) / 1000;

            if (lastScale === null || Math.abs(rounded - lastScale) >= 0.01) {
                inner.style.transformOrigin = "center bottom";
                inner.style.transform = `scale(${rounded})`;
                lastScale = rounded;
            }
        }

        function requestLayout() {
            if (layoutScheduled) return;
            layoutScheduled = true;
            requestAnimationFrame(() => {
                layoutScheduled = false;
                applyVisibility();
                layoutToolbar();
            });
        }

        function bind() {
            editor.ui.focusTracker.on("change:isFocused", () => {
                wantFocusVisible = !!editor.ui.focusTracker.isFocused;
                requestLayout();
            });

            editor.model.document.selection.on("change:range", () => {
                const sel = editor.model.document.selection;
                wantSelectionVisible = !!(sel && !sel.isCollapsed);
                requestLayout();
            });

            window.addEventListener("resize", requestLayout);
            window.addEventListener("scroll", requestLayout, { passive: true });

            if (window.visualViewport) {
                window.visualViewport.addEventListener("resize", requestLayout);
                window.visualViewport.addEventListener("scroll", requestLayout);
            }

            const pane = document.querySelector(".editor-pane");
            if (pane) pane.addEventListener("scroll", requestLayout, { passive: true });

            window.addEventListener("toolbar:layout", requestLayout);

            const sidebarEl = document.getElementById("sidebar");
            if (sidebarEl) sidebarEl.addEventListener("transitionend", requestLayout);
            if (appEl) appEl.addEventListener("transitionend", requestLayout);

            if (appEl) {
                const mo = new MutationObserver(() => requestLayout());
                mo.observe(appEl, { attributes: true, attributeFilter: ["class"] });
            }

            requestLayout();
        }

        bind();

        return {
            requestLayout,
        };
    }

    window.Toolbar = { createFloatingToolbar };
})();
