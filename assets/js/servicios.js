const DATA_SERVICIOS = [
  // ——— Pacientes ———
  {
    titulo: "Atención individual",
    audiencia: ["paciente"],
    duracion: "35 min",
    formato: "Online / Presencial",
    descripcion:
      "Espacio clínico para acompañar procesos vinculados con la búsqueda de maternidad/paternidad, los deseos, los duelos, el origen, la crianza y la pareja. Trabajamos sobre el deseo, las esperas, el cansancio y la montaña rusa emocional que puede acompañar el camino de maternar.",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfsVvvuaqPRgL_TAy0IXY1ZfDlZETRir6nJiA2iwX7NNhO_2A/viewform",
    // brochure: "assets/img/servicios/brochure_single.png",
    brochure: null,
  },
  {
    titulo: "Grupos de apoyo",
    audiencia: ["paciente"],
    duracion: "2×90 min",
    formato: "Grupo",
    descripcion:
      "Espacios íntimos y pequeños, coordinados por psicólogas especializadas. Confianza, pertenencia y herramientas para transitar el deseo de maternar: FIV/ICSI, ovodonación, espermodonación, monomarentalidad, dificultades reproductivas y duelos. Tu tribu para no hacerlo sola.",
    url: "",
    // brochure: "assets/img/servicios/brochure_circulo.png",
    brochure: null,
  },
  // ——— Empresas ———
  {
    titulo: "Taller Bienestar laboral & fertilidad",
    audiencia: ["empresa"],
    duracion: "120 min",
    formato: "In-company / Online",
    descripcion:
      "Concientización sin estigma y herramientas prácticas para líderes y equipos. Prevención de burnout y presentismo.",
    url: "contacto.html",
    brochure: null,
  },
  {
    titulo: "Programa Cultura SGM+ (empresa)",
    audiencia: ["empresa"],
    duracion: "8 sem",
    formato: "Programa",
    descripcion:
      "Implementación de políticas ad-hoc, comunicación interna y tercerización del apoyo emocional (grupal e individual).",
    url: "contacto.html",
    brochure: null,
  },
  {
    titulo: "Pack comunicación sin estigma",
    audiencia: ["empresa"],
    duracion: "2–4 sem",
    formato: "In-company / Remoto",
    descripcion:
      "Campañas y comunicación interna/externa para visibilizar fertilidad sin prejuicios. Piezas, guías y activaciones.",
    url: "contacto.html",
    brochure: null,
  },
  {
    titulo: "Políticas y permisos de fertilidad",
    audiencia: ["empresa"],
    duracion: "4–6 sem",
    formato: "Consultoría",
    descripcion:
      "Diseño/adaptación de políticas laborales, lineamientos para RR.HH. y líderes, y protocolo de confidencialidad.",
    url: "contacto.html",
    brochure: null,
  },
  // ——— Profesionales ———
  {
    titulo: "Formación en salud mental reproductiva",
    audiencia: ["profesional"],
    duracion: "8 módulos",
    formato: "Online",
    descripcion:
      "Psicología perinatal, coordinación de grupos, ética del cuidado y diseño de intervenciones basadas en evidencia.",
    url: "contacto.html",
    brochure: null,
  },
  {
    titulo: "Clínica de casos (supervisión)",
    audiencia: ["profesional"],
    duracion: "Mensual",
    formato: "Grupal / Individual",
    descripcion:
      "Supervisión clínica con enfoque SGM+ para casos de infertilidad, duelos reproductivos y trabajo con grupos.",
    url: "contacto.html",
    brochure: null,
  },
  {
    titulo: "Kits y guías de intervención",
    audiencia: ["profesional"],
    duracion: "On-demand",
    formato: "Descargables",
    descripcion:
      "Guías para coordinación de grupos, hojas de trabajo, escalas y protocolos de derivación con enfoque SGM+.",
    url: "contacto.html",
    brochure: null,
  },
];
const grid = document.getElementById("servicios-grid");
const buttons = document.querySelectorAll(".audiencia-btn");
const ctaBtn = document.getElementById("servicios-cta-btn");
const introEl = document.getElementById("servicios-intro");
let serviciosSwiper = null; // <- instancia global

const INTRO_AUDIENCIA = {
  paciente:
    "Te acompañamos en el deseo de maternar, los tratamientos de fertilidad, los duelos y las decisiones que aparecen en el camino. Podés elegir espacios individuales o grupales según lo que necesites hoy.",
  empresa:
    "Acompañamos a las organizaciones a crear entornos laborales sin estigmas, con políticas, educación y apoyo que fortalecen el bienestar, la productividad y la inclusión.",
  profesional:
    "Formación, supervisión y recursos para profesionales que trabajan o quieren empezar a trabajar en salud mental reproductiva, acompañando deseos, duelos y proyectos de familia.",
};
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
  const audInicial = getAudFromURL();
  render(audInicial);

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

/** Init (URL awareness) */
render(getAudFromURL());
