/* Supreme Tires MX — "La llanta guía".
   Este archivo dirige el recorrido: decide qué pose toma la llanta según lo que
   esté a media pantalla, y maneja menú, promos, marcas, sucursales y formulario.
   La llanta 3D vive en tire.js. */

// Número de WhatsApp para recibir cotizaciones, con lada de país y sin espacios
// (ej. "524441234567"). Mientras esté vacío, el formulario invita a llamar.
const CONFIG = { whatsapp: '' };

const SUCURSALES = [
  { nombre: 'Supreme Tires Las Vías', tel: '444 411 3800' },
  { nombre: 'Supreme Tires Acceso Norte', tel: '444 130 4500' },
  { nombre: 'Supreme Tires Muñoz', tel: '444 188 5471' },
  { nombre: 'Supreme Tires Cd. Valles', tel: '481 113 0286' },
  { nombre: 'Supreme Tires Constitución', tel: '444 122 5321' },
];

const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const celular = window.matchMedia('(max-width: 820px)');
const hayGsap = typeof window.gsap !== 'undefined';
const telHref = (tel) => 'tel:+52' + tel.replace(/\D/g, '');

/* ---------- Scroll suave ---------- */
let lenis = null;
if (!quieto && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  if (hayGsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

function irA(destino) {
  const el = typeof destino === 'string' ? document.querySelector(destino) : destino;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4 });
  else el.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    cerrarMenu();
    irA(id);
  });
});

/* ---------- Navegación ---------- */
const nav = document.getElementById('nav');
const menu = document.getElementById('menu');
const toggle = document.getElementById('menuToggle');

function cerrarMenu() {
  menu.classList.remove('is-open');
  document.body.classList.remove('menu-abierto');
  toggle.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
toggle.addEventListener('click', () => {
  const abierto = menu.classList.toggle('is-open');
  document.body.classList.toggle('menu-abierto', abierto);
  toggle.setAttribute('aria-expanded', String(abierto));
  abierto ? lenis?.stop() : lenis?.start();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

/* ---------- Entrada ---------- */
if (hayGsap && !quieto) {
  gsap.timeline({ delay: 0.15 })
    .from('.inicio__titulo .line > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.12 })
    .from('.inicio__lead, .inicio__acciones, .inicio__badge, .inicio__baja', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, '-=0.6')
    // Solo opacidad: una transformación en .nav encerraría al menú fijo dentro de la barra.
    .from('.nav', { opacity: 0, duration: 0.8, ease: 'power2.out', clearProps: 'opacity' }, 0.4);
}

/* ---------- Director: la pose de la llanta sigue a lo que está a media pantalla ---------- */
const conPose = [...document.querySelectorAll('[data-pose]')];
let poseEl = null;

function ponerPose(el) {
  if (el === poseEl) return;
  poseEl = el;
  window.poseActual = { nombre: el.dataset.pose, ancla: el.dataset.ancla || null };
  window.llanta?.pose(window.poseActual);

  document.querySelectorAll('.tarjeta, .suc, .pin').forEach((n) => n.classList.remove('is-activa'));
  if (el.matches('.tarjeta, .suc')) el.classList.add('is-activa');
  if (el.dataset.ancla) document.querySelector(el.dataset.ancla)?.classList.add('is-activa');
  if (el.dataset.tel) document.getElementById('barraTel').href = telHref(el.dataset.tel);
  marcarMarca();
}

// En celular la llanta ocupa la mitad de arriba, así que la "franja" que
// decide la pose se mueve hacia abajo, donde pasa el contenido.
let observador = null;
function observarPoses() {
  observador?.disconnect();
  const franja = celular.matches ? '-64% 0px -30% 0px' : '-48% 0px -48% 0px';
  observador = new IntersectionObserver((entradas) => {
    entradas.filter((e) => e.isIntersecting).forEach((e) => ponerPose(e.target));
  }, { rootMargin: franja });
  conPose.forEach((el) => observador.observe(el));
}
observarPoses();
celular.addEventListener('change', observarPoses);

/* ---------- Riel de capítulos ---------- */
const rielLinks = [...document.querySelectorAll('.riel a')];
const capitulos = rielLinks.map((a) => document.getElementById(a.dataset.cap)).filter(Boolean);
const observadorRiel = new IntersectionObserver((entradas) => {
  entradas.filter((e) => e.isIntersecting).forEach((e) => {
    rielLinks.forEach((a) => {
      const activo = a.dataset.cap === e.target.id;
      a.classList.toggle('is-activo', activo);
      activo ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-50% 0px -50% 0px' });
capitulos.forEach((c) => observadorRiel.observe(c));

/* ---------- Marcas: el costado de la llanta muestra la marca según el scroll ---------- */
const seccionMarcas = document.getElementById('marcas');
const tilesMarca = [...document.querySelectorAll('#marcasGrid li')];
let marcaIdx = -1;

function marcarMarca() {
  if (poseEl?.dataset.pose !== 'marcas') {
    if (marcaIdx !== -1) { tilesMarca.forEach((t) => t.classList.remove('is-activa')); marcaIdx = -1; }
    return;
  }
  const r = seccionMarcas.getBoundingClientRect();
  const vh = window.innerHeight;
  const avance = Math.min(Math.max((vh * 0.5 - r.top) / Math.max(r.height - vh * 0.5, 1), 0), 0.999);
  const idx = Math.floor(avance * tilesMarca.length);
  if (idx === marcaIdx) return;
  marcaIdx = idx;
  tilesMarca.forEach((t, i) => t.classList.toggle('is-activa', i === idx));
  window.llanta?.marca(tilesMarca[idx].dataset.marca);
}

// Al pasar el mouse o tocar un logo, la llanta muestra esa marca.
tilesMarca.forEach((t, i) => {
  t.addEventListener('pointerenter', () => {
    if (poseEl?.dataset.pose !== 'marcas') return;
    marcaIdx = i;
    tilesMarca.forEach((x) => x.classList.toggle('is-activa', x === t));
    window.llanta?.marca(t.dataset.marca);
  });
});

/* ---------- Cuentas que suben ---------- */
const cuentas = [...document.querySelectorAll('[data-cuenta]')];
if (hayGsap && !quieto) {
  const obsCuenta = new IntersectionObserver((entradas, obs) => {
    entradas.filter((e) => e.isIntersecting).forEach((e) => {
      obs.unobserve(e.target);
      const fin = Number(e.target.dataset.cuenta);
      const n = { v: 0 };
      gsap.to(n, { v: fin, duration: 1.6, ease: 'power2.out', onUpdate: () => (e.target.textContent = Math.round(n.v)) });
    });
  }, { threshold: 0.6 });
  cuentas.forEach((c) => { c.textContent = '0'; obsCuenta.observe(c); });
}

/* ---------- Visor de promociones ---------- */
const visor = document.getElementById('visor');
const visorImg = document.getElementById('visorImg');
document.querySelectorAll('.promo__ver').forEach((btn) => {
  btn.addEventListener('click', () => {
    const img = btn.querySelector('img');
    visorImg.src = img.dataset.grande || img.src;
    visorImg.alt = img.alt;
    visor.showModal();
    lenis?.stop();
  });
});
visor.addEventListener('close', () => lenis?.start());
visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });

/* ---------- Servicios y sucursales ---------- */
document.querySelectorAll('[data-servicio]').forEach((a) => {
  a.addEventListener('click', () => { document.getElementById('f-servicio').value = a.dataset.servicio; });
});
document.querySelectorAll('.pin').forEach((pin) => {
  pin.addEventListener('click', () => irA('#' + pin.dataset.ir));
});

/* ---------- Formulario de cotización (dos pasos) ---------- */
const form = document.getElementById('formCotizar');
const error = document.getElementById('formError');
const pasos = [...form.querySelectorAll('.paso')];
const marcasPaso = [...form.querySelectorAll('.pasos li')];

const bAncho = document.getElementById('b-ancho');
const bPerfil = document.getElementById('b-perfil');
const bRin = document.getElementById('b-rin');
const bOtra = document.getElementById('b-otra');
const medidaOtra = document.getElementById('f-medida-otra');

const llenar = (sel, desde, hasta, paso, elegido) => {
  for (let v = desde; v <= hasta; v += paso) sel.add(new Option(v, v, false, v === elegido));
};
llenar(bAncho, 145, 335, 10, 205);
llenar(bPerfil, 25, 85, 5, 55);
llenar(bRin, 13, 24, 1, 16);

const medidaElegida = () => `${bAncho.value}/${bPerfil.value} R${bRin.value}`;
[bAncho, bPerfil, bRin].forEach((s) => s.addEventListener('change', () => window.llanta?.medida(medidaElegida())));
bOtra.addEventListener('change', () => {
  medidaOtra.hidden = !bOtra.checked;
  [bAncho, bPerfil, bRin].forEach((s) => (s.disabled = bOtra.checked));
  if (bOtra.checked) medidaOtra.focus();
});

function irPaso(n) {
  pasos.forEach((p) => (p.hidden = Number(p.dataset.paso) !== n));
  marcasPaso.forEach((m, i) => {
    const actual = i + 1 === n;
    m.classList.toggle('is-actual', actual);
    m.classList.toggle('is-hecho', i + 1 < n);
    actual ? m.setAttribute('aria-current', 'step') : m.removeAttribute('aria-current');
  });
  error.textContent = '';
}

function validar(contenedor) {
  const faltan = [];
  contenedor.querySelectorAll('[required]').forEach((campo) => {
    if (campo.type === 'radio') {
      if (!contenedor.querySelector(`[name="${campo.name}"]:checked`) && !faltan.includes('cómo nos conociste')) faltan.push('cómo nos conociste');
      return;
    }
    const ok = campo.value.trim() !== '' && campo.checkValidity();
    campo.setAttribute('aria-invalid', String(!ok));
    if (!ok) faltan.push(form.querySelector(`label[for="${campo.id}"]`).textContent.toLowerCase());
  });
  if (faltan.length) {
    error.textContent = 'Revisa estos campos: ' + faltan.join(', ') + '.';
    contenedor.querySelector('[aria-invalid="true"]')?.focus();
    return false;
  }
  error.textContent = '';
  return true;
}

document.getElementById('pasoSiguiente').addEventListener('click', () => {
  if (!validar(pasos[0])) return;
  irPaso(2);
  document.getElementById('f-nombre').focus();
});
document.getElementById('pasoAtras').addEventListener('click', () => {
  irPaso(1);
  document.getElementById('f-auto').focus();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Enter en el paso 1 equivale a "Continuar".
  if (pasos[1].hidden) { document.getElementById('pasoSiguiente').click(); return; }
  if (!validar(pasos[1])) return;

  const d = Object.fromEntries(new FormData(form));
  const suc = SUCURSALES[Number(d.sucursal)];
  const medida = bOtra.checked ? (medidaOtra.value.trim() || 'No la sé') : medidaElegida();
  const mensaje = [
    'Hola, quiero una cotización.',
    `Nombre: ${d.nombre}`,
    `Teléfono: ${d.telefono}`,
    `Correo: ${d.correo}`,
    `Auto: ${d.auto}`,
    `Medida de llanta: ${medida}`,
    `Servicio: ${d.servicio}`,
    `Sucursal: ${suc.nombre}`,
    `Nos conoció por: ${d.medio}`,
    d.mensaje ? `Comentario: ${d.mensaje}` : '',
  ].filter(Boolean).join('\n');

  if (CONFIG.whatsapp) {
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
    return;
  }

  // Sin WhatsApp configurado: se ofrece la llamada directa a la sucursal elegida.
  const ok = document.getElementById('formOk');
  document.getElementById('formOkTxt').textContent =
    `Llama a ${suc.nombre} al ${suc.tel} y menciona tu ${d.auto} con medida ${medida}. Te damos precio y disponibilidad al momento.`;
  document.getElementById('formOkTel').href = telHref(suc.tel);
  form.hidden = true;
  ok.hidden = false;
  ok.focus();
});

/* ---------- Al hacer scroll ---------- */
const barra = document.getElementById('barra');
const seccionInicio = document.getElementById('inicio');
let cotizarVisible = false;
new IntersectionObserver(([e]) => { cotizarVisible = e.isIntersecting; alHacerScroll(); }, { threshold: 0.15 })
  .observe(document.getElementById('cotizar'));

function alHacerScroll() {
  nav.classList.toggle('is-solid', window.scrollY > 40);
  barra.classList.toggle('is-visible', window.scrollY > seccionInicio.offsetHeight * 0.6 && !cotizarVisible);
  marcarMarca();
}
window.addEventListener('scroll', alHacerScroll, { passive: true });
alHacerScroll();
