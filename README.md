# Supreme Tires MX — sitio estático

Propuesta de rediseño de supremetiresmx.com en HTML, CSS y JS, listo para GitHub Pages.

- `index.html`: todo el contenido (promos, servicios, marcas, nosotros, sucursales, cotización, redes).
- `css/styles.css`: estilos y colores de la marca.
- `js/main.js`: scroll suave, menú, servicios, cinta de marcas, sucursales y formulario.
- `js/tire.js`: la llanta 3D que acompaña toda la página (Three.js). Cada capítulo le pide una pose: despiece de frenos, resorte de suspensión, nitrógeno, marcas en el costado y recorrido por el mapa de sucursales.
- `version-anterior/`: la propuesta previa, para comparar (http://localhost:5173/version-anterior/).

## Verlo en la computadora

```bash
python -m http.server 5173
```

y abrir http://localhost:5173. Abrir el `index.html` con doble clic no funciona, porque la llanta 3D necesita un servidor.

## Pendiente antes de publicar

1. **WhatsApp:** poner el número en `CONFIG.whatsapp`, al inicio de `js/main.js`, para que el formulario mande la cotización por WhatsApp. Mientras esté vacío, el formulario invita a llamar a la sucursal.
2. **Imágenes:** hoy se cargan desde supremetiresmx.com. Antes de apagar WordPress hay que copiarlas a una carpeta `img/` y cambiar las rutas.
3. **Aviso de privacidad:** el enlace apunta a la página actual de WordPress. Hay que pasarlo a una página propia.

## Publicar en GitHub Pages

1. Subir esta carpeta a un repositorio de GitHub.
2. En el repositorio, ir a Settings → Pages → Deploy from a branch → `main` / root.
3. Para usar supremetiresmx.com, agregar el dominio en esa misma pantalla y apuntar los DNS del dominio a GitHub Pages.
