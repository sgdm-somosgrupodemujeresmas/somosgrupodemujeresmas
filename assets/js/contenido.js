// assets/js/contenido.js
// Libros, talleres y "Próximo taller": se editan desde /admin (data/*.json)

(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  // Texto con saltos de línea -> HTML seguro
  const multiline = (s) => esc(s).replace(/\n/g, "<br />");

  function getJSON(path) {
    return fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(path + " " + r.status);
      return r.json();
    });
  }

  function startSwiper(container) {
    if (typeof Swiper === "undefined" || !container) return;
    const cfg = container.querySelector(".swiper-config");
    const sw = new Swiper(container, cfg ? JSON.parse(cfg.textContent) : {});
    if (typeof window.registerSwiper === "function") window.registerSwiper(sw);
  }

  // =========================
  // LIBROS (index.html)
  // =========================
  function renderLibros(list) {
    const wrapper = document.getElementById("libros-lista");
    if (!wrapper) return;
    wrapper.innerHTML = list
      .map((b) => {
        const nombre = b.subtitulo ? `${b.titulo} — ${b.subtitulo}` : b.titulo;
        const tiendas = (b.tiendas || [])
          .filter((t) => t.url)
          .map((t) => ({ label: t.nombre || "Comprar", url: t.url }));
        return `
        <div class="swiper-slide">
          <div class="related-book-card">
            <div class="book-image">
              <img src="${esc(b.tapa)}" alt="Tapa del libro ${esc(nombre)}" class="img-fluid" loading="lazy" />
              ${b.etiqueta ? `<div class="book-category">${esc(b.etiqueta)}</div>` : ""}
            </div>
            <div class="book-info">
              <h3>${esc(b.titulo)}${b.subtitulo ? `<br />${esc(b.subtitulo)}` : ""}</h3>
              <p class="descripcion">${multiline(b.descripcion)}</p>
              <div class="book-actions">
                <a href="javascript:void(0)" class="btn-details js-toggle-desc">Ver más</a>
                ${
                  tiendas.length
                    ? `<button type="button" class="btn btn-purchase js-open-buy-modal"
                        data-bs-toggle="modal" data-bs-target="#buyModal"
                        data-title="${esc(nombre)}"
                        data-links="${esc(JSON.stringify(tiendas))}">Conseguir libro</button>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");
    startSwiper(wrapper.closest(".swiper"));
  }

  // Ventana "Conseguir libro"
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-open-buy-modal");
    if (!btn) return;
    const title = document.getElementById("buyModalTitle");
    const links = document.getElementById("buyModalLinks");
    if (!title || !links) return;
    title.textContent = btn.dataset.title || "";
    links.innerHTML = "";
    let items = [];
    try { items = JSON.parse(btn.dataset.links || "[]"); } catch {}
    items.forEach((link) => {
      const a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "btn btn-outline-secondary";
      a.textContent = link.label;
      links.appendChild(a);
    });
  });

  // =========================
  // TALLERES (talleres.html)
  // =========================
  function renderTalleres(list) {
    const wrapper = document.getElementById("talleres-lista");
    if (!wrapper) return;
    wrapper.innerHTML = list
      .map((t) => {
        const datos = [
          t.duracion ? `<strong>Duración:</strong> ${esc(t.duracion)}` : "",
          t.modalidad ? `<strong>Modalidad:</strong> ${esc(t.modalidad)}` : "",
        ].filter(Boolean).join(" · ");
        return `
        <div class="swiper-slide">
          <article class="taller-card-xl">
            <div class="taller-card-xl__content">
              ${t.etiqueta ? `<span class="badge">${esc(t.etiqueta)}</span>` : ""}
              <h3>${esc(t.titulo)}</h3>
              <p>${multiline(t.descripcion)}${datos ? " " + datos : ""}</p>
              ${t.url ? `<a href="${esc(t.url)}" class="btn-primary" target="_blank" rel="noopener">${esc(t.boton || "Comprar")}</a>` : ""}
            </div>
            <div class="taller-card-xl__media">
              ${t.imagen ? `<img src="${esc(t.imagen)}" alt="${esc(t.titulo)}" loading="lazy" />` : ""}
            </div>
          </article>
        </div>`;
      })
      .join("");
    startSwiper(wrapper.closest(".swiper"));
  }

  // =========================
  // PRÓXIMO TALLER (cuenta regresiva en index.html)
  // =========================
  function renderProximo(d) {
    const sec = document.getElementById("call-to-action");
    if (!sec) return;
    const set = (sel, fn) => { const n = sec.querySelector(sel); if (n) fn(n); };
    if (d.etiqueta) set(".cta-content .badge", (n) => (n.textContent = d.etiqueta));
    if (d.titulo) set(".cta-content h2", (n) => (n.textContent = d.titulo));
    if (d.texto) set(".cta-content > p", (n) => (n.innerHTML = multiline(d.texto)));
    if (d.imagen) set(".cta-book-image img", (n) => { n.src = d.imagen; n.alt = d.titulo || ""; });
    if (d.url) sec.querySelectorAll(".cta-buttons a").forEach((a) => (a.href = d.url));

    if (/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || "")) {
      // Las inscripciones cierran al final de ese día
      const fin = d.fecha.replace(/-/g, "/") + " 23:59:59";
      set(".countdown", (n) => n.setAttribute("data-count", fin));
      const timer = sec.querySelector(".countdown-timer");
      if (timer && new Date(fin).getTime() < Date.now()) timer.hidden = true;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("libros-lista")) {
      getJSON("data/libros.json")
        .then((d) => renderLibros(d.libros || []))
        .catch((e) => console.error("No se pudo cargar data/libros.json", e));
    }
    if (document.getElementById("talleres-lista")) {
      getJSON("data/talleres.json")
        .then((d) => renderTalleres(d.talleres || []))
        .catch((e) => console.error("No se pudo cargar data/talleres.json", e));
    }
    if (document.getElementById("call-to-action")) {
      getJSON("data/proximo-taller.json")
        .then(renderProximo)
        .catch((e) => console.error("No se pudo cargar data/proximo-taller.json", e));
    }
  });
})();
