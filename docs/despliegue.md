# Despliegue en la intranet de SharePoint

El portal vive en su propio sitio, `/sites/PortalBI`, y lee sus datos de dos
listas de ese sitio. Se publica como **web part de SPFx** y se puede montar de
tres formas con el mismo paquete:

- **incrustado** en una página del sitio del portal (lo normal),
- como **botón que abre el portal en una ventana**, dentro de cualquier página,
- como **botón global** en la barra superior de todos los sitios del tenant
  (extensión de tipo Application Customizer).

La interfaz es la misma que se ve en local: `/spfx` no duplica ni un componente,
solo monta `<PortalBI />` de `/src` y le inyecta los repositorios de SharePoint.

## 0. Antes de empezar

| Requisito | Valor |
|---|---|
| Node.js | 18.17.x para `/spfx` (la cadena de SPFx 1.20 no funciona con Node 20+) |
| Gulp CLI | `npm i -g gulp-cli` |
| PowerShell | 7 con el módulo `PnP.PowerShell` |
| Permisos | Administrador de SharePoint (`serviceaccountm365@lolacasademunt.com`) |

El proyecto raíz (Vite) sí corre con Node 20/22/24. Solo `/spfx` exige Node 18:
usa `nvm use 18` antes de empaquetar.

## 1. Aprovisionar sitio y listas

Todo está en scripts idempotentes: **[scripts/pnp/](../scripts/pnp/)**. Lee su
[README](../scripts/pnp/README.md), que incluye el paso previo de registrar la
app de PnP PowerShell (sin eso, `Connect-PnPOnline -Interactive` falla).

```powershell
cd scripts\pnp
.\1-Aprovisionar-Sitio.ps1          # Communication site + las 2 listas + permisos
.\2-Migrar-Paneles.ps1 -Simular     # revisar
.\2-Migrar-Paneles.ps1              # copiar los paneles desde /sites/Operaciones
```

Las dos listas que crea:

| Lista | Para qué |
|---|---|
| `Paneles PowerBi LolaCasademunt` | Un panel por fila. 12 columnas, contrato en `src/data/excel/columnas.ts` |
| `Departamentos BI` | Lo que ata cada departamento con su equipo de Teams y su área de trabajo. Contrato en `src/data/sharepoint/SharePointDepartamentoRepository.ts` |

**Los nombres internos de columna son lo que más se rompe.** SharePoint los
congela al crear el campo y los deriva del nombre visible (un espacio pasa a
`_x0020_`); renombrar después no los cambia, y el síntoma de equivocarse no es un
error sino una columna vacía en todas las filas. Por eso los scripts los crean
con XML explícito y validan al final. Si esa validación falla, no sigas.

La lista de `/sites/Operaciones` **no se toca**: el script de migración solo lee.
Qué hacer con ella después (dejarla, ponerla en solo lectura, dejar un enlace al
portal nuevo) es una decisión aparte.

## 2. Los equipos de Teams y los permisos de Graph

El acceso lo decide la pertenencia al equipo de Teams del área. Hace falta:

1. **Un equipo por departamento** (Retail-Online, Multimarca, Logística) y uno
   para el equipo de BI, que es quien entra en administración. El nombre que
   espera el web part para ese último es `BI-Administradores`; se cambia en las
   propiedades del web part.
2. **Aprobar dos permisos de Graph** en el catálogo de aplicaciones:
   `GroupMember.Read.All` y `User.Read.All`. Los declara
   `spfx/config/package-solution.json` y los aprueba `3-Desplegar-App.ps1`.

Ninguno de los dos escribe. El portal **no** añade ni quita gente de los equipos;
eso se hace en Teams.

**Si no se aprueban, el portal arranca, no da ningún error y no muestra ninguna
área**, porque se queda sin grupos. Es el fallo número uno. Comprobar con:

```powershell
Get-PnPTenantServicePrincipalPermissionGrants
```

Y un aviso que conviene tener claro: los repositorios leen con el contexto del
usuario, así que **todo el que use el portal necesita lectura en la lista
completa** y puede ver todas las filas entrando a `/Lists/`. El filtrado por
equipo es de interfaz; el permiso real sobre los datos lo aplica Power BI al
cargar cada panel.

## 3. El área de trabajo de cada área

Esto **no** afecta al enlace principal: tarjetas y tablas abren con la `Url Panel`
de la lista, que ya funciona. Afecta solo al botón secundario «Abrir en Power BI»
y al aviso de calidad «falta área de trabajo».

Se rellena desde la propia aplicación: **Administración → Accesos**, columna
`WorkspaceId` del área. Abre el informe en Power BI y copia el GUID que aparece
tras `/groups/` en la barra de direcciones.

Con el `workspaceId` relleno se enlaza directo:

```
https://app.powerbi.com/groups/{workspaceId}/reports/{reportId}/{pageName}?ctid={tenant}
```

Sin él se abre por el resolutor, que funciona igual pero da un salto de más:

```
https://app.powerbi.com/Redirect?action=OpenReport&reportObjectId={reportId}&ctid={tenant}&reportPage={pageName}
```

Ojo: `https://app.powerbi.com/reports/{reportId}/{pageName}` **no** es una ruta
válida del servicio; da error. No la uses en `UrlDirecta`.

`src/config/workspaces.config.ts` sigue existiendo, pero solo como excepción para
un informe que viva fuera del área de su departamento. Lo normal es dejarlo
vacío: un departamento, un área.

## 4. Empaquetar y desplegar

```bash
cd spfx
nvm use 18
npm install
gulp bundle --ship
gulp package-solution --ship
```

Sale `spfx/sharepoint/solution/portal-bi.sppkg`. Luego:

```powershell
cd ..\scripts\pnp
.\3-Desplegar-App.ps1 -ConfigurarPagina
```

Ese script sube el paquete con `Add-PnPApp -Scope Tenant -Publish
-SkipFeatureDeployment`, aprueba los permisos de Graph y, con
`-ConfigurarPagina`, publica la home del portal con el web part ya configurado.

**No hace falta `Install-PnPApp`**: con `skipFeatureDeployment: true` la app queda
disponible en todos los sitios al publicarla, e instalarla daría error.

Al publicar también se crea la fila del botón global en la lista **Tenant Wide
Extensions** del catálogo (`spfx/sharepoint/assets/ClientSideInstance.xml`). Desde
ahí se puede desactivar el botón sin volver a desplegar.

Cada vez que cambien los assets de la solución hay que **subir la versión** de
`spfx/config/package-solution.json`, o el catálogo puede seguir sirviendo el XML
viejo.

## 5. Colocar el portal en una página

1. Ve a la página donde deba vivir el portal.
2. **Editar** → `+` → busca **Portal BI** (grupo «Avanzado»).
3. En el panel de propiedades:
   - **Título**: lo que se lee en la barra y en el héroe.
   - **Cómo se muestra**: *Incrustado en la página* o *Botón que abre una ventana*.
   - **Lista de paneles** y **Lista de áreas**: normalmente los valores por defecto.
   - **Sitio de las listas**: vacío = `/sites/PortalBI`. **Rellénalo si pones el
     web part en otro sitio**, o buscará las listas en el sitio equivocado.
   - **Departamento por defecto**: preselección al crear un panel.
   - **Mostrar la pantalla de administración**: desmárcalo en la página que ven
     todos y publica una segunda página solo para el equipo de BI.
4. **Publicar**.

Incrustado, el portal ocupa el ancho de la zona donde se coloque; para que se vea
como en el diseño, usa una sección de **una columna a ancho completo**.

### El botón global

La extensión pone un botón «Paneles BI» en la barra superior de cualquier sitio
del tenant, y se auto-inhibe en el propio sitio del portal. Se configura desde la
lista **Tenant Wide Extensions** del catálogo (propiedades `urlPortal` y
`etiqueta`).

### En Teams

La vía sin código es una pestaña de tipo **Sitio web** apuntando a
`https://lolacasademunt.sharepoint.com/sites/PortalBI/SitePages/Home.aspx`.
Publicar la app SPFx como pestaña de Teams (`TeamsTab` en `supportedHosts`)
requiere además dos iconos PNG con el GUID del web part y sincronizar la solución
a Teams; no está hecho.

## 6. Probar sin empaquetar

Comprobar tipos del lado SPFx **sin Node 18** (útil antes de cambiar de versión
de Node solo para ver si compila):

```bash
npx tsc -p spfx/tsconfig.check.json
```

El build de verdad sí necesita Node 18:

```bash
cd spfx
gulp serve --nobrowser
```

y abre el workbench **del sitio del portal**:
`https://lolacasademunt.sharepoint.com/sites/PortalBI/_layouts/15/workbench.aspx`
(ya es el `initialPage` de `spfx/config/serve.json`). El workbench de SharePoint,
no el local, es el único que da contexto real de la lista.

Para probar el botón global sobre una página real, sin desplegar:

```
https://…/sites/Operaciones/SitePages/Home.aspx?loadSPFX=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js&customActions={"65d56318-40c5-429b-a467-78d63e071bb6":{"location":"ClientSideExtension.ApplicationCustomizer","properties":{"urlPortal":"https://lolacasademunt.sharepoint.com/sites/PortalBI/SitePages/Home.aspx"}}}
```

La comprobación importante ahí no es que salga el botón, es que **la página
anfitriona no cambie de aspecto**: eso demuestra que el CSS del portal no se
escapa.

## Carga masiva de paneles

Es `scripts/pnp/2-Migrar-Paneles.ps1`. El botón «Importar Excel» de la pantalla de
administración solo aparece en el modo local: el repositorio de SharePoint no
implementa `reemplazarTodo` a propósito, porque «importar un Excel encima de una
lista viva» es un borrado masivo sin vuelta atrás, y el script hace el mismo
trabajo siendo idempotente, con `-Simular` y sin borrar nada.

## Colores corporativos

Están en una lista aparte y se cambian sin recompilar. Ver **[docs/marca.md](marca.md)**.

## Detalles de integración que conviene conocer

- **CSS Modules.** La interfaz usa `.module.css`, que la cadena de SPFx no
  procesa de serie. `spfx/gulpfile.js` añade las dos reglas de webpack que
  faltan (`style-loader` + `css-loader` con `modules`). Si un día el build se
  queja de un `.css`, ese es el sitio.
- **El CSS va scopeado.** `src/ui/global.css` y `src/ui/tokens.css` cuelgan todo
  de `.portalBiRaiz` / `.portalBiTokens`. Dentro de SPFx, `style-loader` inyecta
  ese CSS en el `<head>` de la página anfitriona: un selector de elemento suelto
  (`body`, `a`, `ul`, `h1`) repintaría la página de SharePoint entera. No añadas
  selectores globales.
- **Los overlays van a `document.body`.** El modal y el buscador (Ctrl+K) usan
  `createPortal` con `z-index` por encima del millón, porque el cromo de
  SharePoint llega hasta ahí. El envoltorio lleva `portalBiTokens` para no perder
  las variables del tema.
- **React 17.** SPFx 1.20 va con React 17, así que el código compartido evita a
  propósito las novedades de React 18 (`useId`, `createRoot`) y no usa ninguna
  librería de estado que exija 18.
- **Montserrat.** El web part la carga con `SPComponentLoader.loadCss` desde
  Google Fonts. Si el tenant lo bloquea, instala `@fontsource-variable/montserrat`
  en `/spfx` e impórtalo en `PortalBiWebPart.ts`.
- **Rutas.** Se usa `HashRouter` porque dentro de una página de SharePoint no se
  controla la URL del navegador. Las rutas quedan como
  `…/pagina.aspx#/departamento/multimarca`.
- **El modal es un iframe.** El botón no monta el portal en la página anfitriona:
  abre su propia página en un `<iframe>`. Así no hay CSS que se escape, no hay dos
  `HashRouter` peleándose por la URL y el bundle del botón no lleva el portal
  dentro (se descarga en todas las páginas del tenant).
- **`ExcelPanelRepository` no viaja.** Está excluido del `tsconfig` de `/spfx`,
  igual que `main.tsx`: SheetJS solo se empaqueta en la aplicación local.
- **Los servicios se eligen en `render()`.** El web part construye
  `SharePointPanelRepository`, `SharePointDepartamentoRepository`,
  `IdentidadSharePoint` y `MarcaRepository`, y se los pasa a
  `<PortalBI servicios={…} />`. Es el único sitio del proyecto donde se decide la
  fase. Están memoizados porque SPFx llama a `render()` en cada tecla del panel
  de propiedades.
- **`spfi(urlSitio)`, no `spfi()`.** `spfi()` sin argumento resuelve al sitio
  actual, así que el web part fuera de `/sites/PortalBI` buscaría las listas donde
  no están.
- **Sin MSAL.** Graph se llama con `context.msGraphClientFactory`, que ya viene
  autenticado por SPFx.
