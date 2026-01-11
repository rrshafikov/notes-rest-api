(function () {
    "use strict";

    function createSidebar({ appEl, btnEl, backdropEl, isMobile, onToggle } = {}) {
        function isCollapsedDesktop() {
            return localStorage.getItem("sidebarCollapsedDesktop") === "1";
        }

        function setCollapsedDesktop(collapsed) {
            localStorage.setItem("sidebarCollapsedDesktop", collapsed ? "1" : "0");
            if (appEl) appEl.classList.toggle("sidebar-collapsed", collapsed);
            if (typeof onToggle === "function") onToggle();
        }

        function showMobile() {
            if (!appEl) return;
            appEl.classList.add("sidebar-shown");
            if (backdropEl) backdropEl.hidden = false;
            if (typeof onToggle === "function") onToggle();
        }

        function hideMobile() {
            if (!appEl) return;
            appEl.classList.remove("sidebar-shown");
            if (backdropEl) backdropEl.hidden = true;
            if (typeof onToggle === "function") onToggle();
        }

        function toggle() {
            const mobile = typeof isMobile === "function" ? isMobile() : false;

            if (mobile) {
                const shown = appEl && appEl.classList.contains("sidebar-shown");
                if (shown) hideMobile();
                else showMobile();
                return;
            }

            const collapsed = appEl && appEl.classList.contains("sidebar-collapsed");
            setCollapsedDesktop(!collapsed);
        }

        function applyInitialState() {
            const mobile = typeof isMobile === "function" ? isMobile() : false;

            if (!appEl) return;

            if (mobile) {
                appEl.classList.remove("sidebar-collapsed");
                hideMobile();
                return;
            }

            appEl.classList.remove("sidebar-shown");
            if (backdropEl) backdropEl.hidden = true;
            setCollapsedDesktop(isCollapsedDesktop());
        }

        function bindUI() {
            if (btnEl) btnEl.addEventListener("click", () => toggle());
            if (backdropEl) backdropEl.addEventListener("click", () => hideMobile());

            window.matchMedia("(max-width: 860px)").addEventListener("change", () => applyInitialState());

            document.addEventListener(
                "keydown",
                (e) => {
                    if (e.key === "Escape" && (typeof isMobile === "function" ? isMobile() : false)) {
                        hideMobile();
                    }
                },
                { capture: true }
            );
        }

        return {
            applyInitialState,
            bindUI,
            toggle,
            showMobile,
            hideMobile,
            isCollapsedDesktop,
            setCollapsedDesktop,
        };
    }

    window.Sidebar = { createSidebar };
})();
