# Portal BI · Lola Casademunt

Portal de administración y consulta de los paneles de Power BI de la casa,
organizado por departamento. En local los datos salen de un Excel; en la
intranet, de la lista `Paneles PowerBi LolaCasademunt` del sitio
`/sites/PortalBI`, sin tocar un solo componente.

```bash
npm install
npm run dev        # http://localhost:5173 · sin credenciales, sin red
npm run build      # tsc -b && vite build
npm test           # pruebas de dominio y del sistema de tema
npm run typecheck
```

Para el sitio, las listas y el despliegue: **[docs/despliegue.md](docs/despliegue.md)**
y los scripts de **[scripts/pnp/](scripts/pnp/)**. Para los colores
corporativos: **[docs/marca.md](docs/marca.md)**.

## Cómo está montado

```
/src            interfaz, dominio y capa de datos (código compartido)
  /app          raiz <PortalBI />, rutas y configuración del portal
  /components   piezas usadas por varias pantallas
  /config       departamentos, áreas de trabajo y tenant
  /data         repositorios e identidad: interfaz + implementación local + SharePoint
  /domain       tipos, parseo de URLs, orden, agrupación e higiene de datos
  /hooks        estado de servidor, acceso por equipo y «mis paneles»
  /layout       barra superior y armazón de página
  /pages        Portada · Departamento · Panel · Administración · Accesos · Buscador
  /tema         tokens editables, saneado y aplicación del tema
  /ui           primitivos y tokens del sistema visual
/spfx           web part de SPFx + botón global, montan <PortalBI /> con datos de SharePoint
/scripts/pnp    aprovisionamiento del sitio, las listas, el despliegue y la marca
/docs           despliegue.md · marca.md
```

### Las dos fases, una sola interfaz

Toda la aplicación habla con estas tres interfaces y con nada más:

```ts
// src/data/PanelRepository.ts
getPaneles() · getDepartamentos() · createPanel() · updatePanel() · deletePanel()
// src/data/DepartamentoRepository.ts
getAjustes() · guardarAjustes()
// src/data/identidad/ProveedorIdentidad.ts
getUsuarioActual() · buscarGrupos() · getMiembros()
```

El arranque decide qué implementación entra (`ServiciosPortal`); ningún
componente pregunta nunca dónde está corriendo.

| | Fase 1 (hoy) | Fase 2 (intranet) |
|---|---|---|
| Implementación | `ExcelPanelRepository` | `SharePointPanelRepository` |
| Origen | `src/data/paneles.xlsx` (+ `paneles.json` de respaldo) | Lista de SharePoint vía PnPjs v4 |
| Escritura | memoria + `localStorage` + «Exportar a Excel» | elementos de la lista |
| Autenticación | ninguna | contexto de SPFx (`spfi().using(SPFx(context))`) |
| Quién la elige | `src/main.tsx` | `spfx/src/webparts/portalBi/PortalBiWebPart.ts` |

Cambiar de origen es cambiar la línea que construye el repositorio. `.env`
(`VITE_DATA_SOURCE`) permite forzarlo en local.

## Los datos de hoy

Nueve filas, tres departamentos, **cinco informes**: las nueve entradas no son
nueve informes, son páginas. `Retail-Online` son tres páginas de un mismo
informe, y `Multimarca` tres páginas de otro. El modelo guarda `reportId` y
`pageName` por separado, y la ficha de área agrupa las páginas bajo su informe.

| Departamento | Paneles | Informes |
|---|---|---|
| Multimarca | 4 | 2 |
| Retail-Online | 3 | 1 |
| Logistica | 2 | 2 |

Dos cosas que el portal asume porque los datos son así:

- **`Area de Trabajo` está sucia.** Los valores son «Integrantes de la
  Operaciones» y «Luis Díaz»: un grupo y una persona, no áreas de trabajo de
  Power BI. Se trata como texto informativo, nunca como clave, y administración
  lo marca como dato a limpiar.
- **No se conoce el `workspaceId`.** No afecta al enlace normal, que usa la URL
  de la lista; solo al secundario «Abrir en Power BI», que mientras tanto pasa
  por el resolutor. Se arregla rellenando el `WorkspaceId` de cada área en
  Administración → Accesos (un departamento, un área de trabajo).

## Qué abre cada enlace

Hay dos formas de abrir un panel y el portal usa las dos, a propósito:

| Dónde | URL | Qué se ve |
|---|---|---|
| Tarjetas, tablas, buscador, portada | `Url Panel` de la lista, tal cual (`reportEmbed…autoAuth=true`) | La página sola, limpia, sin el cromo de Power BI |
| «Abrir en Power BI» de la vista de panel y de `/admin` | derivada (ver abajo) | El informe dentro del servicio, con filtros, exportar y suscribirse |
| `<iframe>` de `#/panel/:id` | `Url Panel` | Igual que la primera, incrustada |

El encargo original pedía que ninguna tarjeta ni tabla enlazara a una URL de
incrustación. **Se cambió a posta** después de comprobar en el navegador que esa
URL abre perfectamente como página independiente: como el portal ya lista cada
página por separado, no hace falta el panel de páginas del servicio, y así el
enlace lleva exactamente a lo que el usuario ha pedido, sin ruido alrededor.
El enlace al portal completo sigue a un clic de distancia.

El enlace derivado (`urlDirectaEfectiva`) sale así:

- con `workspaceId`: `app.powerbi.com/groups/{ws}/reports/{reportId}/{pageName}?ctid=…`
- sin él: `app.powerbi.com/Redirect?action=OpenReport&reportObjectId=…&ctid=…&reportPage=…`,
  el resolutor de Power BI, que busca el informe por su id y redirige.

Lo que **no** existe y da error es `app.powerbi.com/reports/{reportId}/{pageName}`.
No lo pongas en `UrlDirecta`.

## Pantallas

- **Portada** (`#/`): héroe burdeos con cifras y buscador, franja de estado de
  los datos, tarjeta destacada, novedad, rejilla de departamentos y columna con
  «Mis paneles», novedades y accesos directos.
- **Departamento** (`#/departamento/:slug`): ficha del área y tabla de informes
  con las páginas agrupadas bajo su informe.
- **Panel** (`#/panel/:id`): un solo informe incrustado, a pantalla casi
  completa.
- **Administración** (`#/admin`): todos los paneles en cualquier estado, con
  filtros, edición en línea, alta y edición en modal con validación, reordenar,
  duplicar, retirar (borrado lógico) e importar/exportar Excel. `#/admin?nuevo=1`
  abre directamente el formulario de alta.
- **Buscador global**: `Ctrl/Cmd + K` en cualquier pantalla.

## Permisos: un departamento, un área de trabajo, un equipo de Teams

Los tres son la misma cosa vista desde tres sitios:

```
Departamento "Multimarca"
   ├─ área de trabajo de Power BI   (workspaceId)
   └─ equipo de Teams / grupo M365  (objectId)  ← decide quién lo ve
```

**Quien no está en el equipo no ve el área.** Ni atenuada, ni con un botón de
pedir acceso: no aparece. Las cifras de la portada, el buscador, la ruta
`#/departamento/…` y la vista de panel se comportan como si no existiera. Un
panel puede además llevar su propio `GrupoAcceso` para restringirlo a un grupo
más estrecho que el del área.

Un área **sin equipo asignado la ve todo el mundo**: no hay nada que aplicar
todavía, y esconderla haría parecer que el portal está roto. Administración lo
avisa en rojo.

Esto es filtrado de interfaz. **El permiso de verdad lo aplica Power BI** al
abrir el informe.

### De dónde sale la identidad

| | Fase 1 (local) | Fase 2 (intranet) |
|---|---|---|
| Implementación | `IdentidadSimulada` | `IdentidadSharePoint` |
| Usuario | selector «Ver como» en la barra | `context.pageContext.user` |
| Equipos | cuatro de mentira | `/me/memberOf` vía Microsoft Graph |
| Administración | el usuario de prueba marcado como tal | pertenencia a `BI-Administradores` |

La interfaz común es `ProveedorIdentidad` (`getUsuarioActual`, `buscarGrupos`,
`getMiembros`). Fase 1 no hace ni una llamada de red.

### Administración → Áreas y accesos

`#/admin/accesos` ata cada departamento con su equipo de Teams y su área de
trabajo de Power BI, y enseña quién está dentro de cada equipo. Los cambios se
guardan en `localStorage` en fase 1 y en la lista `Departamentos BI` en fase 2.

Hoy el emparejamiento con el equipo se hace **por nombre** (`BI-RetailOnline`),
que funciona pero se rompe si alguien renombra el equipo. Al elegir un equipo
real se guarda su `objectId` y deja de depender del nombre.

La pantalla **lee** la pertenencia; no añade ni quita gente de los equipos. Eso
se hace en Teams. Si se quisiera hacer desde aquí haría falta el permiso
`Group.ReadWrite.All`, que es bastante más gordo.

## Sistema visual

Roboto Flex en todo, lienzo rosado `#fff8f7` y superficies derivadas del
burdeos, cifras tabulares. Los primitivos (`Card`, `Badge`, `Button`, `Table`,
`SectionLabel`, `AreaAvatar`, campos y `Modal`) están en `src/ui/`. Sin
Tailwind, sin librerías de componentes con estilo propio, sin degradados y sin
azul de SharePoint.

**Dos registros de forma, y no se mezclan.** La portada invita a entrar:
tarjetas de 28 px de radio rellenas con el tono del departamento, píldoras de
999 px, titular de 57 px, un círculo de flecha por tarjeta. Las pantallas de
administración se dejan trabajar: rectángulos de 8 px, controles de 36 px, un
solo botón relleno por pantalla, tablas con cabecera gris y filas separadas por
un filete. Lo que las une es la tipografía, el fondo, el burdeos y la barra
superior, que es idéntica en las dos. Llevar las píldoras y los radios grandes a
una tabla es exactamente lo que hace que una pantalla de trabajo parezca un
juguete; los tokens `radio-expresivo` y `radio-pildora` existen para la portada
y solo para ella.

Ningún componente escribe un color a mano: todos salen de los tokens de
`src/ui/tokens.global.css`, y hay un test que falla si alguien mete un hex en un CSS de
módulo. Los colores corporativos se cambian **sin recompilar**, desde una lista
de SharePoint; el hover, los velos y los tintes de los chips se derivan del color
de marca con `color-mix()`, así que siguen al cambio solos. Cómo se toca eso está
en **[docs/marca.md](docs/marca.md)**.

## Añadir cosas sin tocar código

- **Un panel**: `#/admin` → «Nuevo panel».
- **Un departamento**: aparece solo en cuanto un panel lo use. Cae en un estilo
  neutro hasta que se le den iniciales y color, en `#/admin/accesos` o, como
  valor de arranque, en `src/config/departamentos.config.ts`.
- **Su equipo y su área de trabajo**: `#/admin/accesos`.
- **Los colores corporativos**: la lista `Marca LC`. Ver [docs/marca.md](docs/marca.md).

## Pendiente

- Crear los tres equipos de Teams y enlazarlos por `objectId` en `#/admin/accesos`.
- Rellenar el área de trabajo de Power BI de cada departamento.
- Crear en las listas las columnas nuevas y aprobar los permisos de Graph
  (ver `docs/despliegue.md`).
- Limpiar `Area de Trabajo` en el origen.
- Escribir descripciones y responsables: hoy los nueve paneles no tienen ni una
  cosa ni la otra, y se nota en la columna «Para qué sirve».
