/* =========================================================
   作业站 · shared interactions
   - background doodles
   - scroll reveal
   - page transitions + button ripple
   - local password-protected edit mode
   ========================================================= */

(function () {
  "use strict";

  const PAGE = document.body.dataset.page || "home";
  const CONTENT_KEY = "gyj-homework-content-v1";
  const EDIT_SESSION_KEY = "gyj-homework-edit-session";
  const EDIT_PASSWORD = "GYJ2026"; // 前端演示密码，可在源码中修改
  const EDITABLE_PAGES = new Set(["home", "agent"]);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let revealObserver = null;
  let toastTimer = null;
  let editSnapshot = new Map();
  let editEnabled = false;

  /* -------------------------------------------------------
     Background doodles
     ------------------------------------------------------- */

  function injectDoodles() {
    const holder = document.createElement("div");
    holder.className = "bg-doodles";
    holder.setAttribute("aria-hidden", "true");
    holder.innerHTML = `
      <span class="doodle">★</span>
      <span class="doodle"></span>
      <span class="doodle"></span>
      <span class="doodle">+</span>
      <span class="doodle"></span>
      <span class="doodle"></span>
      <span class="doodle">×</span>
    `;
    document.body.prepend(holder);
  }

  /* -------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------- */

  function initReveal() {
    const elements = $$(".reveal");
    if (!elements.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    elements.forEach((element) => revealObserver.observe(element));
  }

  /* -------------------------------------------------------
     Page transitions
     ------------------------------------------------------- */

  function initPageTransitions() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;

      if (editEnabled) {
        const saved = saveEdits();
        if (!saved) {
          event.preventDefault();
          return;
        }
      }

      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      if (target.pathname === window.location.pathname && target.hash) return;

      event.preventDefault();
      if (reduceMotion) {
        window.location.href = target.href;
        return;
      }

      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = target.href;
      }, 170);
    });

    window.addEventListener("pageshow", () => {
      document.body.classList.remove("is-leaving");
    });
  }

  /* -------------------------------------------------------
     Button ripples
     ------------------------------------------------------- */

  function initRipples() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".btn, .back-button, .run-btn, .copy-btn, .tool-btn");
      if (!button || button.disabled) return;

      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
    });
  }

  /* -------------------------------------------------------
     Saved content
     ------------------------------------------------------- */

  function readStore() {
    try {
      const raw = localStorage.getItem(CONTENT_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(CONTENT_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  function applySavedContent() {
    const store = readStore();
    $$("[data-edit-id]").forEach((element) => {
      const key = element.dataset.editId;
      if (typeof store[key] === "string" && store[key].trim()) {
        element.textContent = store[key];
      }
    });
    updateAgentSummary();
  }

  function collectEditableValues() {
    const values = {};
    $$("[data-edit-id]").forEach((element) => {
      const text = element.innerText.replace(/\s+/g, " ").trim();
      if (text) values[element.dataset.editId] = text;
    });
    return values;
  }

  /* -------------------------------------------------------
     Agent derived summary
     ------------------------------------------------------- */

  function readText(id) {
    const element = $(`[data-edit-id="${id}"]`);
    return element ? element.innerText.replace(/\s+/g, " ").trim() : "";
  }

  function updateAgentSummary() {
    if (PAGE !== "agent") return;

    const entries = [
      {
        id: "workbuddy",
        name: readText("agent.workbuddy.name"),
        result: readText("agent.workbuddy.result"),
        efficiency: readText("agent.workbuddy.efficiency")
      },
      {
        id: "codex",
        name: readText("agent.codex.name"),
        result: readText("agent.codex.result"),
        efficiency: readText("agent.codex.efficiency")
      }
    ];

    entries.forEach((entry) => {
      const daysMatch = entry.efficiency.match(/\d+(?:\.\d+)?/);
      const days = daysMatch ? daysMatch[0] : "—";
      const nameTarget = $(`[data-derived="${entry.id}-name"]`);
      const daysTarget = $(`[data-derived="${entry.id}-days"]`);
      const resultTarget = $(`[data-derived="${entry.id}-result"]`);
      const bar = $(`[data-bar="${entry.id}"]`);

      if (nameTarget) nameTarget.textContent = entry.name || "—";
      if (daysTarget) daysTarget.textContent = days;
      if (resultTarget) resultTarget.textContent = entry.result || "—";
      if (bar) {
        const numeric = Number.parseFloat(days);
        const width = Number.isFinite(numeric) ? Math.max(8, Math.min(100, (numeric / 4) * 100)) : 8;
        bar.style.setProperty("--bar", `${width}%`);
      }
    });
  }

  /* -------------------------------------------------------
     Toast
     ------------------------------------------------------- */

  function showToast(message, isError = false) {
    let toast = $("#siteToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "siteToast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* -------------------------------------------------------
     Edit mode
     ------------------------------------------------------- */

  function injectEditUI() {
    if (!EDITABLE_PAGES.has(PAGE)) return;

    if (PAGE === "home") {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "edit-toggle";
      toggle.id = "editToggle";
      toggle.title = "输入密码后开启编辑模式";
      toggle.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="12" cy="15" r="1.4" fill="currentColor"/>
        </svg>
        <span>编辑模式</span>
      `;
      document.body.appendChild(toggle);

      const modal = document.createElement("dialog");
      modal.className = "editor-modal";
      modal.id = "editorModal";
      modal.setAttribute("aria-label", "进入编辑模式");
      modal.innerHTML = `
        <div class="editor-modal-inner">
          <button class="modal-close" type="button" data-modal-close aria-label="关闭">×</button>
          <p class="eyebrow"><span class="eyebrow-box">PRIVATE</span><span class="eyebrow-line"></span>EDIT MODE</p>
          <h2>进入编辑模式</h2>
          <p>输入密码后，可以修改姓名、Agent 信息与结尾标语。代码和运行结果不开放编辑。</p>
          <form id="editPasswordForm">
            <div class="password-field">
              <label for="editPassword">编辑密码</label>
              <input id="editPassword" name="password" type="password" autocomplete="current-password" placeholder="请输入密码">
            </div>
            <p class="password-error" id="passwordError">密码错误，请重试。</p>
            <div class="modal-actions">
              <button class="btn" type="button" data-modal-close>取消</button>
              <button class="btn btn-dark" type="submit">确认</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      toggle.addEventListener("click", () => {
        const input = $("#editPassword");
        input.value = "";
        $("#passwordError").classList.remove("is-visible");
        modal.showModal();
        window.setTimeout(() => input.focus(), 50);
      });

      modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-modal-close]") || event.target === modal) {
          modal.close();
        }
      });

      $("#editPasswordForm").addEventListener("submit", (event) => {
        event.preventDefault();
        const input = $("#editPassword");
        const error = $("#passwordError");
        if (input.value === EDIT_PASSWORD) {
          modal.close();
          enableEditing();
          return;
        }
        error.classList.add("is-visible");
        input.classList.remove("shake");
        void input.offsetWidth;
        input.classList.add("shake");
        input.select();
      });
    }

    const toolbar = document.createElement("div");
    toolbar.className = "edit-toolbar";
    toolbar.setAttribute("role", "region");
    toolbar.setAttribute("aria-label", "内容编辑工具栏");
    toolbar.innerHTML = `
      <span class="edit-state" data-edit-state>编辑模式已开启</span>
      <button class="tool-btn tool-btn-save" type="button" data-edit-save>保存修改</button>
      <button class="tool-btn" type="button" data-edit-exit>退出编辑</button>
    `;
    document.body.appendChild(toolbar);
  }

  function setEditable(state) {
    $$("[data-edit-id]").forEach((element) => {
      element.setAttribute("contenteditable", state ? "true" : "false");
      element.setAttribute("spellcheck", state ? "false" : "true");
    });
  }

  function enableEditing() {
    if (!EDITABLE_PAGES.has(PAGE)) return;

    editEnabled = true;
    editSnapshot = new Map(
      $$("[data-edit-id]").map((element) => [element.dataset.editId, element.innerText])
    );
    document.body.classList.add("is-editing");
    setEditable(true);
    try {
      sessionStorage.setItem(EDIT_SESSION_KEY, "1");
    } catch (error) {
      // Session storage may be unavailable; editing still works on this page.
    }
    const state = $("[data-edit-state]");
    if (state) state.textContent = "编辑模式已开启";
    updateAgentSummary();
  }

  function disableEditing({ restore = true, notify = true } = {}) {
    if (!editEnabled) return;

    if (restore) {
      editSnapshot.forEach((value, key) => {
        const element = $(`[data-edit-id="${key}"]`);
        if (element) element.textContent = value;
      });
    }

    editEnabled = false;
    document.body.classList.remove("is-editing");
    setEditable(false);
    try {
      sessionStorage.removeItem(EDIT_SESSION_KEY);
    } catch (error) {
      // Ignore unavailable session storage.
    }
    updateAgentSummary();
    if (notify) showToast("已退出编辑模式");
  }

  function saveEdits() {
    if (!editEnabled) return false;

    const values = collectEditableValues();
    const empty = $$("[data-edit-id]").find((element) => !element.innerText.trim());
    if (empty) {
      showToast("内容不能为空，请补全后再保存。", true);
      empty.focus();
      return false;
    }

    const next = Object.assign({}, readStore(), values);
    if (!writeStore(next)) {
      showToast("浏览器阻止了本地保存，请检查隐私设置。", true);
      return false;
    }

    editSnapshot = new Map(
      $$("[data-edit-id]").map((element) => [element.dataset.editId, element.innerText])
    );
    updateAgentSummary();
    const state = $("[data-edit-state]");
    if (state) state.textContent = "修改已保存";
    showToast("保存成功，刷新页面后仍会保留。");
    return true;
  }

  function initEditMode() {
    if (!EDITABLE_PAGES.has(PAGE)) return;

    injectEditUI();
    applySavedContent();

    let active = false;
    try {
      active = sessionStorage.getItem(EDIT_SESSION_KEY) === "1";
    } catch (error) {
      active = false;
    }
    if (active) enableEditing();

    $$("[data-edit-id]").forEach((element) => {
      element.addEventListener("input", () => {
        if (!editEnabled) return;
        const state = $("[data-edit-state]");
        if (state) state.textContent = "编辑中 · 有未保存修改";
        updateAgentSummary();
      });

      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
      });
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-edit-save]")) {
        saveEdits();
      }
      if (event.target.closest("[data-edit-exit]")) {
        disableEditing();
      }
    });
  }

  /* -------------------------------------------------------
     Copy code buttons
     ------------------------------------------------------- */

  function initCopyButtons() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy]");
      if (!button) return;

      const code = document.getElementById(button.dataset.copy);
      if (!code) return;
      const text = code.innerText;

      try {
        await navigator.clipboard.writeText(text);
        showToast("代码已复制");
      } catch (error) {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          showToast("代码已复制");
        } catch (copyError) {
          showToast("复制失败，请手动选择代码。", true);
        }
        area.remove();
      }
    });
  }

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */

  injectDoodles();
  initReveal();
  initPageTransitions();
  initRipples();
  initCopyButtons();
  initEditMode();
  applySavedContent();
})();
