// Datos: se editan desde /admin (data/servicios.json)
let DATA_SERVICIOS = [];
let INTRO_AUDIENCIA = {};

const grid = document.getElementById("servicios-grid");
const buttons = document.querySelectorAll(".audiencia-btn");
const ctaBtn = document.getElementById("servicios-cta-btn");
const introEl = document.getElementById("servicios-intro");
let serviciosSwiper = null; // <- instancia global

/** Utilidades URL (sin provocar scroll) */
function getAudFromURL() {
  const url = new URL(location.href);
  // Soporte legacy: migrar #audiencia=... a ?audiencia=...
  if (url.hash.startsWith("#audiencia=")) {
    const aud = url.hash.split("=")[1];
    url.hash = ""; // quitar hash para evitar salto
    url.searchParams.set("audiencia", aud);
    history.replaceState(null, "", url);
    return (aud || "paciente").toLowerCase();
  }

  const q = url.searchParams.get("audiencia");
  return (q || "paciente").toLowerCase();
}
function setAudInURL(aud) {
  const url = new URL(location.href);
  url.searchParams.set("audiencia", aud);
  url.hash = ""; // garantizamos sin hash
  history.replaceState(null, "", url);
}
/** Render básico */
function render(aud) {
  // estado visual
  buttons.forEach((b) => {
    const active = b.dataset.audiencia === aud;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (introEl) {
    introEl.textContent = INTRO_AUDIENCIA[aud] || "";
  }
  // tarjetas
  grid.innerHTML = "";
  const items = DATA_SERVICIOS.filter((s) => s.audiencia.includes(aud));
  items.forEach((s) => {
    const card = document.createElement("article");
    card.className = "servicio-card swiper-slide";
    card.setAttribute("data-audiencia", s.audiencia.join(","));
    card.innerHTML = `
      <h3>${s.titulo}</h3>
      <div class="servicio-meta">
        <span>${s.formato}</span>
        <span>•</span>
        <span>${s.duracion}</span>
      </div>
      <p class="servicio-desc">${s.descripcion}</p>
      <div class="servicio-actions">
        <a class="btn-primary" href="${s.url}">Quiero más info</a>
        ${
          s.brochure
            ? `<a class="btn-outline" href="${s.brochure}" target="_blank" rel="noopener">Ver programa</a>`
            : ""
        }
      </div>
    `;
    grid.appendChild(card);
  });
  // CTA + URL sin hash (evita scroll)
  ctaBtn.href = "contacto.html";
  setAudInURL(aud);
  if (serviciosSwiper) {
    serviciosSwiper.update();
  }
}
/** Eventos */
buttons.forEach((b) =>
  b.addEventListener("click", () => render(b.dataset.audiencia))
);

document.addEventListener("DOMContentLoaded", () => {
  fetch("data/servicios.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => {
      DATA_SERVICIOS = Array.isArray(data.servicios) ? data.servicios : [];
      INTRO_AUDIENCIA = data.intros || {};
    })
    .catch((err) => console.error("No se pudo cargar data/servicios.json", err))
    .finally(() => render(getAudFromURL()));

  serviciosSwiper = new Swiper(".servicios-swiper", {
    slidesPerView: 1,
    spaceBetween: 16,
    speed: 400,
    fadeEffect: { crossFade: true },
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    preloadImages: false,
    lazy: {
      enabled: true,
      loadOnTransitionStart: true,
      loadPrevNext: true,
    },
    grabCursor: true,
    centerInsufficientSlides: true,
    pagination: {
      el: ".servicios-swiper .swiper-pagination",
      clickable: true,
    },
    breakpoints: {
      768: {
        slidesPerView: 2,
        spaceBetween: 18,
      },
      1200: {
        slidesPerView: 4,
        spaceBetween: 22,
      },
    },
  });
});

