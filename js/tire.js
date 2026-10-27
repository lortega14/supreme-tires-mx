/* Llanta guía: una sola llanta 3D fija detrás de toda la página. Cada capítulo
   le pide una "pose" (posición, vista y efectos) y la llanta llega rodando:
   el giro siempre corresponde a la distancia que recorre en pantalla.
   API para main.js: window.llanta.pose({ nombre, ancla }), .medida(txt), .marca(nombre). */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('escena');
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esCelular = () => window.matchMedia('(max-width: 820px)').matches;

const NARANJA = 0xF7A13C;
const AZUL = 0x0C09A3;

// x, y: centro en pantalla (-1 a 1). size: diámetro como fracción del lado corto.
// ry/rx: vista. explode: rin separado. glow: caliper encendido.
// resorte: suspensión visible. nitro: partículas de nitrógeno. vaiven: alineación.
const BASE = { x: 0, y: 0, size: 0.7, ry: -0.5, rx: 0.12, explode: 0, glow: 0, resorte: 0, nitro: 0, vaiven: 0 };
const POSES = {
  inicio:     { d: { x: 0.38, y: -0.02, size: 0.78, ry: -0.62 },                       m: { x: 0.12, y: -0.5, size: 0.95, ry: -0.55 } },
  promos:     { d: { x: 0.86, y: -0.72, size: 0.42, ry: -0.9 },                       m: { x: 0.82, y: -0.9, size: 0.55, ry: -0.9 } },
  general:    { d: { x: -0.45, y: 0, size: 0.82, ry: -0.4 },                          m: { x: 0, y: 0.45, size: 0.85, ry: -0.4 } },
  alineacion: { d: { x: -0.45, y: 0, size: 0.82, ry: -0.06, rx: 0.04, vaiven: 1 },    m: { x: 0, y: 0.45, size: 0.85, ry: -0.06, vaiven: 1 } },
  frenos:     { d: { x: -0.3, y: 0, size: 0.62, ry: -0.85, explode: 1, glow: 1 },     m: { x: 0.08, y: 0.45, size: 0.6, ry: -0.85, explode: 1, glow: 1 } },
  suspension: { d: { x: -0.45, y: -0.3, size: 0.58, ry: -0.5, resorte: 1 },          m: { x: 0, y: 0.3, size: 0.55, ry: -0.5, resorte: 1 } },
  nitro:      { d: { x: -0.45, y: 0, size: 0.78, ry: -0.3, nitro: 1 },                m: { x: 0, y: 0.45, size: 0.8, ry: -0.3, nitro: 1 } },
  marcas:     { d: { x: 0.45, y: 0.02, size: 0.88, ry: -0.1, rx: 0.05 },              m: { x: 0, y: 0.48, size: 0.9, ry: -0.12 } },
  nosotros:   { d: { x: -1.8, y: -0.55, size: 0.5 },                                   m: { x: -2, y: -0.6, size: 0.6 } },
  sucursal:   { d: { size: 0.12, ry: -0.25, rx: 0.2 },                                 m: { size: 0.17, ry: -0.25, rx: 0.2 } },
  cotiza:     { d: { x: 0.52, y: 0, size: 0.72, ry: -0.3 },                            m: { x: 2, y: 0.3, size: 0.6 } },
  fin:        { d: { x: -2, y: 0, size: 0.5 },                                         m: { x: -2, y: 0, size: 0.5 } },
};

function iniciar() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return;
  }
  // Resolución: tope más bajo en celular; baja sola si el equipo no alcanza 60 cuadros.
  let resolucion = Math.min(window.devicePixelRatio, esCelular() ? 1.25 : 1.5);
  renderer.setPixelRatio(resolucion);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0x9fa8ff, 0x03022e, 0.6));
  const clave = new THREE.DirectionalLight(0xffffff, 1.6);
  clave.position.set(3, 4, 6);
  scene.add(clave);
  const contraluz = new THREE.DirectionalLight(NARANJA, 4);
  contraluz.position.set(-5, 2.5, -3);
  scene.add(contraluz);

  // raiz (pantalla) > inclinacion (vista) > eje (eje hacia la cámara) > giro (rueda)
  const raiz = new THREE.Group();
  const inclinacion = new THREE.Group();
  const eje = new THREE.Group();
  const giro = new THREE.Group();
  eje.rotation.x = Math.PI / 2;
  raiz.add(inclinacion);
  inclinacion.add(eje);
  eje.add(giro);
  scene.add(raiz);

  // En el despiece, la llanta se va hacia atrás y el rin hacia adelante.
  const llantaGrupo = new THREE.Group();
  const rinGrupo = new THREE.Group();
  giro.add(llantaGrupo, rinGrupo);

  /* --- Neumático --- */
  const hule = new THREE.MeshStandardMaterial({ color: 0x17181f, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  const perfil = [];
  const centro = 0.83, alto = 0.17, ancho = 0.36, n = 4;
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    perfil.push(new THREE.Vector2(
      centro + alto * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
      ancho * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
    ));
  }
  llantaGrupo.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 160), hule));

  const porFila = 54;
  const rodadura = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.2, 0.1), hule, porFila * 2);
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  let k = 0;
  for (const fila of [{ y: 0.13, inclina: 0.45, desfase: 0 }, { y: -0.13, inclina: -0.45, desfase: 0.5 }]) {
    for (let i = 0; i < porFila; i++) {
      const th = ((i + fila.desfase) / porFila) * Math.PI * 2;
      dummy.position.set(Math.cos(th), fila.y, Math.sin(th));
      dummy.rotation.set(fila.inclina, -th, 0);
      dummy.updateMatrix();
      rodadura.setMatrixAt(k++, dummy.matrix);
    }
  }
  llantaGrupo.add(rodadura);

  /* --- Costado con texto --- */
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 1024;
  const texto = new THREE.CanvasTexture(lienzo);
  texto.colorSpace = THREE.SRGBColorSpace;
  texto.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(0.73, 0.93, 128),
    new THREE.MeshStandardMaterial({ map: texto, transparent: true, roughness: 0.6, depthWrite: false }),
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.363;
  llantaGrupo.add(anillo);

  let medida = '205/55 R16';
  let marca = null;
  function dibujarCostado() {
    const ctx = lienzo.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.translate(512, 512);
    const radio = (0.83 / 0.93) * 512;
    const tramos = marca
      ? [
          { txt: marca, color: '#ffffff' },
          { txt: 'SUPREME TIRES MX', color: '#F7A13C' },
          { txt: marca, color: '#ffffff' },
          { txt: medida, color: 'rgba(255,255,255,.7)' },
        ]
      : [
          { txt: 'SUPREME TIRES MX', color: '#ffffff' },
          { txt: '#SUPREMACÍA EN LLANTAS', color: '#F7A13C' },
          { txt: 'SUPREME TIRES MX', color: '#ffffff' },
          { txt: medida, color: 'rgba(255,255,255,.7)' },
        ];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const espacio = 0.018;
    const fuente = (t) => `900 ${t}px "Big Shoulders Display", "Arial Narrow", sans-serif`;
    const arco = () => tramos.reduce((t, tr) => t + [...tr.txt].reduce((a, l) => a + ctx.measureText(l).width / radio + espacio, 0), 0);
    let tam = 58;
    ctx.font = fuente(tam);
    while (arco() > Math.PI * 2 - tramos.length * 0.12 && tam > 30) ctx.font = fuente((tam -= 2));
    const hueco = (Math.PI * 2 - arco()) / tramos.length;
    let angulo = -Math.PI / 2;
    for (const tramo of tramos) {
      ctx.fillStyle = tramo.color;
      for (const letra of tramo.txt) {
        const w = ctx.measureText(letra).width / radio + espacio;
        ctx.save();
        ctx.rotate(angulo + w / 2);
        ctx.translate(0, -radio);
        ctx.fillText(letra, 0, 0);
        ctx.restore();
        angulo += w;
      }
      angulo += hueco;
    }
    texto.needsUpdate = true;
  }
  dibujarCostado();
  document.fonts?.load('900 58px "Big Shoulders Display"').then(dibujarCostado);

  /* --- Rin --- */
  const metal = new THREE.MeshStandardMaterial({ color: 0xd4d7e2, metalness: 1, roughness: 0.22 });
  const metalOscuro = new THREE.MeshStandardMaterial({ color: 0x2a2c3a, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide });

  rinGrupo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.665, 0.665, 0.6, 72, 1, true), metalOscuro));
  const ceja = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.022, 12, 96), metal);
  ceja.rotation.x = Math.PI / 2;
  ceja.position.y = 0.29;
  rinGrupo.add(ceja);

  const cara = new THREE.Shape();
  cara.absarc(0, 0, 0.645, 0, Math.PI * 2, false);
  for (let i = 0; i < 5; i++) {
    const medio = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const ro = 0.57, ri = 0.2;
    const ventana = new THREE.Path();
    ventana.moveTo(Math.cos(medio - 0.47) * ro, Math.sin(medio - 0.47) * ro);
    ventana.absarc(0, 0, ro, medio - 0.47, medio + 0.47, false);
    ventana.lineTo(Math.cos(medio + 0.3) * ri, Math.sin(medio + 0.3) * ri);
    ventana.absarc(0, 0, ri, medio + 0.3, medio - 0.3, true);
    ventana.closePath();
    cara.holes.push(ventana);
  }
  const rayos = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cara, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.014, bevelSegments: 3, curveSegments: 40 }),
    metal,
  );
  rayos.rotation.x = -Math.PI / 2;
  rayos.position.y = 0.2;
  rinGrupo.add(rayos);

  const tapon = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.07, 48), new THREE.MeshStandardMaterial({ color: AZUL, metalness: 0.6, roughness: 0.3 }));
  tapon.position.y = 0.29;
  rinGrupo.add(tapon);
  const birlo = new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const b = new THREE.Mesh(birlo, metal);
    b.position.set(Math.cos(a) * 0.205, 0.27, Math.sin(a) * 0.205);
    rinGrupo.add(b);
  }

  // El disco gira con la rueda y se queda en su lugar durante el despiece.
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 72), new THREE.MeshStandardMaterial({ color: 0x8a8d99, metalness: 0.85, roughness: 0.45 }));
  disco.position.y = 0.04;
  giro.add(disco);

  // El caliper no gira y se enciende en el capítulo de frenos.
  const caliperMat = new THREE.MeshStandardMaterial({ color: NARANJA, metalness: 0.2, roughness: 0.35, emissive: NARANJA, emissiveIntensity: 0 });
  const caliper = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 14, 32, 1.0), caliperMat);
  caliper.rotation.set(-Math.PI / 2, 0, 0.35);
  caliper.position.y = 0.09;
  eje.add(caliper);

  /* --- Suspensión: resorte + amortiguador detrás de la rueda --- */
  class Helice extends THREE.Curve {
    getPoint(t, destino = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * 7;
      return destino.set(Math.cos(a) * 0.22, t * 1.25, Math.sin(a) * 0.22);
    }
  }
  const suspension = new THREE.Group();
  suspension.position.set(0, 0.15, -0.55);
  const resorte = new THREE.Mesh(new THREE.TubeGeometry(new Helice(), 420, 0.03, 8, false), new THREE.MeshStandardMaterial({ color: NARANJA, metalness: 0.5, roughness: 0.3 }));
  resorte.position.y = 0.12;
  const vastago = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.5, 24), metalOscuro);
  vastago.position.y = 0.75;
  const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), metal);
  plato.position.y = 1.5;
  suspension.add(resorte, vastago, plato);
  suspension.visible = false;
  inclinacion.add(suspension);

  /* --- Nitrógeno: nube de partículas alrededor de la llanta --- */
  const cuantos = 320;
  const pos = new Float32Array(cuantos * 3);
  for (let i = 0; i < cuantos; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.12 + Math.random() * 0.45;
    pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.6, Math.sin(a) * r], i * 3);
  }
  const nubeGeo = new THREE.BufferGeometry();
  nubeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const nubeMat = new THREE.PointsMaterial({ color: 0x8fc1ff, size: 0.045, transparent: true, opacity: 0, depthWrite: false });
  const nube = new THREE.Points(nubeGeo, nubeMat);
  eje.add(nube);

  /* --- Poses --- */
  const actual = { ...BASE, x: 2.1, y: -0.02, size: 0.8, ry: -0.62 }; // empieza fuera, a la derecha
  let meta = { ...BASE };
  let anclaEl = null;
  let poseNombre = null;

  function pose(p) {
    if (!p || !POSES[p.nombre]) return;
    poseNombre = p.nombre;
    meta = { ...BASE, ...POSES[p.nombre][esCelular() ? 'm' : 'd'] };
    anclaEl = p.ancla ? document.querySelector(p.ancla) : null;
    if (p.nombre !== 'marcas' && marca) { marca = null; dibujarCostado(); }
  }

  window.llanta = {
    pose,
    medida(txt) { medida = txt; dibujarCostado(); },
    marca(nombre) { if (nombre !== marca) { marca = nombre; dibujarCostado(); } },
  };
  pose(window.poseActual || { nombre: 'inicio' });

  /* --- Tamaño --- */
  const vista = { w: 1, h: 1 };
  function acomodar() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    vista.h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    vista.w = vista.h * camera.aspect;
    if (poseNombre) pose({ nombre: poseNombre, ancla: anclaEl ? '#' + anclaEl.id : null });
  }
  window.addEventListener('resize', acomodar);
  acomodar();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let angulo = 0;
  let previoX = null;
  const reloj = new THREE.Clock();

  let cuadros = 0, acumulado = 0, limpio = false;

  renderer.setAnimationLoop(() => {
    const dtReal = reloj.getDelta();
    const dt = Math.min(dtReal, 0.05);

    // Si los cuadros tardan de más, bajar la resolución un paso.
    cuadros++; acumulado += dtReal;
    if (cuadros === 90) {
      if (acumulado / cuadros > 0.024 && resolucion > 0.85) {
        resolucion = Math.max(resolucion - 0.25, 0.75);
        renderer.setPixelRatio(resolucion);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      }
      cuadros = 0; acumulado = 0;
    }
    const t = quieto ? 0 : reloj.elapsedTime;

    if (anclaEl) {
      const r = anclaEl.getBoundingClientRect();
      meta.x = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      meta.y = -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1);
    }

    const suave = quieto ? 1 : 1 - Math.exp(-dt * 3.2);
    for (const clave in BASE) actual[clave] += (meta[clave] - actual[clave]) * suave;

    // En celular la llanta usa la mitad de arriba (o de abajo) de la pantalla.
    const lado = esCelular() ? Math.min(vista.w, vista.h * 0.5) : Math.min(vista.w, vista.h);
    const escala = Math.max((actual.size * lado) / 2, 0.01);
    const x = (actual.x * vista.w) / 2;
    const y = (actual.y * vista.h) / 2;

    // Rodar: lo que avanza en x se convierte en giro. Más un giro lento de reposo.
    if (previoX !== null) angulo -= (x - previoX) / escala;
    previoX = x;
    if (!quieto) angulo += dt * 0.3 * (1 - actual.explode * 0.7);

    raiz.position.set(x, y, 0);
    raiz.scale.setScalar(escala);
    giro.rotation.y = angulo;

    mouse.tx += (mouse.y * 0.12 - mouse.tx) * 0.05;
    mouse.ty += (mouse.x * 0.22 - mouse.ty) * 0.05;
    inclinacion.rotation.set(
      actual.rx + (quieto ? 0 : mouse.tx),
      actual.ry + (quieto ? 0 : mouse.ty),
      -0.04 + actual.vaiven * 0.14 * Math.sin(t * 2.2),
    );

    llantaGrupo.position.y = -actual.explode * 0.55;
    rinGrupo.position.y = actual.explode * 0.8;
    caliperMat.emissiveIntensity = actual.glow * (0.9 + 0.3 * Math.sin(t * 4));

    suspension.visible = actual.resorte > 0.02;
    suspension.scale.setScalar(Math.max(actual.resorte, 0.001));
    resorte.scale.y = 1 - 0.14 * (0.5 + 0.5 * Math.sin(t * 3)) * actual.resorte;

    nubeMat.opacity = actual.nitro * 0.85;
    nube.rotation.y += dt * 0.5;
    llantaGrupo.scale.setScalar(1 + 0.025 * actual.nitro * Math.sin(t * 2.4));

    // Fuera de pantalla y ya quieta: un último cuadro vacío y dejar de dibujar.
    const fuera = Math.abs(actual.x) > 1.6 && Math.abs(meta.x - actual.x) < 0.01;
    if (fuera && limpio) return;
    limpio = fuera;
    renderer.render(scene, camera);
  });
}

iniciar();
