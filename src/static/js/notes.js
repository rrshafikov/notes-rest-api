(function () {
    "use strict";

    const API_NOTES = "/api/notes/";
    const INSTRUCTION_ID = "__instruction__";
    const INSTRUCTION_TITLE = "Welcome!";
    const INSTRUCTION_URL = "/static/instruction.html";
    let instructionHtmlCache = null;

    const appEl = document.getElementById("app");
    const listEl = document.getElementById("notes-list");
    const titleEl = document.getElementById("note-title");

    const btnNew = document.getElementById("btn-new");
    const btnDelete = document.getElementById("btn-delete");

    const btnSidebar = document.getElementById("btn-sidebar");
    const backdropEl = document.getElementById("sidebar-backdrop");

    const saveIndicator = document.getElementById("save-indicator");
    const snackbarEl = document.getElementById("snackbar");

    let editor = null;
    let notes = [];
    let activeId = INSTRUCTION_ID;

    let pendingPatch = null;
    let patchTimer = null;
    let lastSavedPayload = null;

    let sidebar = null;
    let snackbar = null;
    let floatingToolbar = null;

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
        const headers = Object.assign({ Accept: "application/json" }, opts.headers || {});

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

    async function loadInstructionHtml() {
        if (instructionHtmlCache) return instructionHtmlCache;

        const res = await fetch(INSTRUCTION_URL, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`Failed to load instruction (${res.status})`);

        instructionHtmlCache = await res.text();
        return instructionHtmlCache;
    }


    function setIndicator(text) {
        if (!saveIndicator) return;
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

    function getUpdatedAt(n) {
        return n.updated_at || n.updatedAt || n.modified_at || n.modifiedAt || n.created_at || n.createdAt || "";
    }

    function formatNoteDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";

        return d.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function renderList() {
        if (!listEl) return;

        listEl.innerHTML = "";

        for (const n of orderedItems()) {
            const item = document.createElement("div");
            item.className = `note-item${n.id === activeId ? " active" : ""}`;
            item.dataset.id = String(n.id);

            const title = document.createElement("div");
            title.className = "note-item-title";
            title.textContent = normalizeTitle(n.title);
            item.appendChild(title);

            const sub = document.createElement("div");
            sub.className = "note-item-sub";

            if (n.id === INSTRUCTION_ID) {
                sub.textContent = "Instruction";
            } else {
                sub.textContent = formatNoteDate(getUpdatedAt(n));
            }

            item.appendChild(sub);

            item.addEventListener("click", async () => {
                await openById(n.id);
                if (isMobile() && sidebar) sidebar.hideMobile();
            });

            listEl.appendChild(item);
        }
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

        if (btnDelete) btnDelete.disabled = true;

        if (titleEl) {
            titleEl.value = INSTRUCTION_TITLE;
            titleEl.setAttribute("readonly", "readonly");
            autosizeTitleNextFrame();
        }

        setEditorReadonly(true);
        try {
            const html = await loadInstructionHtml();
            safeSetData(html);
        } catch (_) {
            safeSetData("<h3>Welcome!</h3><p>Instruction file not found.</p>");
        }

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
        notes = Array.isArray(data) ? data : data && data.results ? data.results : [];
        renderList();
    }

    async function openNote(id) {
        activeId = id;
        renderList();

        if (btnDelete) btnDelete.disabled = false;
        if (titleEl) titleEl.removeAttribute("readonly");
        setEditorReadonly(false);

        const note = await apiFetch(`${API_NOTES}${id}/`);

        if (titleEl) {
            titleEl.value = note.title || "";
            autosizeTitleNextFrame();
        }

        safeSetData(note.content || "");

        lastSavedPayload = {
            title: titleEl ? titleEl.value : "",
            content: editor ? editor.getData() : "",
        };

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
            body: JSON.stringify({ title: "New note", content: "", is_pinned: false }),
        });

        notes = [created, ...notes];
        renderList();
        await openNote(created.id);

        autosizeTitleNextFrame();

        if (titleEl) {
            titleEl.focus();
            titleEl.setSelectionRange(0, titleEl.value.length);
        }

        setIndicator("");
        if (isMobile() && sidebar) sidebar.hideMobile();
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    async function deleteActive() {
        if (!activeId || activeId === INSTRUCTION_ID) return;

        const id = activeId;
        if (btnDelete) btnDelete.disabled = true;
        setIndicator("Deleting…");

        await apiFetch(`${API_NOTES}${id}/`, { method: "DELETE" });

        notes = notes.filter((n) => n.id !== id);
        activeId = INSTRUCTION_ID;

        renderList();
        await openInstruction();
        setIndicator("");
        if (snackbar) snackbar.show("Moved to Trash");
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    function updateLocalNote(id, patch) {
        const idx = notes.findIndex((x) => x.id === id);
        if (idx === -1) return;
        notes[idx] = Object.assign({}, notes[idx], patch);
        renderList();
    }

    function scheduleAutosave() {
        if (!activeId || activeId === INSTRUCTION_ID || !editor || !titleEl) return;

        const payload = {
            title: titleEl.value || "",
            content: editor.getData() || "",
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
                body: JSON.stringify(payload),
            });

            lastSavedPayload = { title: saved.title || "", content: saved.content || "" };

            updateLocalNote(activeId, {
                title: saved.title || "",
                updated_at: saved.updated_at || saved.updatedAt || saved.modified_at || saved.modifiedAt || saved.created_at || saved.createdAt || "",
            });

            setIndicator("Saved");
            setTimeout(() => {
                if (saveIndicator && saveIndicator.textContent === "Saved") setIndicator("");
            }, 700);
        } catch (_) {
            setIndicator("Save error");
        }
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
                shouldNotGroupWhenFull: true,
            },
            placeholder: "Start writing…",
            heading: {
                options: [
                    { model: "paragraph", title: "text", class: "ck-heading_paragraph" },
                    { model: "heading1", view: "h1", title: "H1", class: "ck-heading_heading1" },
                    { model: "heading2", view: "h2", title: "H2", class: "ck-heading_heading2" },
                    { model: "heading3", view: "h3", title: "H3", class: "ck-heading_heading3" },
                ],
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
            ],
        });

        floatingToolbar = window.Toolbar
            ? window.Toolbar.createFloatingToolbar({
                  editor,
                  appEl,
                  isMobile,
                  getBaseEl: () => document.querySelector(".editor-wrap") || document.querySelector(".editor-pane"),
                  baseScale: 0.8,
              })
            : null;

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

    function wireUI() {
        if (btnNew) btnNew.addEventListener("click", () => createNote());
        if (btnDelete) btnDelete.addEventListener("click", () => deleteActive());

        if (titleEl) {
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
        }
    }

    async function bootstrap() {
        sidebar = window.Sidebar
            ? window.Sidebar.createSidebar({
                  appEl,
                  btnEl: btnSidebar,
                  backdropEl,
                  isMobile,
                  onToggle: () => window.dispatchEvent(new Event("toolbar:layout")),
              })
            : null;

        if (sidebar) {
            sidebar.applyInitialState();
            sidebar.bindUI();
        }

        snackbar = window.Snackbar
            ? window.Snackbar.createSnackbar(snackbarEl, () => {
                  const wrapEl = document.querySelector(".editor-wrap");
                  const paneEl = document.querySelector(".editor-pane");
                  return wrapEl || paneEl;
              })
            : null;

        if (snackbar) snackbar.bindAutoLayout();

        autosizeTitleNextFrame();
        wireUI();
        await initEditor();
        await loadNotes();
        await openInstruction();
        window.dispatchEvent(new Event("toolbar:layout"));
    }

    bootstrap().catch(() => setIndicator("Load error"));
})();
