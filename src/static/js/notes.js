(function () {
    "use strict";

    const API_NOTES = "/api/notes/";
    const appEl = document.getElementById("app");
    const listEl = document.getElementById("notes-list");
    const titleEl = document.getElementById("note-title");

    const btnNew = document.getElementById("btn-new");
    const btnDelete = document.getElementById("btn-delete");

    const btnSidebar = document.getElementById("btn-sidebar");
    const backdropEl = document.getElementById("sidebar-backdrop");

    const saveIndicator = document.getElementById("save-indicator");

    const snackbarEl = document.getElementById("snackbar");
let snackbarTimer = null;

function getViewportRect() {
    const vv = window.visualViewport;
    if (vv) {
        return {
            left: vv.offsetLeft || 0,
            top: vv.offsetTop || 0,
            width: vv.width,
            height: vv.height
        };
    }
    const w = document.documentElement.clientWidth || window.innerWidth || 0;
    const h = document.documentElement.clientHeight || window.innerHeight || 0;
    return { left: 0, top: 0, width: w, height: h };
}

let snackbarLayoutScheduled = false;

function layoutSnackbar() {
    if (!snackbarEl) return;

    const paneEl = document.querySelector(".editor-pane");
    const wrapEl = document.querySelector(".editor-wrap");
    const baseEl = wrapEl || paneEl;
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

    // ограничиваем ширину по видимой области редактора, чтобы не залезал под сайдбар/края
    const maxW = Math.max(240, Math.min(560, Math.round(visibleW - 24)));
    snackbarEl.style.maxWidth = `${maxW}px`;
}

function requestSnackbarLayout() {
    if (snackbarLayoutScheduled) return;
    snackbarLayoutScheduled = true;
    requestAnimationFrame(() => {
        snackbarLayoutScheduled = false;
        layoutSnackbar();
    });
}


function showSnackbar(text, ms = 1800) {
    if (!snackbarEl) return;

    snackbarEl.textContent = String(text || "");

    if (snackbarTimer) {
        clearTimeout(snackbarTimer);
        snackbarTimer = null;
    }

    requestSnackbarLayout();
    snackbarEl.classList.add("is-visible");

    snackbarTimer = setTimeout(() => {
        snackbarEl.classList.remove("is-visible");
    }, ms);
}


    const INSTRUCTION_ID = "__instruction__";
    const INSTRUCTION_TITLE = "Welcome!";
    const INSTRUCTION_HTML =
        `<h3>This is your notes app.</h3>
        <ul>
            <li>Use the <strong>＋</strong> button to create a note.</li>
            <li>Select a note in the sidebar to open it.</li>
            <li>Everything saves automatically.</li>
            <li>Use toolbar: headings, lists, to-do, quotes, code.</li>
        </ul>
        <p style="opacity:.7">This note is fixed and cannot be edited or deleted.</p>`;

    let editor = null;
    let notes = [];
    let activeId = INSTRUCTION_ID;

    let pendingPatch = null;
    let patchTimer = null;
    let lastSavedPayload = null;

    function isMobile() {
        return window.matchMedia("(max-width: 860px)").matches;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
        return "";
    }

    const csrftoken = getCookie("csrftoken");

    async function apiFetch(url, opts = {}) {
        const method = (opts.method || "GET").toUpperCase();
        const headers = Object.assign({ "Accept": "application/json" }, opts.headers || {});

        if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
            headers["X-CSRFToken"] = csrftoken;
            if (!headers["Content-Type"] && opts.body) headers["Content-Type"] = "application/json";
        }

        const res = await fetch(url, Object.assign({ credentials: "same-origin", headers }, opts));

        if (!res.ok) {
            const t = await res.text().catch(() => "");
            throw new Error(`${res.status} ${res.statusText}${t ? `: ${t}` : ""}`);
        }

        if (res.status === 204) return null;
        return res.json();
    }

    function setIndicator(text) {
        saveIndicator.textContent = text || "";
    }

    function normalizeTitle(t) {
        const s = String(t || "").trim();
        return s.length ? s : "Untitled";
    }

    function instructionItem() {
        return { id: INSTRUCTION_ID, title: INSTRUCTION_TITLE, _isInstruction: true };
    }

    function orderedItems() {
        return [instructionItem(), ...notes];
    }

    function renderList() {
        listEl.innerHTML = "";

        for (const n of orderedItems()) {
            const item = document.createElement("div");
            item.className = "note-item" + (n.id === activeId ? " active" : "");
            item.dataset.id = String(n.id);

            const title = document.createElement("div");
            title.className = "note-item-title";
            title.textContent = normalizeTitle(n.title);
            item.appendChild(title);

            const sub = document.createElement("div");
            sub.className = "note-item-sub";
            sub.textContent = n.id === INSTRUCTION_ID ? "Instruction" : "";
            item.appendChild(sub);

            item.addEventListener("click", async () => {
                await openById(n.id);
                if (isMobile()) hideSidebarMobile();
            });

            listEl.appendChild(item);
        }
    }

    function onEsc(e) {
        if (e.key === "Escape" && isMobile()) hideSidebarMobile();
    }

    function isSidebarCollapsedDesktop() {
        return localStorage.getItem("sidebarCollapsedDesktop") === "1";
    }

    function setSidebarCollapsedDesktop(collapsed) {
        localStorage.setItem("sidebarCollapsedDesktop", collapsed ? "1" : "0");
        appEl.classList.toggle("sidebar-collapsed", collapsed);
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function showSidebarMobile() {
        appEl.classList.add("sidebar-shown");
        backdropEl.hidden = false;
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function hideSidebarMobile() {
        appEl.classList.remove("sidebar-shown");
        backdropEl.hidden = true;
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function toggleSidebar() {
        if (isMobile()) {
            const shown = appEl.classList.contains("sidebar-shown");
            if (shown) hideSidebarMobile();
            else showSidebarMobile();
            return;
        }

        const collapsed = appEl.classList.contains("sidebar-collapsed");
        setSidebarCollapsedDesktop(!collapsed);
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function setEditorReadonly(isReadonly) {
        if (!editor) return;

        if (typeof editor.enableReadOnlyMode === "function" && typeof editor.disableReadOnlyMode === "function") {
            if (isReadonly) editor.enableReadOnlyMode("fixed-note");
            else editor.disableReadOnlyMode("fixed-note");
        } else {
            editor.isReadOnly = !!isReadonly;
        }
    }

    function safeSetData(html) {
        if (!editor) return;
        editor.setData(html || "");
    }

    function focusEditor() {
        if (!editor) return;
        try {
            editor.editing.view.focus();
        } catch (_) {}
    }

    function autosizeTitle() {
        if (!titleEl) return;
        titleEl.style.height = "auto";
        const h = Math.max(titleEl.scrollHeight || 0, 44);
        titleEl.style.height = `${h}px`;
    }

    function autosizeTitleNextFrame() {
        requestAnimationFrame(() => autosizeTitle());
    }

    async function openInstruction() {
        activeId = INSTRUCTION_ID;
        renderList();

        btnDelete.disabled = true;
        titleEl.value = INSTRUCTION_TITLE;
        titleEl.setAttribute("readonly", "readonly");
        autosizeTitleNextFrame();

        setEditorReadonly(true);
        safeSetData(INSTRUCTION_HTML);

        lastSavedPayload = null;
        pendingPatch = null;

        if (patchTimer) {
            clearTimeout(patchTimer);
            patchTimer = null;
        }

        setIndicator("");
        requestAnimationFrame(() => focusEditor());
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    async function loadNotes() {
        const data = await apiFetch(API_NOTES);
        notes = Array.isArray(data) ? data : (data && data.results) ? data.results : [];
        renderList();
    }

    async function openNote(id) {
        activeId = id;
        renderList();

        btnDelete.disabled = false;
        titleEl.removeAttribute("readonly");
        setEditorReadonly(false);

        const note = await apiFetch(`${API_NOTES}${id}/`);
        titleEl.value = note.title || "";
        autosizeTitleNextFrame();
        safeSetData(note.content || "");

        lastSavedPayload = { title: titleEl.value, content: editor.getData() };
        setIndicator("");

        requestAnimationFrame(() => focusEditor());
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    async function openById(id) {
        if (id === INSTRUCTION_ID) return openInstruction();
        return openNote(id);
    }

    async function createNote() {
        setIndicator("Creating…");

        const created = await apiFetch(API_NOTES, {
            method: "POST",
            body: JSON.stringify({ title: "New note", content: "", is_pinned: false })
        });

        notes = [created, ...notes];
        renderList();
        await openNote(created.id);

        autosizeTitleNextFrame();
        titleEl.focus();
        titleEl.setSelectionRange(0, titleEl.value.length);

        setIndicator("");
        if (isMobile()) hideSidebarMobile();
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    async function deleteActive() {
        if (!activeId || activeId === INSTRUCTION_ID) return;

        const id = activeId;
        btnDelete.disabled = true;
        setIndicator("Deleting…");

        await apiFetch(`${API_NOTES}${id}/`, { method: "DELETE" });

        notes = notes.filter(n => n.id !== id);
        activeId = INSTRUCTION_ID;

        renderList();
        await openInstruction();
        setIndicator("");
        showSnackbar("Moved to Trash");
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function updateLocalNote(id, patch) {
        const idx = notes.findIndex(x => x.id === id);
        if (idx === -1) return;
        notes[idx] = Object.assign({}, notes[idx], patch);
        renderList();
    }

    function scheduleAutosave() {
        if (!activeId || activeId === INSTRUCTION_ID) return;

        const payload = {
            title: titleEl.value || "",
            content: editor.getData() || ""
        };

        const sameAsLast =
            lastSavedPayload &&
            lastSavedPayload.title === payload.title &&
            lastSavedPayload.content === payload.content;

        if (sameAsLast) return;

        pendingPatch = payload;
        setIndicator("Saving…");

        if (patchTimer) clearTimeout(patchTimer);
        patchTimer = setTimeout(flushAutosave, 500);
    }

    async function flushAutosave() {
        if (!activeId || activeId === INSTRUCTION_ID || !pendingPatch) return;

        const payload = pendingPatch;
        pendingPatch = null;

        try {
            const saved = await apiFetch(`${API_NOTES}${activeId}/`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            lastSavedPayload = { title: saved.title || "", content: saved.content || "" };
            updateLocalNote(activeId, { title: saved.title || "" });

            setIndicator("Saved");
            setTimeout(() => {
                if (saveIndicator.textContent === "Saved") setIndicator("");
            }, 700);
        } catch (_) {
            setIndicator("Save error");
        }
    }

 function mountFloatingToolbar() {
    const wrap = document.createElement("div");
    wrap.className = "ck-floating-toolbar";
    document.body.appendChild(wrap);

    // inner: на нём будет scale, он центрирует контент
    const inner = document.createElement("div");
    inner.className = "ck-floating-toolbar-inner";
    wrap.appendChild(inner);

    const toolbarEl = editor.ui.view.toolbar.element;
    inner.appendChild(toolbarEl);

    let wantFocusVisible = false;
    let wantSelectionVisible = false;

    function isBlockedByMobileSidebar() {
        return isMobile() && appEl.classList.contains("sidebar-shown");
    }

    function applyVisibility() {
        const wanted = (wantFocusVisible || wantSelectionVisible);
        const allowed = !isBlockedByMobileSidebar();
        wrap.classList.toggle("is-visible", !!(wanted && allowed));
    }

    let layoutScheduled = false;
    let lastLeft = null;
    let lastWidth = null;
    let lastScale = null;

    function requestLayout() {
        if (layoutScheduled) return;
        layoutScheduled = true;
        requestAnimationFrame(() => {
            layoutScheduled = false;
            applyVisibility();
            layoutToolbar();
        });
    }

    function getViewportRect() {
        const vv = window.visualViewport;
        if (vv) {
            return {
                left: vv.offsetLeft || 0,
                top: vv.offsetTop || 0,
                width: vv.width,
                height: vv.height
            };
        }
        const w = document.documentElement.clientWidth || window.innerWidth || 0;
        const h = document.documentElement.clientHeight || window.innerHeight || 0;
        return { left: 0, top: 0, width: w, height: h };
    }

    function hardResetToolbarStyles() {
        // ВАЖНО: сбрасываем любые смещения, которые CK мог оставить
        toolbarEl.style.setProperty("position", "static", "important");
        toolbarEl.style.setProperty("left", "0px", "important");
        toolbarEl.style.setProperty("right", "auto", "important");
        toolbarEl.style.setProperty("top", "auto", "important");
        toolbarEl.style.setProperty("bottom", "auto", "important");
        toolbarEl.style.setProperty("transform", "none", "important");

        // делаем тулбар "по контенту", чтобы он реально центрировался
        toolbarEl.style.setProperty("display", "inline-flex", "important");
        toolbarEl.style.setProperty("width", "fit-content", "important");
        toolbarEl.style.setProperty("max-width", "none", "important");
        toolbarEl.style.setProperty("margin", "0 auto", "important");
        toolbarEl.style.setProperty("box-sizing", "border-box", "important");
    }

    function layoutToolbar() {
        if (!wrap.classList.contains("is-visible")) return;

        const paneEl = document.querySelector(".editor-pane");
        const wrapEl = document.querySelector(".editor-wrap");
        const baseEl = wrapEl || paneEl;
        if (!baseEl) return;

        const baseRect = baseEl.getBoundingClientRect();
        const vp = getViewportRect();

        const vpLeft = vp.left;
        const vpRight = vp.left + vp.width;

        // видимая часть редактора (пересечение с viewport)
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

        // 1) сбросить смещения/transform у тулбара
        hardResetToolbarStyles();

        // 2) измерить натуральную ширину и применить scale к INNER
        const natural = toolbarEl.scrollWidth || 0;
        const BASE_SCALE = 0.8; // ← подбери: 0.9 / 0.85 / 0.8

        const autoScale = natural > 0 ? Math.min(1, available / natural) : 1;
        const scale = Math.min(autoScale, BASE_SCALE);
        const rounded = Math.round(scale * 1000) / 1000;

        if (lastScale === null || Math.abs(rounded - lastScale) >= 0.01) {
            inner.style.transformOrigin = "center bottom";
            inner.style.transform = `scale(${rounded})`;
            lastScale = rounded;
        }
    }

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
    appEl.addEventListener("transitionend", requestLayout);

    const mo = new MutationObserver(() => requestLayout());
    mo.observe(appEl, { attributes: true, attributeFilter: ["class"] });

    requestLayout();
}


    async function initEditor() {
        const el = document.getElementById("editor");

        editor = await CKEDITOR.ClassicEditor.create(el, {
            toolbar: {
                items: [
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "underline",
                    "link",
                    "|",
                    "bulletedList",
                    "numberedList",
                    "todoList",
                ],
                shouldNotGroupWhenFull: true
            },
            placeholder: "Start writing…",
            heading: {
                options: [
                    { model: "paragraph", title: "text", class: "ck-heading_paragraph" },
                    { model: "heading1", view: "h1", title: "H1", class: "ck-heading_heading1" },
                    { model: "heading2", view: "h2", title: "H2", class: "ck-heading_heading2" },
                    { model: "heading3", view: "h3", title: "H3", class: "ck-heading_heading3" }
                ]
            },
            removePlugins: [
                "Pagination",
                "PaginationEditing",
                "PaginationUI",
                "TableOfContents",
                "TableOfContentsUI",
                "TableOfContentsEditing",
                "PasteFromOfficeEnhanced",
                "PasteFromOfficeEnhancedPropagator",
                "RestrictedEditingMode",
                "RestrictedEditingModeEditing",
                "RestrictedEditingModeUI",
                "RestrictedEditingException",
                "StandardEditingMode",
                "AIAssistant",
                "CKBox",
                "CKFinder",
                "EasyImage",
                "RealTimeCollaborativeComments",
                "RealTimeCollaborativeTrackChanges",
                "RealTimeCollaborativeRevisionHistory",
                "PresenceList",
                "Comments",
                "TrackChanges",
                "TrackChangesData",
                "RevisionHistory",
                "WProofreader",
                "MathType",
                "SlashCommand",
                "Template",
                "DocumentOutline",
                "FormatPainter",
                "Base64UploadAdapter",
                "ListProperties",
            ]
        });

        mountFloatingToolbar();

        setEditorReadonly(false);

        editor.model.document.on("change:data", () => {
            scheduleAutosave();
            window.dispatchEvent(new Event("toolbar:layout"));
        });

        setTimeout(() => {
            try {
                const editable = document.querySelector(".ck.ck-editor__editable_inline");
                if (editable) {
                    editable.style.pointerEvents = "auto";
                    editable.style.userSelect = "text";
                }
            } catch (_) {}
            window.dispatchEvent(new Event("toolbar:layout"));
        }, 0);
    }

    function applyInitialSidebarState() {
        if (isMobile()) {
            appEl.classList.remove("sidebar-collapsed");
            hideSidebarMobile();
            window.dispatchEvent(new Event("toolbar:layout"));
            return;
        }

        appEl.classList.remove("sidebar-shown");
        backdropEl.hidden = true;
        setSidebarCollapsedDesktop(isSidebarCollapsedDesktop());
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function wireUI() {
        btnSidebar.addEventListener("click", () => toggleSidebar());
        backdropEl.addEventListener("click", () => hideSidebarMobile());

        btnNew.addEventListener("click", () => createNote());
        btnDelete.addEventListener("click", () => deleteActive());

        titleEl.addEventListener("input", () => {
            if (!activeId || activeId === INSTRUCTION_ID) return;
            updateLocalNote(activeId, { title: titleEl.value });
            scheduleAutosave();
            autosizeTitleNextFrame();
            window.dispatchEvent(new Event("toolbar:layout"));
        });

        titleEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                focusEditor();
                window.dispatchEvent(new Event("toolbar:layout"));
            }
        });

        window.matchMedia("(max-width: 860px)").addEventListener("change", () => applyInitialSidebarState());
        document.addEventListener("keydown", onEsc, { capture: true });


    }

    async function bootstrap() {
        applyInitialSidebarState();
        wireUI();
        autosizeTitleNextFrame();
        await initEditor();
        await loadNotes();
        await openInstruction();
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    bootstrap().catch(() => setIndicator("Load error"));
})();
