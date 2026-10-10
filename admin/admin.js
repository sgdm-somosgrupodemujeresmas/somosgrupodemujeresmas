/* Panel de administración SGM+
 * - Lee y escribe los archivos de la web directamente en GitHub (rama gh-pages).
 * - Cada "Guardar y publicar" es un commit firmado con el nombre de quien entró.
 * - Login: nombre + contraseña. La contraseña descifra el token de GitHub
 *   guardado cifrado en admin/acceso.json (o se puede pegar el token directo).
 */
(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const CFG = {
    owner: "sgdm-somosgrupodemujeresmas",
    repo: "somosgrupodemujeresmas",
    branch: "gh-pages",
    uploadDir: "assets/img/uploads",
    accessFile: "admin/acceso.json",
    authorEmail: "admin@somosgrupodemujeresmas.ar",
    kdfIterations: 600000,
  };

  const PAGES = [
    { file: "index.html", label: "Inicio", icon: "bi-house" },
    { file: "servicios.html", label: "Servicios", icon: "bi-briefcase" },
    { file: "talleres.html", label: "Talleres", icon: "bi-easel" },
    { file: "sesiones.html", label: "Sesiones", icon: "bi-calendar3" },
    { file: "contacto.html", label: "Contacto", icon: "bi-envelope" },
    { file: "test.html", label: "Ferti-test", icon: "bi-clipboard-check" },
  ];

  const AUDIENCIAS = [
    ["paciente", "Pacientes"],
    ["empresa", "Empresas"],
    ["profesional", "Profesionales"],
  ];

  // Listas que la web arma desde archivos JSON (data/*.json)
  const DATASETS = [
    {
      id: "medios",
      file: "data/medios.json",
      label: "En los medios",
      icon: "bi-newspaper",
      intro: "Notas, entrevistas y videos que aparecen en la sección «En los medios» del Inicio. Se ordenan solos por fecha (la más nueva primero).",
      lists: [
        {
          key: "medios",
          label: "Apariciones en medios",
          itemLabel: "Nota",
          titleField: "title",
          thumbField: "cover",
          blank: { type: "article", title: "Nueva nota", source: "", url: "", date: "", cover: "" },
          fields: [
            { key: "title", label: "Título", type: "text" },
            { key: "type", label: "Tipo", type: "select", options: [["article", "Nota / artículo"], ["audio", "Audio / radio"], ["video", "Video"]] },
            { key: "source", label: "Medio (ej: Para Ti, YouTube)", type: "text", half: true },
            { key: "date", label: "Fecha", type: "date", half: true },
            { key: "url", label: "Enlace a la nota", type: "url" },
            { key: "cover", label: "Imagen / logo del medio", type: "image" },
          ],
        },
      ],
    },
    {
      id: "servicios",
      file: "data/servicios.json",
      label: "Servicios",
      icon: "bi-grid",
      intro: "Tarjetas de la página Servicios. Cada servicio aparece en la pestaña del público que marques (pacientes, empresas o profesionales).",
      objects: [
        {
          key: "intros",
          label: "Texto introductorio de cada pestaña",
          fields: AUDIENCIAS.map(([k, l]) => ({ key: k, label: l, type: "textarea" })),
        },
      ],
      lists: [
        {
          key: "servicios",
          label: "Servicios",
          itemLabel: "Servicio",
          titleField: "titulo",
          blank: { titulo: "Nuevo servicio", audiencia: ["paciente"], duracion: "", formato: "", descripcion: "", url: "contacto.html", brochure: null },
          fields: [
            { key: "titulo", label: "Título", type: "text" },
            { key: "audiencia", label: "Se muestra para", type: "checks", options: AUDIENCIAS },
            { key: "formato", label: "Formato (ej: Online / Presencial)", type: "text", half: true },
            { key: "duracion", label: "Duración (ej: 90 min)", type: "text", half: true },
            { key: "descripcion", label: "Descripción", type: "textarea" },
            { key: "url", label: "Enlace del botón «Quiero más info»", type: "url" },
            { key: "brochure", label: "Enlace al programa (opcional, muestra el botón «Ver programa»)", type: "url", nullable: true },
          ],
        },
      ],
    },
  ];

  // Nombres amigables para las secciones de cada página (por id)
  const SECTION_NAMES = {
    hero: "Portada (carrusel principal)",
    about: "Sobre nosotras",
    "about-author": "Lorena Laserre (bio y fotos)",
    impacto: "Impacto emocional",
    "bio-hormonal": "Biografía hormonal",
    menopausia: "Menopausia",
    varones: "También para varones",
    servicios: "Servicios",
    testimonios: "Testimonios",
    "related-books": "Libros",
    talleres: "Talleres",
    medios: "En los medios",
    faq: "Preguntas frecuentes",
    "call-to-action": "Próximo taller (cuenta regresiva)",
    agenda: "Sesiones individuales",
    contact: "Contacto",
    footer: "Pie de página",
  };

  // Partes que no se editan desde el panel (las maneja el código)
  const SKIP_SELECTOR = [
    "script", "style", "svg", "noscript", "template", "form", "nav",
    ".swiper-pagination", ".hero-overlay", ".media-filters", "#media-grid",
    "#servicios-grid", ".emotion-bar", ".countdown > div", "button:not([data-links])",
    'a[href^="javascript"]', ".copyright", ".credits",
  ].join(",");

  const INLINE_TAGS = new Set(["STRONG", "B", "EM", "I", "U", "SMALL", "BR", "A", "SPAN", "SUP", "SUB", "MARK", "S", "ABBR", "CODE"]);
  const LIST_ITEM_TAGS = new Set(["DIV", "LI", "ARTICLE", "A", "SPAN"]);

  // =========================
  // ESTADO
  // =========================
  const state = {
    user: null,
    token: null,
    view: null,
    pages: {}, // file -> { doc, sha, dirty }
    data: {}, // file -> { json, sha, dirty }
    uploads: new Map(), // path -> { b64, url }
    canPages: true,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(c));
    }
    return n;
  };
  const icon = (name) => el("i", { class: "bi " + name, "aria-hidden": "true" });

  // =========================
  // UTILIDADES
  // =========================
  function toast(msg, kind = "", ms = 4500) {
    const t = el("div", { class: "toast " + kind }, msg);
    $("#toasts").append(t);
    setTimeout(() => t.remove(), ms);
  }

  function bytesToB64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  const b64ToBytes = (b64) => Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const textToB64 = (s) => bytesToB64(new TextEncoder().encode(s));
  const b64ToText = (b64) => new TextDecoder().decode(b64ToBytes(b64));

  function slugify(s) {
    return (s || "imagen")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      .slice(0, 40) || "imagen";
  }

  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  function clean(text, max = 60) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  // Ruta de imagen del sitio -> URL que se puede ver desde /admin/
  function resolveSrc(src) {
    if (!src) return "";
    if (state.uploads.has(src)) return state.uploads.get(src).url;
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    return "../" + src.replace(/^\.?\//, "");
  }

  // =========================
  // GITHUB API
  // =========================
  async function gh(path, opts = {}) {
    const res = await fetch("https://api.github.com" + path, {
      ...opts,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + state.token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      let msg = res.status + "";
      try { msg = (await res.json()).message || msg; } catch {}
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }
  const repoPath = (p = "") => `/repos/${CFG.owner}/${CFG.repo}${p}`;

  async function readFile(path, ref = CFG.branch) {
    const enc = path.split("/").map(encodeURIComponent).join("/");
    const info = await gh(repoPath(`/contents/${enc}?ref=${encodeURIComponent(ref)}`));
    let b64 = info.content;
    if (!b64 && info.sha) b64 = (await gh(repoPath(`/git/blobs/${info.sha}`))).content; // archivos > 1 MB
    return { text: b64ToText(b64 || ""), sha: info.sha };
  }

  async function fileSha(path, ref) {
    try {
      const enc = path.split("/").map(encodeURIComponent).join("/");
      return (await gh(repoPath(`/contents/${enc}?ref=${ref}`))).sha;
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  // Un solo commit con todos los archivos. files: [{ path, b64, baseSha? }]
  async function commitFiles(files, message) {
    const ref = await gh(repoPath(`/git/ref/heads/${CFG.branch}`));
    const headSha = ref.object.sha;

    // ¿Alguien guardó la misma página mientras editábamos?
    for (const f of files) {
      if (f.baseSha === undefined) continue;
      const current = await fileSha(f.path, headSha);
      if (current !== f.baseSha) {
        const e = new Error(`«${f.path}» fue modificada por otra persona mientras editabas.`);
        e.conflict = f.path;
        throw e;
      }
    }

    const head = await gh(repoPath(`/git/commits/${headSha}`));
    const tree = [];
    for (const f of files) {
      const blob = await gh(repoPath("/git/blobs"), { method: "POST", body: { content: f.b64, encoding: "base64" } });
      f.newSha = blob.sha;
      tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const newTree = await gh(repoPath("/git/trees"), { method: "POST", body: { base_tree: head.tree.sha, tree } });
    const commit = await gh(repoPath("/git/commits"), {
      method: "POST",
      body: {
        message,
        tree: newTree.sha,
        parents: [headSha],
        author: { name: state.user, email: CFG.authorEmail, date: new Date().toISOString() },
      },
    });
    await gh(repoPath(`/git/refs/heads/${CFG.branch}`), { method: "PATCH", body: { sha: commit.sha } });
    return commit.sha;
  }

  // =========================
  // CIFRADO DEL TOKEN (contraseña -> AES-GCM)
  // =========================
  async function deriveKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptToken(token, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, CFG.kdfIterations);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token)));
    return { v: 1, kdf: "PBKDF2-SHA256", iterations: CFG.kdfIterations, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(data) };
  }

  async function decryptToken(box, password) {
    const key = await deriveKey(password, b64ToBytes(box.salt), box.iterations);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data));
    return new TextDecoder().decode(plain);
  }

  async function loadAccessBox() {
    try {
      const res = await fetch("acceso.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  const looksLikeToken = (s) => /^(github_pat_|ghp_|gho_|ghs_)/.test(s.trim());

  // =========================
  // LOGIN / SESIÓN
  // =========================
  const SESSION_KEY = "sgm-admin-session";

  function readSession() {
    for (const store of [sessionStorage, localStorage]) {
      try {
        const raw = store.getItem(SESSION_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function writeSession(remember) {
    const data = JSON.stringify({ user: state.user, token: state.token });
    try {
      (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, data);
    } catch {}
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function verifyToken() {
    const repo = await gh(repoPath());
    if (!repo.permissions || !repo.permissions.push) {
      throw new Error("Esa clave no tiene permiso para modificar la web.");
    }
  }

  async function showLogin() {
    $("#app").hidden = true;
    $("#login").hidden = false;
    const box = await loadAccessBox();
    $("#login-hint").hidden = !!box;
    const lastUser = (() => { try { return localStorage.getItem("sgm-admin-user"); } catch { return null; } })();
    if (lastUser) $("#login-user").value = lastUser;
    ($("#login-user").value ? $("#login-pass") : $("#login-user")).focus();
  }

  async function onLogin(ev) {
    ev.preventDefault();
    const user = $("#login-user").value.trim();
    const pass = $("#login-pass").value;
    const errEl = $("#login-error");
    const btn = $("#login-submit");
    errEl.hidden = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Entrando…';
    try {
      let token = pass.trim();
      if (!looksLikeToken(token)) {
        const box = await loadAccessBox();
        if (!box) throw new Error("Todavía no hay contraseña configurada. Ingresá con el token de GitHub.");
        try {
          token = await decryptToken(box, pass);
        } catch {
          throw new Error("Contraseña incorrecta.");
        }
      }
      state.user = user;
      state.token = token;
      try {
        await verifyToken();
      } catch (e) {
        if (e.status === 401) throw new Error("La clave de acceso venció o fue revocada. Hay que generar un token nuevo en GitHub.");
        throw e;
      }
      writeSession($("#login-remember").checked);
      try { localStorage.setItem("sgm-admin-user", user); } catch {}
      $("#login-pass").value = "";
      startApp();
    } catch (e) {
      state.token = null;
      errEl.textContent = e.message;
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  }

  function logout() {
    if (hasChanges() && !confirm("Tenés cambios sin guardar. ¿Salir igual y perderlos?")) return;
    clearSession();
    state.token = null;
    state.pages = {};
    state.data = {};
    state.uploads.clear();
    location.reload();
  }

  // =========================
  // APP
  // =========================
  function startApp() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    $("#user-name").textContent = state.user;
    buildNav();
    const fromHash = decodeURIComponent(location.hash.slice(1));
    go(fromHash || "page:index.html");
  }

  function buildNav() {
    const pages = $("#nav-pages");
    pages.innerHTML = "";
    for (const p of PAGES) {
      pages.append(el("li", {}, el("button", { "data-view": "page:" + p.file }, icon(p.icon), p.label)));
    }
    const data = $("#nav-data");
    data.innerHTML = "";
    for (const d of DATASETS) {
      data.append(el("li", {}, el("button", { "data-view": "data:" + d.file }, icon(d.icon), d.label)));
    }
  }

  function refreshNav() {
    document.querySelectorAll(".sidebar button[data-view]").forEach((b) => {
      const v = b.dataset.view;
      b.classList.toggle("active", v === state.view);
      const [kind, file] = v.split(":");
      const entry = kind === "page" ? state.pages[file] : kind === "data" ? state.data[file] : null;
      const dot = b.querySelector(".dot");
      if (entry && entry.dirty && !dot) b.append(el("span", { class: "dot", title: "Cambios sin guardar" }));
      if ((!entry || !entry.dirty) && dot) dot.remove();
    });
  }

  function hasChanges() {
    return Object.values(state.pages).some((p) => p.dirty) || Object.values(state.data).some((d) => d.dirty);
  }

  function markDirty(kind, file) {
    const entry = kind === "page" ? state.pages[file] : state.data[file];
    if (entry) entry.dirty = true;
    updateSaveBar();
  }

  function updateSaveBar() {
    const n = Object.values(state.pages).filter((p) => p.dirty).length + Object.values(state.data).filter((d) => d.dirty).length;
    $("#save-btn").disabled = n === 0;
    $("#discard-btn").disabled = n === 0;
    $("#dirty-count").hidden = n === 0;
    $("#dirty-count").textContent = n;
    refreshNav();
  }

  async function go(view) {
    if (!/^(page|data):|^(history|settings|help)$/.test(view)) view = "page:index.html";
    state.view = view;
    history.replaceState(null, "", "#" + view);
    $("#sidebar").classList.remove("open");
    refreshNav();
    const content = $("#content");
    content.innerHTML = '<div class="loading"><i class="bi bi-arrow-repeat spin"></i> Cargando…</div>';
    try {
      const [kind, file] = view.split(":");
      if (kind === "page") await renderPage(file);
      else if (kind === "data") await renderDataset(file);
      else if (kind === "history") await renderHistory();
      else if (kind === "settings") renderSettings();
      else if (kind === "help") renderHelp();
    } catch (e) {
      console.error(e);
      content.innerHTML = "";
      content.append(el("div", { class: "card" }, el("h2", {}, "No se pudo cargar"), el("p", { class: "error" }, e.message)));
    }
    window.scrollTo(0, 0);
  }

  // =========================
  // EDITOR DE PÁGINAS (HTML)
  // =========================
  async function loadPage(file, force = false) {
    if (state.pages[file] && !force) return state.pages[file];
    const { text, sha } = await readFile(file);
    const doc = new DOMParser().parseFromString(text, "text/html");
    state.pages[file] = { doc, sha, dirty: false };
    return state.pages[file];
  }

  function serializePage(doc) {
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML + "\n";
  }

  async function renderPage(file) {
    const page = PAGES.find((p) => p.file === file);
    const entry = await loadPage(file);
    const doc = entry.doc;
    const content = $("#content");
    content.innerHTML = "";
    const ctx = { kind: "page", file };

    content.append(
      el("div", { class: "view-head" },
        el("div", {},
          el("h1", {}, page ? page.label : file),
          el("p", { class: "muted" }, "Abrí una sección para editar sus textos, fotos y carruseles.")),
        el("div", { class: "actions" },
          el("button", { class: "btn btn-ghost", onclick: () => openPreview(file) }, icon("bi-eye"), "Vista previa"),
          el("a", { class: "btn btn-ghost", href: "../" + (file === "index.html" ? "" : file), target: "_blank", rel: "noopener" }, icon("bi-box-arrow-up-right"), "Ver publicada")))
    );

    // SEO
    content.append(makeBlock("Google y redes sociales (SEO)", "título y descripción", () => seoFields(doc, ctx)));

    // Secciones
    const sections = [...doc.querySelectorAll("main section, main > .section, footer")].filter(
      (s, i, arr) => !arr.some((o) => o !== s && o.contains(s))
    );
    for (const sec of sections) {
      const id = sec.id || (sec.tagName === "FOOTER" ? "footer" : "");
      const h = sec.querySelector("h1, h2");
      const name = SECTION_NAMES[id] || (h ? clean(h.textContent, 50) : "Sección");
      const tag = h && SECTION_NAMES[id] ? clean(h.textContent, 40) : "";
      content.append(makeBlock(name, tag !== name ? tag : "", () => sectionFields(sec, ctx)));
    }
  }

  function makeBlock(title, tag, build) {
    const body = el("div", { class: "block-body" });
    const det = el("details", { class: "block" }, el("summary", {}, title, tag ? el("span", { class: "tag" }, "· " + tag) : null), body);
    let built = false;
    det.addEventListener("toggle", () => {
      if (det.open && !built) {
        built = true;
        body.append(...build());
      }
    });
    return det;
  }

  function seoFields(doc, ctx) {
    const out = [];
    const titleEl = doc.querySelector("title");
    if (titleEl) {
      out.push(inputField("Título de la pestaña / Google", titleEl.textContent.trim(), (v) => {
        titleEl.textContent = v;
        markDirty(ctx.kind, ctx.file);
      }));
    }
    const metas = [
      ['meta[name="description"]', "Descripción para Google", "textarea"],
      ['meta[property="og:title"]', "Título al compartir (WhatsApp, Facebook)", "text"],
      ['meta[property="og:description"]', "Descripción al compartir", "textarea"],
    ];
    for (const [sel, label, type] of metas) {
      const m = doc.querySelector(sel);
      if (!m) continue;
      out.push(inputField(label, m.getAttribute("content") || "", (v) => {
        m.setAttribute("content", v);
        markDirty(ctx.kind, ctx.file);
      }, type));
    }
    return out;
  }

  // ---- Detección de contenido editable ----
  const isSkipped = (n) => n.matches(SKIP_SELECTOR);

  function isTextLeaf(n) {
    if (!n.textContent.trim()) return false;
    for (const d of n.querySelectorAll("*")) if (!INLINE_TAGS.has(d.tagName)) return false;
    return true;
  }

  function signature(n) {
    const cls = [...n.classList].filter((c) => !/^(is-|faq-active|active|aos)/.test(c)).sort().join(".");
    return n.tagName + "." + cls;
  }

  function isList(n) {
    const kids = [...n.children].filter((k) => !["SCRIPT", "TEMPLATE"].includes(k.tagName));
    if (!kids.length) return false;
    const always = n.matches(".swiper-wrapper, ul, ol, .faq-container");
    if (!always && kids.length < 2) return false;
    if (!kids.every((k) => LIST_ITEM_TAGS.has(k.tagName))) return false;
    const sig = signature(kids[0]);
    return kids.every((k) => signature(k) === sig) && !isTextLeaf(n);
  }

  function listName(n) {
    if (n.matches(".swiper-wrapper")) return ["Carrusel", "bi-images"];
    if (n.matches(".faq-container")) return ["Preguntas", "bi-question-circle"];
    if (n.matches(".social-links")) return ["Redes sociales", "bi-share"];
    if (n.matches("ul, ol")) return ["Lista", "bi-list-ul"];
    return ["Grupo de tarjetas", "bi-grid"];
  }

  // Recorre un elemento y devuelve los campos para editarlo
  function walk(node, ctx) {
    const out = [];
    for (const c of node.children) {
      if (isSkipped(c)) continue;
      out.push(...fieldsFor(c, ctx));
    }
    return out;
  }

  function fieldsFor(c, ctx) {
    const out = [];
    if (c.hasAttribute("data-count")) return [countdownField(c, ctx)];
    if (c.tagName === "IMG") return [imageField(c, ctx)];
    if (c.tagName === "IFRAME") return [attrField(c, "src", "Enlace del contenido incrustado", ctx)];
    if (c.hasAttribute("data-links")) return [buyLinksField(c, ctx)];
    if (isList(c)) return [...out, listField(c, ctx)];
    if (isTextLeaf(c)) {
      out.push(textField(c, ctx));
      if (c.tagName === "A") out.push(hrefField(c, ctx));
      return out;
    }
    if (c.tagName === "A") out.push(hrefField(c, ctx));
    out.push(...walk(c, ctx));
    return out;
  }

  function sectionFields(sec, ctx) {
    const out = walk(sec, ctx);
    if (sec.querySelector("#media-grid")) out.push(el("div", { class: "note" }, icon("bi-info-circle"), " Las notas de esta sección se editan en ", linkTo("data:data/medios.json", "Listas → En los medios"), "."));
    if (sec.querySelector("#servicios-grid")) out.push(el("div", { class: "note" }, icon("bi-info-circle"), " Las tarjetas de servicios se editan en ", linkTo("data:data/servicios.json", "Listas → Servicios"), "."));
    if (!out.length) out.push(el("p", { class: "muted" }, "Esta sección no tiene contenido editable."));
    return out;
  }

  function linkTo(view, text) {
    return el("a", { href: "#" + view, onclick: (e) => { e.preventDefault(); go(view); } }, text);
  }

  // ---- Campos ----
  const TEXT_LABELS = { H1: "Título principal", H2: "Título", H3: "Subtítulo", H4: "Subtítulo", H5: "Subtítulo", P: "Texto", A: "Texto del botón / enlace", LI: "Ítem", BLOCKQUOTE: "Cita", SPAN: "Texto", DIV: "Texto" };

  function textField(node, ctx) {
    const label = TEXT_LABELS[node.tagName] || "Texto";
    return el("div", { class: "field" }, el("label", {}, label), richEditor(node, ctx, /^H[1-4]$/.test(node.tagName)));
  }

  function richEditor(node, ctx, isTitle) {
    const area = el("div", { class: "rte-area" + (isTitle ? " is-title" : ""), contenteditable: "true", html: node.innerHTML.trim() });
    const exec = (cmd, val) => { area.focus(); document.execCommand(cmd, false, val); sync(); };
    const tools = el("div", { class: "rte-tools" },
      el("button", { type: "button", title: "Negrita", onmousedown: (e) => e.preventDefault(), onclick: () => exec("bold") }, icon("bi-type-bold")),
      el("button", { type: "button", title: "Cursiva", onmousedown: (e) => e.preventDefault(), onclick: () => exec("italic") }, icon("bi-type-italic")),
      el("button", { type: "button", title: "Agregar enlace", onmousedown: (e) => e.preventDefault(), onclick: () => {
        const url = prompt("Pegá el enlace (https://…)");
        if (url) exec("createLink", url.trim());
      } }, icon("bi-link-45deg")),
      el("button", { type: "button", title: "Quitar formato", onmousedown: (e) => e.preventDefault(), onclick: () => { exec("unlink"); exec("removeFormat"); } }, icon("bi-eraser"))
    );
    function sync() {
      const html = sanitizeInline(area.innerHTML);
      if (html !== node.innerHTML.trim()) {
        node.innerHTML = html;
        markDirty(ctx.kind, ctx.file);
      }
    }
    area.addEventListener("input", sync);
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.execCommand("insertLineBreak");
        sync();
      }
    });
    area.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });
    return el("div", { class: "rte" }, tools, area);
  }

  // Deja sólo formato de texto simple (negrita, cursiva, enlaces, saltos de línea, íconos)
  function sanitizeInline(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const walkClean = (root) => {
      for (const n of [...root.childNodes]) {
        if (n.nodeType === 8) { n.remove(); continue; }
        if (n.nodeType !== 1) continue;
        walkClean(n);
        let tag = n.tagName;
        if (tag === "DIV" || tag === "P") {
          n.replaceWith(...n.childNodes, document.createElement("br"));
          continue;
        }
        if (!INLINE_TAGS.has(tag)) { n.replaceWith(...n.childNodes); continue; }
        for (const a of [...n.attributes]) {
          const keep = a.name === "class" || a.name === "style" || (tag === "A" && ["href", "target", "rel", "title"].includes(a.name));
          if (!keep || /^on/i.test(a.name) || (a.name === "href" && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
        }
        if (tag === "A" && /^https?:/.test(n.getAttribute("href") || "") && !n.hasAttribute("target")) {
          n.setAttribute("target", "_blank");
          n.setAttribute("rel", "noopener");
        }
        if (tag === "SPAN" && !n.attributes.length) n.replaceWith(...n.childNodes);
      }
    };
    walkClean(tpl.content);
    let out = tpl.innerHTML.replace(/&nbsp;/g, " ");
    out = out.replace(/(<br>\s*)+$/, "");
    return out.trim();
  }

  function inputField(label, value, onChange, type = "text") {
    const input = type === "textarea"
      ? el("textarea", {}, value)
      : el("input", { type, value });
    input.addEventListener("input", () => onChange(input.value));
    return el("div", { class: "field" }, el("label", {}, label), input);
  }

  function hrefField(a, ctx) {
    const href = a.getAttribute("href") || "";
    return inputField("Enlace (a dónde lleva)", href, (v) => {
      a.setAttribute("href", v.trim());
      markDirty(ctx.kind, ctx.file);
    }, "url");
  }

  function attrField(node, attr, label, ctx) {
    return inputField(label, node.getAttribute(attr) || "", (v) => {
      node.setAttribute(attr, v.trim());
      markDirty(ctx.kind, ctx.file);
    }, "url");
  }

  function countdownField(node, ctx) {
    const v = (node.getAttribute("data-count") || "").replace(/\//g, "-");
    return inputField("Fecha límite de la cuenta regresiva", /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "", (val) => {
      if (!val) return;
      node.setAttribute("data-count", val.replace(/-/g, "/"));
      markDirty(ctx.kind, ctx.file);
    }, "date");
  }

  // Imagen: subir/cambiar foto + texto alternativo
  function imageField(img, ctx) {
    const thumb = el("img", { src: resolveSrc(img.getAttribute("src")), alt: "" });
    const path = el("div", { class: "path" }, img.getAttribute("src") || "");
    const changeBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, icon("bi-upload"), "Cambiar foto");
    changeBtn.addEventListener("click", async () => {
      const file = await pickFile();
      if (!file) return;
      changeBtn.disabled = true;
      try {
        const newPath = await stageUpload(file, img.getAttribute("alt") || file.name);
        img.setAttribute("src", newPath);
        img.removeAttribute("srcset");
        img.removeAttribute("data-src");
        thumb.src = resolveSrc(newPath);
        path.innerHTML = "";
        path.append(el("span", { class: "pending" }, "Foto nueva lista para publicar"));
        markDirty(ctx.kind, ctx.file);
      } catch (e) {
        toast("No se pudo usar esa imagen: " + e.message, "err");
      } finally {
        changeBtn.disabled = false;
      }
    });
    const alt = el("input", { type: "text", value: img.getAttribute("alt") || "" });
    alt.addEventListener("input", () => {
      img.setAttribute("alt", alt.value);
      markDirty(ctx.kind, ctx.file);
    });
    return el("div", { class: "field img-field" },
      el("div", { class: "img-thumb" }, thumb),
      el("div", { class: "img-meta" }, changeBtn, path,
        el("label", {}, "Descripción de la foto (ayuda a Google y a personas con baja visión)"), alt));
  }

  // Libros: links de compra (data-links) y título del cartel
  function buyLinksField(btn, ctx) {
    let links = [];
    try { links = JSON.parse(btn.getAttribute("data-links") || "[]"); } catch {}
    const wrap = el("div", { class: "field links-editor" });
    const save = () => {
      btn.setAttribute("data-links", JSON.stringify(links.filter((l) => l.label || l.url)));
      markDirty(ctx.kind, ctx.file);
    };
    const titleInput = el("input", { type: "text", value: btn.getAttribute("data-title") || "" });
    titleInput.addEventListener("input", () => {
      btn.setAttribute("data-title", titleInput.value);
      markDirty(ctx.kind, ctx.file);
    });
    const rows = el("div");
    const draw = () => {
      rows.innerHTML = "";
      links.forEach((l, i) => {
        const name = el("input", { type: "text", value: l.label || "", placeholder: "Tienda (ej: Amazon)" });
        const url = el("input", { type: "url", value: l.url || "", placeholder: "https://…" });
        name.addEventListener("input", () => { l.label = name.value; save(); });
        url.addEventListener("input", () => { l.url = url.value.trim(); save(); });
        rows.append(el("div", { class: "link-row" }, name, url,
          el("button", { type: "button", class: "icon-btn", title: "Quitar tienda", onclick: () => { links.splice(i, 1); save(); draw(); } }, icon("bi-trash"))));
      });
    };
    draw();
    wrap.append(
      el("label", {}, "Título en la ventana «Conseguir libro»"), titleInput,
      el("label", {}, "Dónde comprarlo"), rows,
      el("button", { type: "button", class: "btn btn-ghost btn-sm add-btn", onclick: () => { links.push({ label: "", url: "" }); draw(); } }, icon("bi-plus-lg"), "Agregar tienda")
    );
    return wrap;
  }

  // Lista / carrusel: agregar, duplicar, borrar y reordenar
  function listField(container, ctx) {
    const [name, ico] = listName(container);
    const box = el("div", { class: "list" });
    const items = () => [...container.children].filter((k) => !["SCRIPT", "TEMPLATE"].includes(k.tagName));
    const changed = () => { markDirty(ctx.kind, ctx.file); draw(); };

    const draw = () => {
      box.innerHTML = "";
      const list = items();
      box.append(el("div", { class: "list-head" },
        el("h3", {}, icon(ico), `${name} (${list.length})`),
        el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { duplicate(list[list.length - 1]); changed(); } }, icon("bi-plus-lg"), "Agregar")));
      list.forEach((item, i) => box.append(listItem(item, i, list.length)));
    };

    const listItem = (item, i, total) => {
      const img = item.tagName === "IMG" ? item : item.querySelector("img");
      const titleNode = item.querySelector("h1, h2, h3, h4") || item;
      const title = clean(titleNode.textContent, 70) || (img ? clean(img.getAttribute("alt"), 70) : "") || (item.getAttribute("href") || "Elemento");
      const body = el("div", { class: "item-body" });
      const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
      const det = el("details", { class: "item" },
        el("summary", {},
          el("span", { class: "item-num" }, String(i + 1)),
          img ? el("img", { class: "item-thumb", src: resolveSrc(img.getAttribute("src")), alt: "" }) : null,
          el("span", { class: "item-title" }, title),
          el("span", { class: "item-tools" },
            el("button", { type: "button", class: "icon-btn", title: "Subir", disabled: i === 0, onclick: stop(() => { move(item, -1); changed(); }) }, icon("bi-arrow-up")),
            el("button", { type: "button", class: "icon-btn", title: "Bajar", disabled: i === total - 1, onclick: stop(() => { move(item, 1); changed(); }) }, icon("bi-arrow-down")),
            el("button", { type: "button", class: "icon-btn", title: "Duplicar", onclick: stop(() => { duplicate(item); changed(); }) }, icon("bi-copy")),
            el("button", { type: "button", class: "icon-btn del", title: "Eliminar", disabled: total <= 1, onclick: stop(() => {
              if (confirm(`¿Eliminar «${title}»?`)) { remove(item); changed(); }
            }) }, icon("bi-trash")))),
        body);
      let built = false;
      det.addEventListener("toggle", () => {
        if (det.open && !built) {
          built = true;
          const fields = fieldsFor(item, ctx);
          body.append(...(fields.length ? fields : [el("p", { class: "muted" }, "Sin contenido editable.")]));
        }
      });
      return det;
    };

    draw();
    return box;
  }

  function prevWhitespace(n) {
    const p = n.previousSibling;
    return p && p.nodeType === 3 && !p.textContent.trim() ? p : null;
  }

  function duplicate(item) {
    const clone = item.cloneNode(true);
    clone.classList.remove("faq-active", "is-active");
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    clone.removeAttribute("id");
    const ws = prevWhitespace(item);
    item.after(ws ? ws.cloneNode() : "", clone);
  }

  function remove(item) {
    let p = item.previousSibling;
    while (p && p.nodeType === 3 && !p.textContent.trim()) p = p.previousSibling;
    if (p && p.nodeType === 8) p.remove(); // comentario tipo <!-- Slide 3 -->
    const ws = prevWhitespace(item);
    if (ws) ws.remove();
    item.remove();
  }

  function move(item, dir) {
    const sib = (n, d) => {
      let s = d < 0 ? n.previousElementSibling : n.nextElementSibling;
      while (s && ["SCRIPT", "TEMPLATE"].includes(s.tagName)) s = d < 0 ? s.previousElementSibling : s.nextElementSibling;
      return s;
    };
    const other = sib(item, dir);
    if (!other) return;
    if (dir < 0) other.before(item);
    else other.after(item);
  }

  // =========================
  // IMÁGENES
  // =========================
  function pickFile() {
    return new Promise((resolve) => {
      const input = $("#file-input");
      input.value = "";
      input.onchange = () => resolve(input.files[0] || null);
      input.click();
    });
  }

  // Achica la foto (máx. 1600 px) y la deja lista para subir con el próximo guardado
  async function stageUpload(file, hint) {
    if (!file.type.startsWith("image/")) throw new Error("el archivo no es una imagen");
    let blob = file;
    let ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const passThrough = ["image/svg+xml", "image/gif"].includes(file.type);
    if (!passThrough) {
      const bmp = await createImageBitmap(file);
      const max = 1600;
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const transparent = ["image/png", "image/webp"].includes(file.type);
      const type = transparent ? "image/webp" : "image/jpeg";
      blob = await new Promise((r) => canvas.toBlob(r, type, 0.85));
      if (!blob) throw new Error("no se pudo procesar");
      ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[blob.type] || "jpg";
      if (blob.size > file.size && file.size < 1.5 * 1024 * 1024 && scale === 1) {
        blob = file; // el original ya era más liviano
        ext = (file.name.split(".").pop() || ext).toLowerCase();
      }
    }
    if (blob.size > 15 * 1024 * 1024) throw new Error("la imagen pesa demasiado (máx. 15 MB)");
    const path = `${CFG.uploadDir}/${stamp()}-${slugify(hint)}.${ext}`;
    const b64 = bytesToB64(new Uint8Array(await blob.arrayBuffer()));
    state.uploads.set(path, { b64, url: URL.createObjectURL(blob) });
    return path;
  }

  // =========================
  // LISTAS JSON (data/*.json)
  // =========================
  async function loadData(file, force = false) {
    if (state.data[file] && !force) return state.data[file];
    const { text, sha } = await readFile(file);
    state.data[file] = { json: JSON.parse(text), sha, dirty: false };
    return state.data[file];
  }

  async function renderDataset(file) {
    const ds = DATASETS.find((d) => d.file === file);
    if (!ds) throw new Error("Lista desconocida");
    const entry = await loadData(file);
    const ctx = { kind: "data", file };
    const content = $("#content");
    content.innerHTML = "";
    content.append(el("div", { class: "view-head" },
      el("div", {}, el("h1", {}, ds.label), el("p", { class: "muted" }, ds.intro))));

    for (const obj of ds.objects || []) {
      const target = (entry.json[obj.key] = entry.json[obj.key] || {});
      const card = el("div", { class: "card" }, el("h2", {}, obj.label));
      for (const f of obj.fields) card.append(dataField(target, f, ctx));
      content.append(card);
    }
    for (const list of ds.lists || []) {
      const arr = (entry.json[list.key] = entry.json[list.key] || []);
      const card = el("div", { class: "card" });
      content.append(card);
      drawDataList(card, arr, list, ctx);
    }
  }

  function drawDataList(card, arr, list, ctx) {
    const redraw = () => { markDirty(ctx.kind, ctx.file); drawDataList(card, arr, list, ctx); };
    card.innerHTML = "";
    card.append(el("div", { class: "list-head" },
      el("h2", {}, `${list.label} (${arr.length})`),
      el("button", { type: "button", class: "btn btn-primary btn-sm", onclick: () => {
        arr.unshift(JSON.parse(JSON.stringify(list.blank)));
        redraw();
        card.querySelector("details.item").open = true;
      } }, icon("bi-plus-lg"), "Agregar " + list.itemLabel.toLowerCase())));

    arr.forEach((item, i) => {
      const body = el("div", { class: "item-body" });
      const thumbSrc = list.thumbField && item[list.thumbField];
      const titleSpan = el("span", { class: "item-title" }, clean(item[list.titleField], 70) || list.itemLabel);
      const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
      const det = el("details", { class: "item" },
        el("summary", {},
          el("span", { class: "item-num" }, String(i + 1)),
          thumbSrc ? el("img", { class: "item-thumb", src: resolveSrc(thumbSrc), alt: "" }) : null,
          titleSpan,
          el("span", { class: "item-tools" },
            el("button", { type: "button", class: "icon-btn", title: "Subir", disabled: i === 0, onclick: stop(() => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; redraw(); }) }, icon("bi-arrow-up")),
            el("button", { type: "button", class: "icon-btn", title: "Bajar", disabled: i === arr.length - 1, onclick: stop(() => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; redraw(); }) }, icon("bi-arrow-down")),
            el("button", { type: "button", class: "icon-btn", title: "Duplicar", onclick: stop(() => { arr.splice(i + 1, 0, JSON.parse(JSON.stringify(item))); redraw(); }) }, icon("bi-copy")),
            el("button", { type: "button", class: "icon-btn del", title: "Eliminar", onclick: stop(() => {
              if (confirm(`¿Eliminar «${clean(item[list.titleField], 60)}»?`)) { arr.splice(i, 1); redraw(); }
            }) }, icon("bi-trash")))),
        body);
      let built = false;
      det.addEventListener("toggle", () => {
        if (!det.open || built) return;
        built = true;
        let row = null;
        for (const f of list.fields) {
          const fieldEl = dataField(item, f, ctx, () => {
            if (f.key === list.titleField) titleSpan.textContent = clean(item[f.key], 70) || list.itemLabel;
          });
          if (f.half) {
            if (!row) { row = el("div", { class: "field-row" }); body.append(row); }
            row.append(fieldEl);
            if (row.children.length === 2) row = null;
          } else {
            row = null;
            body.append(fieldEl);
          }
        }
      });
      card.append(det);
    });
  }

  function dataField(obj, f, ctx, after) {
    const set = (v) => { obj[f.key] = v; markDirty(ctx.kind, ctx.file); if (after) after(); };
    const val = obj[f.key];
    if (f.type === "select") {
      const sel = el("select", {}, f.options.map(([v, l]) => el("option", { value: v, selected: v === val }, l)));
      sel.addEventListener("change", () => set(sel.value));
      return el("div", { class: "field" }, el("label", {}, f.label), sel);
    }
    if (f.type === "checks") {
      const current = new Set(Array.isArray(val) ? val : []);
      const chips = el("div", { class: "chips" }, f.options.map(([v, l]) => {
        const cb = el("input", { type: "checkbox", checked: current.has(v) });
        cb.addEventListener("change", () => {
          cb.checked ? current.add(v) : current.delete(v);
          set(f.options.map(([k]) => k).filter((k) => current.has(k)));
        });
        return el("label", { class: "check" }, cb, l);
      }));
      return el("div", { class: "field" }, el("label", {}, f.label), chips);
    }
    if (f.type === "image") {
      const thumb = el("img", { src: resolveSrc(val), alt: "" });
      const pathEl = el("div", { class: "path" }, val || "Sin imagen");
      const btn = el("button", { type: "button", class: "btn btn-ghost btn-sm" }, icon("bi-upload"), val ? "Cambiar imagen" : "Subir imagen");
      btn.addEventListener("click", async () => {
        const file = await pickFile();
        if (!file) return;
        try {
          const p = await stageUpload(file, obj.title || obj.titulo || file.name);
          thumb.src = resolveSrc(p);
          pathEl.innerHTML = "";
          pathEl.append(el("span", { class: "pending" }, "Imagen nueva lista para publicar"));
          set(p);
        } catch (e) {
          toast("No se pudo usar esa imagen: " + e.message, "err");
        }
      });
      return el("div", { class: "field" }, el("label", {}, f.label),
        el("div", { class: "img-field" }, el("div", { class: "img-thumb" }, thumb), el("div", { class: "img-meta" }, btn, pathEl)));
    }
    return inputField(f.label, val == null ? "" : val, (v) => set(f.nullable && !v.trim() ? null : v), f.type);
  }

  // =========================
  // GUARDAR / DESCARTAR / VISTA PREVIA
  // =========================
  function collectChanges() {
    const files = [];
    const names = [];
    let html = "";
    for (const [file, p] of Object.entries(state.pages)) {
      if (!p.dirty) continue;
      const out = serializePage(p.doc);
      html += out;
      files.push({ path: file, b64: textToB64(out), baseSha: p.sha, entry: p });
      names.push((PAGES.find((x) => x.file === file) || {}).label || file);
    }
    let json = "";
    for (const [file, d] of Object.entries(state.data)) {
      if (!d.dirty) continue;
      const out = JSON.stringify(d.json, null, 2) + "\n";
      json += out;
      files.push({ path: file, b64: textToB64(out), baseSha: d.sha, entry: d });
      names.push((DATASETS.find((x) => x.file === file) || {}).label || file);
    }
    // Sólo se suben las fotos que siguen en uso
    const uploads = [];
    for (const [path, up] of state.uploads) {
      if (html.includes(path) || json.includes(path)) uploads.push({ path, b64: up.b64 });
    }
    return { files, uploads, names };
  }

  async function save() {
    const { files, uploads, names } = collectChanges();
    if (!files.length) return;
    const btn = $("#save-btn");
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Publicando…';
    try {
      const fotos = uploads.length ? ` (+${uploads.length} foto${uploads.length > 1 ? "s" : ""})` : "";
      const message = `Panel: ${state.user} editó ${names.join(", ")}${fotos}`;
      const sha = await commitFiles([...uploads, ...files], message);
      btn.innerHTML = label;
      for (const f of files) {
        f.entry.sha = f.newSha;
        f.entry.dirty = false;
      }
      for (const u of uploads) state.uploads.delete(u.path);
      updateSaveBar();
      toast("¡Guardado! Los cambios se verán en la web en 1 o 2 minutos.", "ok", 7000);
      watchDeploy(sha);
    } catch (e) {
      console.error(e);
      if (e.conflict) {
        toast(e.message + " Descartá tus cambios en esa página y volvé a hacerlos.", "err", 10000);
      } else if (e.status === 401) {
        toast("La sesión venció. Volvé a entrar.", "err", 8000);
      } else {
        toast("No se pudo guardar: " + e.message, "err", 8000);
      }
    } finally {
      btn.innerHTML = label;
      updateSaveBar();
    }
  }

  async function watchDeploy(sha) {
    if (!state.canPages) return;
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const b = await gh(repoPath("/pages/builds/latest"));
        if (b.commit === sha && b.status === "built") {
          toast("✓ Ya está publicado en la web.", "ok", 6000);
          return;
        }
        if (b.commit === sha && b.status === "errored") {
          toast("GitHub tuvo un problema publicando. Avisale a Patricio.", "err", 10000);
          return;
        }
      } catch {
        state.canPages = false; // el token no tiene permiso de leer Pages: no pasa nada
        return;
      }
    }
  }

  async function discard() {
    if (!confirm("¿Descartar todos los cambios sin guardar?")) return;
    for (const f of Object.keys(state.pages)) if (state.pages[f].dirty) delete state.pages[f];
    for (const f of Object.keys(state.data)) if (state.data[f].dirty) delete state.data[f];
    state.uploads.clear();
    updateSaveBar();
    go(state.view);
  }

  function openPreview(file) {
    const entry = state.pages[file];
    if (!entry) return;
    let html = serializePage(entry.doc);
    for (const [path, up] of state.uploads) html = html.split(path).join(up.url);
    const base = new URL("../", location.href).href;
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`);
    $("#preview-frame").srcdoc = html;
    $("#preview").hidden = false;
  }

  // =========================
  // HISTORIAL
  // =========================
  async function renderHistory() {
    const commits = await gh(repoPath(`/commits?sha=${CFG.branch}&per_page=40`));
    const content = $("#content");
    content.innerHTML = "";
    content.append(el("div", { class: "view-head" },
      el("div", {}, el("h1", {}, "Historial de cambios"), el("p", { class: "muted" }, "Quién cambió qué y cuándo. Los más recientes primero."))));
    const fmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
    const table = el("table", { class: "table" },
      el("thead", {}, el("tr", {}, el("th", {}, "Fecha"), el("th", {}, "Persona"), el("th", {}, "Cambio"))),
      el("tbody", {}, commits.map((c) =>
        el("tr", {},
          el("td", {}, fmt.format(new Date(c.commit.author.date))),
          el("td", {}, el("strong", {}, c.commit.author.name)),
          el("td", {}, c.commit.message.split("\n")[0])))));
    content.append(table);
  }

  // =========================
  // AJUSTES (contraseña)
  // =========================
  function renderSettings() {
    const content = $("#content");
    content.innerHTML = "";
    content.append(el("div", { class: "view-head" },
      el("div", {}, el("h1", {}, "Ajustes"), el("p", { class: "muted" }, "Contraseña de acceso al panel."))));

    const pass1 = el("input", { type: "password", autocomplete: "new-password" });
    const pass2 = el("input", { type: "password", autocomplete: "new-password" });
    const newToken = el("input", { type: "password", autocomplete: "off", placeholder: "Dejalo vacío para usar el token actual" });
    const btn = el("button", { type: "button", class: "btn btn-primary btn-block" }, icon("bi-shield-lock"), "Guardar contraseña");
    btn.addEventListener("click", async () => {
      if (pass1.value.length < 10) return toast("La contraseña tiene que tener al menos 10 caracteres.", "err");
      if (pass1.value !== pass2.value) return toast("Las contraseñas no coinciden.", "err");
      if (looksLikeToken(pass1.value)) return toast("La contraseña no puede ser un token.", "err");
      btn.disabled = true;
      const prevToken = state.token;
      try {
        if (newToken.value.trim()) {
          state.token = newToken.value.trim();
          await verifyToken();
        }
        const box = await encryptToken(state.token, pass1.value);
        await commitFiles([{ path: CFG.accessFile, b64: textToB64(JSON.stringify(box, null, 2) + "\n") }],
          `Panel: ${state.user} actualizó la contraseña de acceso`);
        writeSession(!!(() => { try { return localStorage.getItem(SESSION_KEY); } catch { return null; } })());
        pass1.value = pass2.value = newToken.value = "";
        toast("Contraseña guardada. En 1 o 2 minutos ya se puede usar para entrar.", "ok", 8000);
      } catch (e) {
        state.token = prevToken;
        toast("No se pudo guardar: " + e.message, "err", 8000);
      } finally {
        btn.disabled = false;
      }
    });

    content.append(
      el("div", { class: "card" },
        el("h2", {}, "Contraseña del panel"),
        el("p", { class: "muted" }, "Es la contraseña que usan todas las personas que administran la web. Usá una frase larga, fácil de recordar y difícil de adivinar (ej: «MaiaTina y los dinos 2026»)."),
        el("label", {}, "Nueva contraseña"), pass1,
        el("label", {}, "Repetir contraseña"), pass2,
        el("label", {}, "Token nuevo de GitHub (sólo si el anterior venció)"), newToken,
        btn),
      el("div", { class: "card" },
        el("h2", {}, "Cerrar sesión"),
        el("p", { class: "muted" }, "Si entraste desde una computadora que no es tuya, cerrá la sesión al terminar."),
        el("button", { type: "button", class: "btn btn-ghost", onclick: logout }, icon("bi-box-arrow-right"), "Salir del panel"))
    );
  }

  function renderHelp() {
    const content = $("#content");
    content.innerHTML = "";
    content.append(
      el("div", { class: "view-head" }, el("div", {}, el("h1", {}, "Cómo usar el panel"))),
      el("div", { class: "card" },
        el("h2", {}, "Editar la web en 4 pasos"),
        el("ol", {},
          el("li", {}, "Elegí una página a la izquierda (por ejemplo, ", el("strong", {}, "Inicio"), ")."),
          el("li", {}, "Abrí la sección que querés cambiar: ahí están sus textos, fotos y carruseles."),
          el("li", {}, "Hacé los cambios. Podés usar ", el("strong", {}, "Vista previa"), " para ver cómo queda antes de publicar."),
          el("li", {}, "Tocá ", el("strong", {}, "Guardar y publicar"), ". En 1 o 2 minutos se ve en la web."))),
      el("div", { class: "card" },
        el("h2", {}, "Carruseles, libros y listas"),
        el("ul", {},
          el("li", {}, el("strong", {}, "Agregar:"), " crea una copia del último elemento; después cambiale la foto y los textos."),
          el("li", {}, icon("bi-copy"), " duplica, ", icon("bi-arrow-up"), icon("bi-arrow-down"), " cambia el orden, ", icon("bi-trash"), " elimina."),
          el("li", {}, "Los libros tienen además la lista de tiendas donde comprarlos."),
          el("li", {}, "«En los medios» y las tarjetas de «Servicios» están en ", el("strong", {}, "Listas"), "."))),
      el("div", { class: "card" },
        el("h2", {}, "Fotos"),
        el("ul", {},
          el("li", {}, "Podés subir fotos del celular o la compu: el panel las achica solo para que la web cargue rápido."),
          el("li", {}, "Completá la descripción de cada foto: ayuda a que la web aparezca en Google."))),
      el("div", { class: "card" },
        el("h2", {}, "¿Me equivoqué?"),
        el("p", {}, "Mientras no guardes, ", el("strong", {}, "Descartar"), " vuelve todo atrás. Si ya publicaste, en ", el("strong", {}, "Historial"), " queda registrado cada cambio con tu nombre, así se puede recuperar la versión anterior."))
    );
  }

  // =========================
  // INICIO
  // =========================
  function init() {
    $("#login-form").addEventListener("submit", onLogin);
    $("#login-eye").addEventListener("click", () => {
      const p = $("#login-pass");
      p.type = p.type === "password" ? "text" : "password";
    });
    $("#save-btn").addEventListener("click", save);
    $("#discard-btn").addEventListener("click", discard);
    $("#logout-btn").addEventListener("click", logout);
    $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#preview-close").addEventListener("click", () => {
      $("#preview").hidden = true;
      $("#preview-frame").srcdoc = "";
    });
    $("#sidebar").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-view]");
      if (b) go(b.dataset.view);
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !$("#app").hidden) {
        e.preventDefault();
        if (!$("#save-btn").disabled) save();
      }
      if (e.key === "Escape" && !$("#preview").hidden) $("#preview-close").click();
    });
    window.addEventListener("beforeunload", (e) => {
      if (hasChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    const session = readSession();
    if (session && session.token) {
      state.user = session.user;
      state.token = session.token;
      verifyToken().then(startApp).catch(() => {
        clearSession();
        state.token = null;
        showLogin();
      });
    } else {
      showLogin();
    }
  }

  init();
})();
