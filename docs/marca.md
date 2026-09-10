# Colores corporativos

Esta es la guía para el equipo de digitalización. Explica dónde se cambian los
colores, qué se ve al cambiarlos y qué significa cada token.

## Los tres flujos, por orden de frecuencia

| Quiero… | Toco… | Lo veo… |
|---|---|---|
| Cambiar de tema | **Administración → Accesos → Tema del portal** | Al instante, y para todo el mundo |
| Cambiar un color del Portal BI | La lista **Marca LC** del sitio raíz: la fila de su tema, la columna de ese token | **F5 en la página. Sin despliegue.** El navegador guarda el último tema hasta 1 h, así que `Ctrl+F5` la primera vez |
| Crear un tema nuevo | **Nueva** en **Marca LC**: nombre en `Tema` y solo las celdas que cambien | Aparece en el desplegable de Administración |
| Cambiar el logo de la barra | Sube la imagen a SiteAssets del sitio raíz y pega su `url("…")` en la celda `logo`. Ver [Cambiar el logo](#cambiar-el-logo) | **Ctrl+F5. Sin despliegue.** |
| Que el cromo de SharePoint (cabecera, botones, enlaces) use esos colores | `scripts\pnp\4-Publicar-Marca.ps1 -Sitios https://…/sites/X` | Al recargar el sitio. Requiere rol de Administrador de SharePoint |
| Cambiar el color de arranque que viaja dentro del paquete | `src/ui/tokens.global.css` | **Requiere volver a empaquetar y subir el `.sppkg`.** Normalmente no hace falta: para eso está la lista |

La lista es el origen de verdad en caliente. `src/ui/tokens.global.css` y
`src/tema/tema.ts` son la semilla versionada: se usan si la lista no existe, si
no hay permiso de lectura o si una fila está en blanco.

## La lista "Marca LC"

Vive en el sitio raíz (`https://lolacasademunt.sharepoint.com`) porque todo el
mundo tiene lectura ahí.

**Una fila por tema, una columna por token:**

| Tema | Activo | primario | primario-texto | lienzo | … |
|---|---|---|---|---|---|
| Base | Sí | `#6f263d` | `#fff6ed` | `#fff6ed` | (los 31) |
| Multimarca | No | `#ba1c43` | | | |

- **Tema** (el `Title` de la lista): el nombre del tema
- **Activo**: cuál está puesto. Solo uno a la vez, y lo gestiona la aplicación
- **Una columna por token**: `primario`, `primario-texto`, `lienzo`… 35 en total
- **Nota**: para qué sirve el tema. Informativa, el portal no la lee

## Varios temas

`Base` lleva el juego completo. **Cualquier otro tema rellena solo las celdas que
cambian** y hereda el resto de `Base`; lo que `Base` no traiga sale de los
valores del paquete. Un tema de departamento puede ser una fila con una sola
celda rellena.

Crear un tema: **Nueva** en la lista, nombre en `Tema`, y rellenar lo que cambie.

**Qué tema está puesto se elige en la aplicación**, en *Administración → Accesos
→ Tema del portal*. Lo que se elija ahí lo ve todo el mundo: marca la casilla
`Activo` de esa fila y desmarca las demás.

Detalle técnico por si alguien mira los nombres internos: SharePoint no admite
guiones, así que la columna `primario-texto` se guarda internamente como
`primario_x002d_texto`. El portal lo decodifica al leer, de modo que el nombre
visible de la columna es exactamente el nombre del token. Si añades una columna
a mano, ponle como nombre el token tal cual (con guion) y SharePoint hará la
codificación sola.

Aviso de contraste: si un tema cambia `primario` conviene comprobar que
`primario-texto` sigue leyéndose encima. `4-Publicar-Marca.ps1` lo calcula y
avisa si baja de 4.5:1; también se puede pasar `-Tema Multimarca` para
comprobar uno concreto sin activarlo.

Se crea una vez con:

```powershell
cd scripts\pnp
.\4-Publicar-Marca.ps1 -CrearLista
```

Eso la siembra con los valores actuales, así que arranca mostrando exactamente
lo que ya se ve en pantalla.

**Cuando el paquete trae tokens nuevos**, la lista ya existe y `-CrearLista`
falla a propósito (y `-Recrear` la borraría, con lo que hubiera dentro). Para
eso está el tercer camino, que añade lo que falte y deja el tema `Base` como lo
trae el paquete, sin tocar los demás temas:

```powershell
.\5-Sincronizar-Marca.ps1 -Simular   # dice qué haría, no toca nada
.\5-Sincronizar-Marca.ps1
```

Es el paso que hay que dar tras cada despliegue que añada o cambie tokens. Si
se olvida, la lista sigue mandando y el portal se queda con los colores
anteriores aunque el paquete nuevo esté publicado.

Reglas:

- **Una celda `Valor` vacía significa "usa el valor del código"**, no "sin color".
- **Una fila con un token que no existe no hace nada**: se ignora en silencio.
- **Un valor con una forma rara se descarta** y se avisa por la consola del
  navegador. Los colores tienen que ser un hex, un `rgb()/rgba()/hsl()/hsla()` o
  un `var(--token)`; los radios y espacios, una longitud (`8px`, `0.5rem`, `90%`).
  Esto no es burocracia: el valor acaba dentro de una etiqueta `<style>`, así que
  se valida antes de escribirlo.
- La lista tiene versionado: se puede ver quién cambió qué y volver atrás.

## Cambiar el logo

El logo de la barra superior es un token más, `logo`, así que se cambia sin
tocar código y sin volver a desplegar el `.sppkg`. El paquete **no lleva ninguna
imagen dentro**: eso es lo que permite cambiarlo en caliente.

1. Sube la imagen a **SiteAssets del sitio raíz**
   (`https://lolacasademunt.sharepoint.com/SiteAssets/`), donde ya viven
   `logo-lola-rosa.svg` y los demás logos de marca. Ahí todo el mundo tiene
   lectura, que es lo que hace falta para que la vea cualquier empleado.
2. Copia su dirección y pégala en la celda `logo` de la fila del tema, **con la
   forma completa `url("…")`**:

   ```
   url("https://lolacasademunt.sharepoint.com/SiteAssets/logo-lola-monograma.png")
   ```

3. `Ctrl+F5` en el portal.

Reglas del valor, por si algo no sale:

- Solo se acepta `url("https://…")`. Un enlace suelto sin `url(...)`, `http://`
  sin la ese, o cualquier cosa con comillas, paréntesis o punto y coma dentro se
  descarta y se avisa por la consola del navegador. El valor acaba en un
  `background-image`, así que la forma se valida antes de escribirla.
- **Vacío o `none` significa "sin logo"**: la barra pinta el sello «LC» de texto.
  Es el valor de arranque, así que el portal nunca sale con un hueco roto.
- La columna admite 128 caracteres. Un nombre de archivo corto deja margen de
  sobra; si te quedas sin sitio, acorta el nombre de la imagen.
- El alto en pantalla es fijo (40 px) y el ancho se ajusta solo hasta 132 px, sin
  deformar. Sirve cualquier proporción.
- Un PNG **no sigue a los colores del tema**. Si algún día hay un tema de fondo
  oscuro, un logo de tinta negra deja de verse: para eso conviene un SVG
  monocromo, que hereda el color.

En `docs/logo-lola-monograma.png` está el monograma LC con el guepardo ya
preparado para subir: recortado, con el fondo en transparente y a 720 px de
ancho.

## Los tokens que se pueden cambiar

| Token | Para qué sirve | Al cambiarlo, cambia también… |
|---|---|---|
| `primario` | Color de marca: héroe, botones principales, enlaces, foco, filas de total | El hover, los totales de tabla y el chip morado, que se recalculan solos |
| `primario-texto` | Texto y bordes **sobre** el color de marca | **Comprueba el contraste**: el script avisa si baja de 4.5:1 |
| `primario-suave` | Relleno rosa de la banda y las tarjetas de la portada. Es el tono 90 del burdeos según Material 3 | El color del texto que va encima, que se recalcula solo |
| `acento` | Color de apoyo de la marca (hoy el rosa). Disponible para áreas | |
| `lila`, `azul` | Resto de la paleta de marca. Sin uso hoy | |
| `logo` | Logo de la barra superior. Ver [Cambiar el logo](#cambiar-el-logo) | Con la celda vacía o en `none` sale el sello «LC» de texto |
| `positivo` | Verde de "tienes acceso" y de estado "activo" | El fondo y el borde del chip verde |
| `negativo` | Rojo de error y de acciones destructivas | |
| `alerta` | Coral de aviso fuerte | |
| `aviso-texto` | Ámbar del estado "en pruebas" | El fondo y el borde del chip ámbar |
| `lienzo` | Fondo general del portal | |
| `papel` | Fondo de zonas hundidas y de los chips neutros | |
| `tarjeta` | Fondo de tarjetas, tablas y modales | El tinte de todos los chips, que se mezclan sobre este |
| `borde-tarjeta` | Borde de tarjeta | |
| `divisor` | Línea fina | |
| `divisor-fuerte` | Línea fina con más presencia: bordes de chip, cabeceras | |
| `fila-alterna` | Fondo de la cabecera de las tablas y de las tarjetas hundidas | |
| `texto` | Texto principal | El velo oscuro de los modales |
| `texto-secundario` | Texto de apoyo | |
| `texto-terciario` | Texto de metadatos y etiquetas | |
| `fuente` | Pila de tipografías | |
| `radio-tarjeta`, `radio-boton`, `radio-chip` | Redondeo de las pantallas de trabajo, en px | |
| `radio-expresivo`, `radio-pildora` | Redondeo de la portada: 28 px las tarjetas, 999 px las píldoras. **Son de la portada y solo de la portada**: llevarlos a una tabla es lo que hace que una pantalla de trabajo parezca un juguete | |
| `espacio-1` … `espacio-7` | Escala de espaciado, en px | |
| `ancho-maximo` | Ancho máximo del contenido | |

## Los tokens derivados: no se pueden editar

No hace falta y es a propósito. Se calculan con `color-mix()` en
`src/ui/tokens.global.css` a partir de los de arriba, así que siguen a la marca solos.

| Token derivado | Se calcula desde |
|---|---|
| `primario-hover` | `primario`, un 17 % más oscuro |
| `velo-modal`, `sombra-modal` | `texto`, al 38 % y al 28 % |
| `sobre-primario-fuerte` / `-medio` / `-suave` / `-borde` / `-divisor` / `-velo` | `primario-texto`, al 85 / 72 / 64 / 45 / 28 / 12 %. Van **sobre el burdeos macizo**, así que son claros |
| `texto-sobre-suave` | `primario` mezclado con `texto`. Va **sobre `primario-suave`**, así que es oscuro. Ojo con confundirlo con los de arriba |
| `fila-total`, `borde-total` | `primario` sobre `tarjeta`, al 7 % y al 18 % |
| `positivo-fondo`, `positivo-borde` | `positivo` sobre `tarjeta`, al 6 % y al 22 % |
| `aviso-fondo`, `aviso-borde` | `aviso-texto` sobre `tarjeta`, al 8 % y al 22 % |

Es decir: cambiar `primario` a un azul corporativo mueve con él el hover de los
botones, el velo de los modales, las filas de total y el tinte de los chips. No
hay que buscar 14 sitios más.

## El color de cada departamento

Va por otro canal, editable desde la propia aplicación: **Administración →
Accesos**, o directamente en la lista `Departamentos BI` (columnas `Color` y
`ColorTexto`).

Ahí lo recomendable es escribir un token, no un hex: `var(--acento)` en vez de
`#dfa0c9`. Así ese departamento sigue a la marca cuando cambie. Un hex literal
también funciona, pero se queda fijo.

Como en la otra lista, una celda vacía significa "usa el valor de
`src/config/departamentos.config.ts`".

## Replicarlo al resto de SharePoint

`4-Publicar-Marca.ps1` lee la misma lista, deriva los 16 slots de color que
espera SharePoint (los tonos del color primario más una rampa de neutros mezclada
hacia el texto, para que los grises salgan cálidos y no azulados de fábrica) y
publica un tema de tenant llamado *Lola Casademunt*.

```powershell
cd scripts\pnp
.\4-Publicar-Marca.ps1 -SoloMostrar                          # ver la paleta sin aplicar
.\4-Publicar-Marca.ps1                                       # publicar el tema
.\4-Publicar-Marca.ps1 -Sitios https://…/sites/PortalBI https://…/sites/Operaciones
```

Publicar el tema **no lo aplica**: aparece en "Cambiar el aspecto" de cada sitio
y se aplica con `-Sitios` o a mano desde el propio sitio.

El script avisa si el contraste de `primario-texto` sobre `primario` baja del
mínimo de accesibilidad. Ese aviso conviene tomárselo en serio.

## Cómo está montado (para quien toque el código)

- `src/tema/tema.ts` — la lista de tokens editables, sus valores por defecto, el
  saneado y el merge de capas. Sin DOM, así que se puede probar en node.
- `src/tema/aplicarTema.ts` — todo el DOM: una sola etiqueta `<style>` que se
  reemplaza, con las variables sobre `.portalBiRaiz` y `.portalBiTokens`.
- `src/tema/useTema.ts` — aplica el tema en el arranque desde la caché de
  `localStorage` (sin parpadeo a partir de la segunda visita) y otra vez cuando
  llega la lista.
- `src/data/sharepoint/MarcaRepository.ts` — la lectura de la lista.
- `src/ui/tokens.global.css` — los valores de arranque y los derivados.
- `src/tema/tema.test.ts` — falla si `tokens.global.css` y `tema.ts` se desincronizan,
  si algún CSS escribe un color a mano o usa un token que no existe, y si el
  saneado deja pasar una inyección de CSS.

Las variables van sobre una clase y no sobre `:root` para que el portal se pueda
montar dentro de cualquier página de SharePoint sin contaminarla. Por eso, si
alguna vez se añade un `createPortal(..., document.body)`, ese subárbol tiene que
llevar la clase `portalBiTokens` o se queda sin colores.
