// assets/js/media.js
// Sección "En los medios" - SGM+
// SIEMPRE SLIDER (Swiper) + filtros + JSON-LD
// Sin thumbnails automáticos: siempre usa `cover`.

(function () {
  // =========================
  // 0) CONFIG
  // =========================
  let mediosSwiper = null; // instancia del carrusel
  let currentFilter = "all";

  // =========================
  // 1) DATA: se edita desde /admin (data/medios.json)
  // =========================
  let mediaItems = [];

  // =========================
  // 2) HELPERS
  // =========================
  const typeIcon = {
    article: "bi-newspaper",
    audio: "bi-mic",
    video: "bi-play-btn",
  };
  const typeLabel = { article: "Notas", audio: "Audio", video: "Video" }; // Consistencia de etiquetas

  function domainFromUrl(u) {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  // Sólo para mostrar el botón “Reproducir” en videos YouTube (no para thumbnails)
  function getYouTubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    } catch {}
    return null;
  }

  // Usa cover. Si falta: miniatura de YouTube o un genérico local.
  function guessThumb(item) {
    if (item.cover) return item.cover;
    const yt = getYouTubeId(item.url);
    if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
    return "assets/img/media/thumb-template.png";
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("es-AR", { year: "numeric", month: "short" });
  }

  function ucfirst(s) {
    return (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
  }

  // =========================
  // 3) RENDER (SIEMPRE SLIDER) + JSON-LD
  // =========================
  function renderMedia(filter = "all") {
    currentFilter = filter;

    const items = mediaItems
      .filter((it) => (filter === "all" ? true : it.type === filter))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const grid = document.getElementById("media-grid");
    if (!grid) return;

    if (mediosSwiper && mediosSwiper.destroy) {
      mediosSwiper.destroy(true, true);
      mediosSwiper = null;
    }
    grid.innerHTML = "";

    if (!items.length) {
      grid.innerHTML = `<p class="text-muted">No hay menciones para este filtro aún.</p>`;
      injectJSONLD([]);
      return;
    }

    // Wrapper Swiper
    const wrapper = document.createElement("div");
    wrapper.className = "swiper medios-swiper";
    wrapper.innerHTML = `
      <div class="swiper-wrapper"></div>
    `;
    grid.appendChild(wrapper);
    const sw = wrapper.querySelector(".swiper-wrapper");

    // Slides
    items.forEach((item) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.appendChild(buildMediaCard(item));
      sw.appendChild(slide);
    });

    // Init Swiper (mobile y desktop)
    mediosSwiper = new Swiper(wrapper, {
      loop: false,
      speed: 500,
      slidesPerView: 1,
      spaceBetween: 16,
      pagination: {
        el: wrapper.querySelector(".swiper-pagination"),
        clickable: true,
      },
      navigation: {
        nextEl: wrapper.querySelector(".swiper-button-next"),
        prevEl: wrapper.querySelector(".swiper-button-prev"),
      },
      breakpoints: {
        576: { slidesPerView: 2, spaceBetween: 16 },
        992: { slidesPerView: 3, spaceBetween: 18 },
        1280: { slidesPerView: 4, spaceBetween: 18 },
      },
    });

    // JSON-LD para todo el set
    injectJSONLD(items);
  }

  function buildMediaCard(item) {
    const thumb = guessThumb(item);
    const icon = typeIcon[item.type] || "bi-link-45deg";
    const label = typeLabel[item.type] || ucfirst(item.type); // << Consistencia: “Notas”, “Audio”, “Video”
    const source = item.source || domainFromUrl(item.url);
    const titleEsc = (item.title || "").replace(/"/g, "&quot;");

    // Si el cover es un logo (guardado en /assets/img/media/), aplicamos estilo "is-logo"
    const usesLogo = !!(
      item.cover && /\/assets\/img\/media\//.test(item.cover)
    );

    const card = document.createElement("article");
    card.className = "media-card" + (usesLogo ? " is-logo" : "");
    card.setAttribute("data-type", item.type);
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <div class="media-thumb">
        <img src="${thumb}" alt="${titleEsc}" loading="lazy" decoding="async">
        <span class="media-badge"><i class="bi ${icon}"></i> ${label}</span>
        <span class="media-source">${source}</span>
      </div>
      <div class="media-body">
        <div class="media-title">${item.title}</div>
        <div class="media-meta">
          ${
            source
              ? `<span><i class="bi bi-building"></i> ${source}</span>`
              : ""
          }
          ${
            item.date
              ? `<span><i class="bi bi-calendar3"></i> ${formatDate(
                  item.date
                )}</span>`
              : ""
          }
        </div>
        <div class="media-actions">
          <a href="${item.url}" target="_blank" rel="noopener">
            <i class="bi bi-box-arrow-up-right"></i> Ver
          </a>
          ${
            item.type === "video" && getYouTubeId(item.url)
              ? `<a href="${item.url}" target="_blank" rel="noopener"><i class="bi bi-youtube"></i> Reproducir</a>`
              : ""
          }
        </div>
      </div>
    `;
    return card;
  }

  function injectJSONLD(items) {
    const old = document.getElementById("medios-jsonld");
    if (old) old.remove();

    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Menciones en medios de SGM+",
      itemListElement: items.map((it, idx) => {
        const base =
          it.type === "video"
            ? { "@type": "VideoObject", name: it.title, url: it.url }
            : it.type === "audio"
            ? { "@type": "AudioObject", name: it.title, url: it.url }
            : { "@type": "NewsArticle", headline: it.title, url: it.url };
        return { "@type": "ListItem", position: idx + 1, item: base };
      }),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "medios-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  // =========================
  // 4) EVENTOS (filtros) + INIT
  // =========================
  function wireFilters() {
    const container = document.querySelector(".media-filters");
    if (!container) return;

    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-chip");
      if (!btn) return;
      const all = [...container.querySelectorAll(".btn-chip")];
      all.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      renderMedia(btn.dataset.filter || "all");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireFilters();
    fetch("data/medios.json", { cache: "no-cache" })
      .then((r) => r.json())
      .then((data) => {
        mediaItems = Array.isArray(data.medios) ? data.medios : [];
      })
      .catch((err) => console.error("No se pudo cargar data/medios.json", err))
      .finally(() => renderMedia("all"));
  });

  // =========================
  // 5) API mínima (consola)
  // =========================
  window.SGMMedia = {
    add(item) {
      mediaItems.push(item);
      renderMedia(currentFilter);
    },
    list() {
      return [...mediaItems];
    },
    render(filter = "all") {
      renderMedia(filter);
    },
  };
})();
