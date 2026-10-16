/* Panel de administración SGM+ (versión simple)
 * - Sólo edita lo que cambia seguido: próximo taller, talleres, libros,
 *   «En los medios» y servicios. Todo vive en data/*.json.
 * - Cada «Guardar y publicar» es un commit en GitHub (rama gh-pages)
 *   firmado con el nombre de quien entró.
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

  const AUDIENCIAS = [
    ["paciente", "Pacientes"],
    ["empresa", "Empresas"],
    ["profesional", "Profesionales"],
  ];

  const TIPOS_MEDIO = [
    ["article", "Nota escrita", "bi-newspaper"],
    ["audio", "Audio / radio", "bi-mic"],
    ["video", "Video", "bi-play-btn"],
  ];

  // Cada sección del panel. `list` = lista de cosas; `single` = un solo formulario.
  const SECTIONS = [
    {
      id: "proximo",
      kind: "single",
      file: "data/proximo-taller.json",
      title: "Próximo taller",
      tileText: "Cambiar la fecha de «Cupos limitados» y el texto del aviso",
      icon: "bi-calendar-heart",
      page: "./#call-to-action",
      fields: [
        { key: "fecha", label: "¿Hasta qué día se pueden inscribir?", type: "date", required: true, big: true,
          hint: "La cuenta regresiva de la web llega a cero al terminar ese día." },
        { key: "titulo", label: "Título", type: "text", required: true },
        { key: "texto", label: "Texto", type: "textarea" },
        { key: "etiqueta", label: "Cartelito de arriba", type: "text", hint: "Ej: Cupos limitados" },
        { key: "url", label: "¿A dónde lleva el botón «Quiero inscribirme»?", type: "url",
          hint: "Pegá el enlace de inscripción. Si no tenés uno, dejá talleres.html" },
        { key: "imagen", label: "Foto", type: "image" },
      ],
    },
    {
      id: "talleres",
      kind: "list",
      file: "data/talleres.json",
      key: "talleres",
      title: "Talleres",
      tileText: "Agregar un taller nuevo o cambiar uno existente",
      icon: "bi-easel",
      page: "talleres.html",
      one: "taller",
      sortable: true,
      itemTitle: (t) => t.titulo,
      itemSub: (t) => [t.modalidad, t.duracion].filter(Boolean).join(" · "),
      itemImg: (t) => t.imagen,
      blank: () => ({ etiqueta: "Taller online", titulo: "", descripcion: "", duracion: "2 h", modalidad: "Online", url: "", boton: "Comprar", imagen: "" }),
      fields: [
        { key: "titulo", label: "Nombre del taller", type: "text", required: true },
        { key: "descripcion", label: "¿De qué se trata?", type: "textarea" },
        { key: "imagen", label: "Foto del taller", type: "image" },
        { key: "duracion", label: "Duración", type: "text", half: true, hint: "Ej: 2 h" },
        { key: "modalidad", label: "Modalidad", type: "text", half: true, hint: "Ej: Online" },
        { key: "url", label: "Enlace para comprar o inscribirse", type: "url", hint: "Ej: el enlace de Hotmart" },
        { key: "boton", label: "Texto del botón", type: "text", half: true, hint: "Ej: Comprar, Inscribirme" },
        { key: "etiqueta", label: "Cartelito de arriba", type: "text", half: true, hint: "Ej: Taller online" },
      ],
    },
    {
      id: "libros",
      kind: "list",
      file: "data/libros.json",
      key: "libros",
      title: "Libros",
      tileText: "Agregar un libro nuevo o cambiar uno existente",
      icon: "bi-book",
      page: "./#related-books",
      one: "libro",
      sortable: true,
      itemTitle: (b) => [b.titulo, b.subtitulo].filter(Boolean).join(" — "),
      itemSub: (b) => b.etiqueta,
      itemImg: (b) => b.tapa,
      blank: () => ({ titulo: "", subtitulo: "", etiqueta: "", tapa: "", descripcion: "", tiendas: [{ nombre: "", url: "" }] }),
      fields: [
        { key: "titulo", label: "Título del libro", type: "text", required: true },
        { key: "subtitulo", label: "Subtítulo (opcional)", type: "text" },
        { key: "tapa", label: "Foto de la tapa", type: "image" },
        { key: "etiqueta", label: "Cartelito sobre la tapa (opcional)", type: "text", hint: "Ej: Edad: 3-5" },
        { key: "descripcion", label: "Descripción", type: "textarea" },
        { key: "tiendas", label: "¿Dónde se puede comprar?", type: "tiendas" },
      ],
    },
    {
      id: "medios",
      kind: "list",
      file: "data/medios.json",
      key: "medios",
      title: "En los medios",
      tileText: "Agregar una nota, un audio o un video donde salimos",
      icon: "bi-newspaper",
      page: "./#medios",
      one: "aparición",
      oneArticle: "una",
      sortable: false,
      sortNote: "Se ordenan solas por fecha: la más nueva aparece primero.",
      compare: (a, b) => (b.date || "").localeCompare(a.date || ""),
      itemTitle: (m) => m.title,
      itemSub: (m) => [(TIPOS_MEDIO.find((t) => t[0] === m.type) || [])[1], m.source, fmtDate(m.date)].filter(Boolean).join(" · "),
      itemImg: (m) => m.cover,
      blank: () => ({ type: "article", title: "", source: "", url: "", date: todayISO(), cover: "" }),
      fields: [
        { key: "type", label: "¿Qué es?", type: "tipo" },
        { key: "title", label: "Título", type: "text", required: true },
        { key: "url", label: "Enlace (a dónde lleva el botón «Ver»)", type: "url", required: true,
          hint: "Copiá la dirección de la nota, el audio o el video y pegala acá." },
        { key: "source", label: "Medio", type: "text", half: true, hint: "Ej: Para Ti, Radio Delta, YouTube" },
        { key: "date", label: "Fecha", type: "date", half: true },
        { key: "cover", label: "Imagen o logo del medio", type: "image", logos: true,
          hint: "Si es un video de YouTube y no ponés imagen, se usa la del video." },
      ],
    },
    {
      id: "servicios",
      kind: "list",
      file: "data/servicios.json",
      key: "servicios",
      title: "Servicios",
      tileText: "Agregar, cambiar o quitar servicios",
      icon: "bi-heart",
      page: "servicios.html",
      one: "servicio",
      sortable: true,
      itemTitle: (s) => s.titulo,
      itemSub: (s) => (s.audiencia || []).map((a) => (AUDIENCIAS.find((x) => x[0] === a) || [, a])[1]).join(", "),
      blank: () => ({ titulo: "", audiencia: ["paciente"], duracion: "", formato: "", descripcion: "", url: "contacto.html", brochure: null }),
      fields: [
        { key: "titulo", label: "Nombre del servicio", type: "text", required: true },
        { key: "audiencia", label: "¿Para quién es?", type: "checks", options: AUDIENCIAS,
          hint: "Marcá una o más. El servicio aparece en esas pestañas." },
        { key: "descripcion", label: "Descripción", type: "textarea" },
        { key: "formato", label: "Formato", type: "text", half: true, hint: "Ej: Online / Presencial" },
        { key: "duracion", label: "Duración", type: "text", half: true, hint: "Ej: 90 min" },
        { key: "url", label: "¿A dónde lleva el botón «Quiero más info»?", type: "url",
          hint: "Si no sabés, dejá contacto.html" },
        { key: "brochure", label: "Enlace al programa (opcional)", type: "url", nullable: true,
          hint: "Si lo completás, aparece el botón «Ver programa»." },
      ],
      extra: {
        key: "intros",
        title: "Textos de cada pestaña",
        fields: AUDIENCIAS.map(([k, l]) => ({ key: k, label: "Texto para " + l, type: "textarea" })),
      },
    },
  ];

  // =========================
  // ESTADO
  // =========================
  const state = {
    user: null,
    token: null,
    canPages: true,
    uploads: new Map(), // ruta -> { b64, url }
    dirty: false, // hay un formulario con cambios sin guardar
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, ...children) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
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
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // =========================
  // UTILIDADES
  // =========================
  function toast(msg, kind = "", ms = 5000) {
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

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function fmtDate(iso, long = false) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const opts = long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" };
    return new Date(y, m - 1, d).toLocaleDateString("es-AR", opts);
  }

  function clean(text, max = 80) {
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

    // ¿Alguien guardó lo mismo mientras editábamos?
    for (const f of files) {
      if (f.baseSha === undefined) continue;
      const current = await fileSha(f.path, headSha);
      if (current !== f.baseSha) {
        const e = new Error("Alguien más guardó cambios en esta sección mientras editabas.");
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
          throw new Error("La contraseña no es correcta. Revisá mayúsculas y espacios y probá de nuevo.");
        }
      }
      state.user = user;
      state.token = token;
      try {
        await verifyToken();
      } catch (e) {
        if (e.status === 401) throw new Error("La clave de acceso venció. Avisale a Patricio.");
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
    if (!confirmLeave()) return;
    clearSession();
    state.token = null;
    location.hash = "";
    location.reload();
  }

  // =========================
  // NAVEGACIÓN
  // =========================
  function startApp() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    route();
  }

  function confirmLeave() {
    if (!state.dirty) return true;
    if (!confirm("Hiciste cambios y todavía no los guardaste.\n\n¿Salir igual? (Los cambios se pierden)")) return false;
    state.dirty = false;
    return true;
  }

  // Rutas: "" (inicio) · "s/<id>" (lista) · "s/<id>/nuevo" · "s/<id>/<n>" · "s/<id>/extra" · "clave"
  function go(hash) {
    if (!confirmLeave()) return;
    if (location.hash.slice(1) === hash) route();
    else location.hash = hash;
  }

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (state.dirty && !confirm("Hiciste cambios y todavía no los guardaste.\n\n¿Salir igual? (Los cambios se pierden)")) {
      history.replaceState(null, "", lastHash || "#");
      return;
    }
    state.dirty = false;
    route();
  });

  async function route() {
    lastHash = location.hash;
    const parts = decodeURIComponent(location.hash.slice(1)).split("/").filter(Boolean);
    const content = $("#content");
    content.innerHTML = '<div class="loading"><i class="bi bi-arrow-repeat spin"></i> Cargando…</div>';
    window.scrollTo(0, 0);
    try {
      if (parts[0] === "clave") return renderPassword();
      const sec = parts[0] === "s" && SECTIONS.find((s) => s.id === parts[1]);
      if (!sec) return renderHome();
      if (sec.kind === "single") return await renderSingle(sec);
      if (!parts[2]) return await renderList(sec);
      if (parts[2] === "extra") return await renderExtra(sec);
      return await renderItemForm(sec, parts[2] === "nuevo" ? null : Number(parts[2]));
    } catch (e) {
      console.error(e);
      content.innerHTML = "";
      content.append(el("div", { class: "card" },
        el("h2", {}, "No se pudo cargar"),
        el("p", { class: "error" }, e.status === 401 ? "La sesión venció. Tocá «Salir» y volvé a entrar." : e.message),
        el("button", { class: "btn btn-ghost", onclick: () => go("") }, icon("bi-house"), "Volver al inicio")));
    }
  }

  // =========================
  // INICIO
  // =========================
  function renderHome() {
    const content = $("#content");
    content.innerHTML = "";
    const name = (state.user || "").split(" ")[0];
    content.append(
      el("h1", { class: "hello" }, name ? `Hola, ${name}` : "Hola"),
      el("p", { class: "lead" }, "¿Qué querés cambiar hoy? Tocá una opción."),
      el("div", { class: "tiles" }, SECTIONS.map((s) =>
        el("button", { type: "button", class: "tile", onclick: () => go("s/" + s.id) },
          el("span", { class: "tile-icon" }, icon(s.icon)),
          el("span", { class: "tile-text" },
            el("strong", {}, s.title),
            el("span", {}, s.tileText)),
          icon("bi-chevron-right tile-arrow")))),
      el("div", { class: "help-card" },
        el("h2", {}, icon("bi-lightbulb"), " Cómo funciona"),
        el("ol", {},
          el("li", {}, "Elegí qué querés cambiar."),
          el("li", {}, "Completá o corregí los datos."),
          el("li", {}, "Tocá ", el("strong", {}, "Guardar y publicar"), ". En 1 o 2 minutos se ve en la web.")),
        el("p", { class: "muted" }, "Si algo no sale como esperabas, no pasa nada: todos los cambios quedan guardados y se pueden recuperar.")),
      el("p", { class: "footer-links" },
        el("a", { href: "#clave" }, icon("bi-key"), " Cambiar contraseña"))
    );
  }

  function backButton(label, hash) {
    return el("button", { type: "button", class: "back-btn", onclick: () => go(hash) }, icon("bi-arrow-left"), " ", label);
  }

  function header(sec, subtitle) {
    return el("div", { class: "view-head" },
      el("h1", {}, icon(sec.icon), " ", sec.title),
      subtitle ? el("p", { class: "lead" }, subtitle) : null);
  }

  // =========================
  // DATOS
  // =========================
  async function loadData(sec) {
    const { text, sha } = await readFile(sec.file);
    return { json: JSON.parse(text), sha };
  }

  // Publica el JSON (y las fotos nuevas que use) en un solo commit
  async function publish(sec, data, what) {
    const out = JSON.stringify(data.json, null, 2) + "\n";
    const uploads = [];
    for (const [path, up] of state.uploads) if (out.includes(path)) uploads.push({ path, b64: up.b64 });
    const files = [...uploads, { path: sec.file, b64: textToB64(out), baseSha: data.sha }];
    const sha = await commitFiles(files, `Panel: ${state.user} ${what}`);
    data.sha = files[files.length - 1].newSha;
    for (const u of uploads) state.uploads.delete(u.path);
    watchDeploy(sha);
    return sha;
  }

  function publishError(e) {
    console.error(e);
    if (e.conflict) return "Alguien más guardó cambios en esta sección al mismo tiempo. Recargá la página y volvé a intentarlo.";
    if (e.status === 401) return "La sesión venció. Tocá «Salir» y volvé a entrar.";
    if (!navigator.onLine) return "Parece que no hay internet. Revisá la conexión y probá de nuevo.";
    return "No se pudo guardar (" + e.message + "). Probá de nuevo en un momento.";
  }

  async function watchDeploy(sha) {
    if (!state.canPages) return;
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const b = await gh(repoPath("/pages/builds/latest"));
        if (b.commit === sha && b.status === "built") {
          toast("✓ Ya se ve en la web.", "ok", 6000);
          return;
        }
        if (b.commit === sha && b.status === "errored") {
          toast("Hubo un problema publicando. Avisale a Patricio.", "err", 10000);
          return;
        }
      } catch {
        state.canPages = false; // el token no puede leer Pages: no pasa nada
        return;
      }
    }
  }

  // Cartel verde después de guardar
  let flash = null;
  function showFlash(content) {
    if (!flash) return;
    content.prepend(el("div", { class: "flash", role: "status" }, icon("bi-check-circle-fill"),
      el("div", {}, el("strong", {}, flash), el("div", {}, "En 1 o 2 minutos lo vas a ver en la web."))));
    flash = null;
  }

  // =========================
  // LISTA (talleres, libros, medios, servicios)
  // =========================
  async function renderList(sec) {
    const data = await loadData(sec);
    const arr = (data.json[sec.key] = data.json[sec.key] || []);
    const content = $("#content");
    content.innerHTML = "";
    const article = sec.oneArticle || "un";

    content.append(
      backButton("Volver al inicio", ""),
      header(sec),
      el("button", { type: "button", class: "btn btn-primary btn-big btn-add", onclick: () => go(`s/${sec.id}/nuevo`) },
        icon("bi-plus-circle"), ` Agregar ${article} ${sec.one}`)
    );
    showFlash(content);

    if (sec.sortNote) content.append(el("p", { class: "muted" }, icon("bi-info-circle"), " ", sec.sortNote));

    // Índices reales en el JSON, en el orden en que se muestran
    const order = arr.map((_, i) => i);
    if (sec.compare) order.sort((a, b) => sec.compare(arr[a], arr[b]));

    const list = el("div", { class: "rows" });
    if (!arr.length) list.append(el("p", { class: "muted" }, `Todavía no hay nada cargado. Tocá «Agregar ${article} ${sec.one}».`));

    order.forEach((idx, pos) => {
      const item = arr[idx];
      const img = sec.itemImg && sec.itemImg(item);
      const busy = (b) => content.querySelectorAll(".row button").forEach((x) => (x.disabled = b));

      const move = async (dir) => {
        busy(true);
        const j = idx + dir;
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        try {
          await publish(sec, data, `cambió el orden de ${sec.title}`);
          flash = "Listo, se cambió el orden.";
          route();
        } catch (e) {
          toast(publishError(e), "err", 10000);
          [arr[idx], arr[j]] = [arr[j], arr[idx]];
          busy(false);
        }
      };

      const del = async () => {
        const name = clean(sec.itemTitle(item), 60) || sec.one;
        if (!confirm(`¿Querés borrar «${name}» de la web?\n\nEsto no se puede deshacer desde el panel.`)) return;
        busy(true);
        arr.splice(idx, 1);
        try {
          await publish(sec, data, `borró «${name}» de ${sec.title}`);
          flash = `Listo, se borró «${name}».`;
          route();
        } catch (e) {
          toast(publishError(e), "err", 10000);
          arr.splice(idx, 0, item);
          busy(false);
        }
      };

      list.append(el("div", { class: "row" },
        sec.itemImg ? el("div", { class: "row-img" }, img ? el("img", { src: resolveSrc(img), alt: "", loading: "lazy" }) : icon(sec.icon)) : null,
        el("div", { class: "row-text" },
          el("strong", {}, clean(sec.itemTitle(item), 90) || "(sin título)"),
          sec.itemSub && sec.itemSub(item) ? el("span", {}, sec.itemSub(item)) : null),
        el("div", { class: "row-actions" },
          el("button", { type: "button", class: "btn btn-primary", onclick: () => go(`s/${sec.id}/${idx}`) }, icon("bi-pencil"), " Editar"),
          sec.sortable ? el("button", { type: "button", class: "btn btn-ghost btn-icon", title: "Mover más arriba", "aria-label": "Mover más arriba", disabled: pos === 0, onclick: () => move(-1) }, icon("bi-arrow-up")) : null,
          sec.sortable ? el("button", { type: "button", class: "btn btn-ghost btn-icon", title: "Mover más abajo", "aria-label": "Mover más abajo", disabled: pos === order.length - 1, onclick: () => move(1) }, icon("bi-arrow-down")) : null,
          el("button", { type: "button", class: "btn btn-danger btn-icon", title: "Borrar", "aria-label": "Borrar", onclick: del }, icon("bi-trash")))));
    });
    content.append(list);

    if (sec.sortable && arr.length > 1) content.append(el("p", { class: "muted small" }, "Con las flechas ", icon("bi-arrow-up"), icon("bi-arrow-down"), " cambiás el orden en que aparecen en la web."));
    if (sec.extra) {
      content.append(el("button", { type: "button", class: "btn btn-ghost", onclick: () => go(`s/${sec.id}/extra`) }, icon("bi-card-text"), " " + sec.extra.title));
    }
    content.append(viewOnSite(sec));
  }

  function viewOnSite(sec) {
    return el("p", { class: "footer-links" },
      el("a", { href: "../" + sec.page.replace(/^\.\//, ""), target: "_blank", rel: "noopener" }, icon("bi-box-arrow-up-right"), " Ver cómo se ve en la web"));
  }

  // =========================
  // FORMULARIOS
  // =========================
  async function renderItemForm(sec, idx) {
    const data = await loadData(sec);
    const arr = (data.json[sec.key] = data.json[sec.key] || []);
    const isNew = idx == null;
    if (!isNew && !arr[idx]) return go("s/" + sec.id);
    const item = isNew ? sec.blank() : clone(arr[idx]);

    const content = $("#content");
    content.innerHTML = "";
    content.append(
      backButton("Volver a " + sec.title, "s/" + sec.id),
      el("div", { class: "view-head" },
        el("h1", {}, isNew ? `Agregar ${sec.oneArticle || "un"} ${sec.one}` : `Editar ${sec.one}`),
        !isNew ? el("p", { class: "lead" }, clean(sec.itemTitle(item), 90)) : null)
    );

    const form = buildForm(sec.fields, item, sec, arr);
    content.append(form.node);

    content.append(saveBar(async () => {
      const err = form.validate();
      if (err) return err;
      if (isNew) arr.unshift(item);
      else arr[idx] = item;
      const name = clean(sec.itemTitle(item), 60);
      await publish(sec, data, `${isNew ? "agregó" : "editó"} «${name}» en ${sec.title}`);
      flash = isNew ? `Listo, se agregó «${name}».` : `Listo, se guardaron los cambios de «${name}».`;
      state.dirty = false;
      go("s/" + sec.id);
    }, () => go("s/" + sec.id), () => {
      if (isNew) arr.shift();
    }));
  }

  async function renderSingle(sec) {
    const data = await loadData(sec);
    const obj = clone(data.json);
    const content = $("#content");
    content.innerHTML = "";
    content.append(backButton("Volver al inicio", ""), header(sec));
    showFlash(content);
    const form = buildForm(sec.fields, obj, sec);
    content.append(form.node);
    content.append(saveBar(async () => {
      const err = form.validate();
      if (err) return err;
      data.json = obj;
      await publish(sec, data, `editó ${sec.title}${obj.fecha ? " (cierra " + obj.fecha + ")" : ""}`);
      flash = "Listo, se guardaron los cambios.";
      state.dirty = false;
      route();
    }, () => go("")));
    content.append(viewOnSite(sec));
  }

  async function renderExtra(sec) {
    const data = await loadData(sec);
    const obj = clone(data.json[sec.extra.key] || {});
    const content = $("#content");
    content.innerHTML = "";
    content.append(
      backButton("Volver a " + sec.title, "s/" + sec.id),
      el("div", { class: "view-head" }, el("h1", {}, sec.extra.title),
        el("p", { class: "lead" }, "Es el texto que aparece arriba de las tarjetas, según la pestaña elegida.")));
    const form = buildForm(sec.extra.fields, obj, sec);
    content.append(form.node);
    content.append(saveBar(async () => {
      data.json[sec.extra.key] = obj;
      await publish(sec, data, `editó ${sec.extra.title.toLowerCase()} de ${sec.title}`);
      flash = "Listo, se guardaron los textos.";
      state.dirty = false;
      go("s/" + sec.id);
    }, () => go("s/" + sec.id)));
  }

  // Botones Guardar / Cancelar. onSave devuelve un texto si hay un error de validación.
  function saveBar(onSave, onCancel, onFail) {
    const msg = el("p", { class: "error", role: "alert", hidden: true });
    const btn = el("button", { type: "button", class: "btn btn-primary btn-big" }, icon("bi-cloud-arrow-up"), " Guardar y publicar");
    btn.addEventListener("click", async () => {
      msg.hidden = true;
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Publicando… no cierres la página';
      try {
        const err = await onSave();
        if (err) {
          msg.textContent = err;
          msg.hidden = false;
        }
      } catch (e) {
        if (onFail) onFail();
        msg.textContent = publishError(e);
        msg.hidden = false;
      } finally {
        if (btn.isConnected) {
          btn.disabled = false;
          btn.innerHTML = "";
          btn.append(icon("bi-cloud-arrow-up"), " Guardar y publicar");
        }
      }
    });
    return el("div", { class: "save-bar" }, msg,
      el("div", { class: "save-buttons" }, btn,
        el("button", { type: "button", class: "btn btn-ghost btn-big", onclick: onCancel }, "Cancelar")));
  }

  function buildForm(fields, obj, sec, arr) {
    const node = el("div", { class: "card form" });
    const checks = [];
    let row = null;
    for (const f of fields) {
      const fieldEl = field(f, obj, sec, arr);
      if (f.required) {
        checks.push(() => {
          const v = obj[f.key];
          return v == null || String(v).trim() === "" ? `Falta completar «${f.label}».` : null;
        });
      }
      if (f.type === "url") {
        checks.push(() => {
          const v = (obj[f.key] || "").trim();
          return v && /\s/.test(v) ? `El enlace de «${f.label}» tiene espacios. Revisá que esté bien copiado.` : null;
        });
      }
      if (f.type === "checks") {
        checks.push(() => ((obj[f.key] || []).length ? null : `Marcá al menos una opción en «${f.label}».`));
      }
      if (f.half) {
        if (!row) { row = el("div", { class: "field-row" }); node.append(row); }
        row.append(fieldEl);
        if (row.children.length === 2) row = null;
      } else {
        row = null;
        node.append(fieldEl);
      }
    }
    return {
      node,
      validate: () => {
        for (const c of checks) {
          const e = c();
          if (e) return e;
        }
        return null;
      },
    };
  }

  function field(f, obj, sec, arr) {
    const set = (v) => { obj[f.key] = v; state.dirty = true; };
    const val = obj[f.key];
    const id = "f-" + f.key;
    const label = el("label", { for: id }, f.label, f.required ? el("span", { class: "req" }, " *") : null);
    const hint = f.hint ? el("p", { class: "hint" }, f.hint) : null;
    const wrap = (...inner) => el("div", { class: "field" + (f.big ? " field-big" : "") }, label, hint, ...inner);

    if (f.type === "textarea") {
      const t = el("textarea", { id, rows: 6 }, val || "");
      t.addEventListener("input", () => set(t.value));
      return wrap(t);
    }

    if (f.type === "date") {
      const input = el("input", { id, type: "date", value: val || "" });
      const info = el("p", { class: "date-info" });
      const upd = () => {
        if (!input.value) { info.textContent = ""; return; }
        let txt = fmtDate(input.value, true);
        if (f.big) {
          const [y, m, d] = input.value.split("-").map(Number);
          const days = Math.ceil((new Date(y, m - 1, d, 23, 59, 59) - new Date()) / 86400000);
          txt += days > 1 ? ` · faltan ${days} días` : days === 1 ? " · ¡es hoy!" : " · esta fecha ya pasó: la cuenta regresiva no se va a mostrar";
        }
        info.textContent = txt;
      };
      input.addEventListener("input", () => { set(input.value); upd(); });
      upd();
      return wrap(input, info);
    }

    if (f.type === "tipo") {
      const group = el("div", { class: "type-pick", role: "radiogroup" });
      const draw = () => {
        group.innerHTML = "";
        for (const [v, l, ic] of TIPOS_MEDIO) {
          group.append(el("button", { type: "button", role: "radio", "aria-checked": String(obj[f.key] === v),
            class: "type-btn" + (obj[f.key] === v ? " is-on" : ""),
            onclick: () => { set(v); draw(); } }, icon(ic), el("span", {}, l)));
        }
      };
      draw();
      return el("div", { class: "field" }, el("label", {}, f.label), group);
    }

    if (f.type === "checks") {
      const current = new Set(Array.isArray(val) ? val : []);
      const box = el("div", { class: "big-checks" }, f.options.map(([v, l]) => {
        const cb = el("input", { type: "checkbox", checked: current.has(v) });
        cb.addEventListener("change", () => {
          cb.checked ? current.add(v) : current.delete(v);
          set(f.options.map(([k]) => k).filter((k) => current.has(k)));
        });
        return el("label", { class: "big-check" }, cb, el("span", {}, l));
      }));
      return el("div", { class: "field" }, el("label", {}, f.label), hint, box);
    }

    if (f.type === "image") return imageField(f, obj, set, label, hint, arr);
    if (f.type === "tiendas") return storesField(f, obj, label);

    const input = el("input", { id, type: f.type === "url" ? "url" : "text", value: val == null ? "" : val,
      placeholder: f.type === "url" ? "https://…" : "", autocomplete: "off", spellcheck: f.type === "url" ? "false" : null });
    input.addEventListener("input", () => set(f.nullable && !input.value.trim() ? null : f.type === "url" ? input.value.trim() : input.value));
    return wrap(input);
  }

  function imageField(f, obj, set, label, hint, arr) {
    const preview = el("div", { class: "img-preview" });
    const drawPreview = () => {
      preview.innerHTML = "";
      const v = obj[f.key];
      if (v) preview.append(el("img", { src: resolveSrc(v), alt: "" }));
      else preview.append(el("span", { class: "muted" }, icon("bi-image"), " Sin foto"));
    };
    drawPreview();

    const status = el("p", { class: "img-status" });
    const pick = el("button", { type: "button", class: "btn btn-ghost btn-big" }, icon("bi-upload"), " Elegir foto");
    pick.addEventListener("click", async () => {
      const file = await pickFile();
      if (!file) return;
      pick.disabled = true;
      status.textContent = "Preparando la foto…";
      try {
        const p = await stageUpload(file, obj.titulo || obj.title || file.name);
        set(p);
        drawPreview();
        status.textContent = "✓ Foto lista. Se sube cuando toques «Guardar y publicar».";
      } catch (e) {
        status.textContent = "";
        toast("No se pudo usar esa foto: " + e.message, "err");
      } finally {
        pick.disabled = false;
      }
    });
    const remove = el("button", { type: "button", class: "btn btn-ghost" }, icon("bi-x-lg"), " Quitar foto");
    remove.addEventListener("click", () => { set(""); drawPreview(); status.textContent = ""; });

    const extras = [];
    // Logos ya cargados en otras apariciones en medios
    if (f.logos && arr) {
      const seen = new Set();
      const logos = arr.map((m) => m.cover).filter((c) => c && !seen.has(c) && seen.add(c));
      if (logos.length) {
        extras.push(el("p", { class: "hint" }, "O usá un logo que ya está cargado:"),
          el("div", { class: "logo-pick" }, logos.map((c) =>
            el("button", { type: "button", class: "logo-btn", title: "Usar este logo", onclick: () => {
              set(c); drawPreview(); status.textContent = "✓ Logo elegido.";
            } }, el("img", { src: resolveSrc(c), alt: "" })))));
      }
    }

    return el("div", { class: "field" }, label, hint,
      el("div", { class: "img-field" }, preview,
        el("div", { class: "img-actions" }, pick, remove, status)),
      ...extras);
  }

  function storesField(f, obj, label) {
    const stores = (obj[f.key] = Array.isArray(obj[f.key]) ? obj[f.key] : []);
    const rows = el("div", { class: "stores" });
    const draw = () => {
      rows.innerHTML = "";
      stores.forEach((s, i) => {
        const name = el("input", { type: "text", value: s.nombre || "", placeholder: "Nombre de la tienda (ej: Amazon)" });
        const url = el("input", { type: "url", value: s.url || "", placeholder: "Enlace al libro en esa tienda (https://…)", spellcheck: "false" });
        name.addEventListener("input", () => { s.nombre = name.value; state.dirty = true; });
        url.addEventListener("input", () => { s.url = url.value.trim(); state.dirty = true; });
        rows.append(el("div", { class: "store" },
          el("div", { class: "store-num" }, String(i + 1)),
          el("div", { class: "store-inputs" }, name, url),
          el("button", { type: "button", class: "btn btn-danger btn-icon", title: "Quitar esta tienda", "aria-label": "Quitar esta tienda",
            onclick: () => { stores.splice(i, 1); state.dirty = true; draw(); } }, icon("bi-trash"))));
      });
    };
    draw();
    return el("div", { class: "field" }, label,
      el("p", { class: "hint" }, "Aparecen al tocar «Conseguir libro»."),
      rows,
      el("button", { type: "button", class: "btn btn-ghost", onclick: () => { stores.push({ nombre: "", url: "" }); state.dirty = true; draw(); } },
        icon("bi-plus-lg"), " Agregar otra tienda"));
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
  // CONTRASEÑA
  // =========================
  function renderPassword() {
    const content = $("#content");
    content.innerHTML = "";
    content.append(backButton("Volver al inicio", ""),
      el("div", { class: "view-head" }, el("h1", {}, icon("bi-key"), " Cambiar contraseña")));

    const pass1 = el("input", { type: "password", autocomplete: "new-password" });
    const pass2 = el("input", { type: "password", autocomplete: "new-password" });
    const newToken = el("input", { type: "password", autocomplete: "off", placeholder: "Dejalo vacío" });
    const btn = el("button", { type: "button", class: "btn btn-primary btn-big" }, icon("bi-shield-lock"), " Guardar contraseña");
    btn.addEventListener("click", async () => {
      if (pass1.value.length < 10) return toast("La contraseña tiene que tener al menos 10 letras o números.", "err");
      if (pass1.value !== pass2.value) return toast("Las dos contraseñas no son iguales.", "err");
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

    content.append(el("div", { class: "card form" },
      el("p", { class: "muted" }, "Es la contraseña que usan todas las personas que administran la web. Usá una frase larga y fácil de recordar (ej: «MaiaTina y los dinos 2026»)."),
      el("div", { class: "field" }, el("label", {}, "Nueva contraseña"), pass1),
      el("div", { class: "field" }, el("label", {}, "Repetí la contraseña"), pass2),
      el("details", { class: "advanced" }, el("summary", {}, "Avanzado"),
        el("div", { class: "field" }, el("label", {}, "Token nuevo de GitHub (sólo si el anterior venció)"), newToken)),
      el("div", { class: "save-buttons" }, btn)));
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
    $("#logout-btn").addEventListener("click", logout);
    $("#home-btn").addEventListener("click", () => go(""));
    window.addEventListener("beforeunload", (e) => {
      if (state.dirty) {
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
