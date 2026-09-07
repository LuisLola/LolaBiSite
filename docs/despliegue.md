# Despliegue en la intranet de SharePoint

El portal se publica como **web part de SPFx** y se añade a cualquier página
moderna del sitio. La interfaz es la misma que se ve en local: `/spfx` no
duplica ni un componente, solo monta `<PortalBI />` de `/src` y le inyecta el
repositorio de SharePoint.

## 0. Antes de empezar

| Requisito | Valor |
|---|---|
| Node.js | 18.17.x (la cadena de SPFx 1.20 no funciona con Node 20+) |
| Gulp CLI | `npm i -g gulp-cli` |
| Permisos | Administrador del catálogo de aplicaciones del tenant |
| Lista | `Paneles PowerBi LolaCasademunt` en el sitio `/sites/Operaciones` |

El proyecto raíz (Vite) sí corre con Node 20/22/24. Solo `/spfx` exige Node 18:
usa `nvm use 18` antes de empaquetar.

## 1. Columnas que faltan en la lista

El export de hoy solo trae `Title`, `Area de Trabajo`, `Url Panel` y
`Departamento`. Antes de la fase 2 hay que añadir a la lista estas columnas
(nombre interno exacto, que es el que usa `SharePointPanelRepository`):

| Nombre interno | Tipo | Para qué |
|---|---|---|
| `UrlDirecta` | Hipervínculo | Enlace de apertura si no se quiere derivar |
| `Descripcion` | Varias líneas de texto | Columna «Para qué sirve» |
| `Responsable` | Una línea de texto | Quién responde del panel |
| `GrupoAcceso` | Una línea de texto | `BI-RetailOnline`, `BI-Multimarca`, `BI-Logistica` |
| `Destacado` | Sí/No | Tarjeta destacada de la portada |
| `Orden` | Número | Orden dentro del departamento |
| `Estado` | Elección: Activo / En pruebas / Retirado | Retirar sin borrar filas |
| `HoraActualizacion` | Una línea de texto | Hora declarada de refresco (`08:15`) |

Si alguna no existe todavía, el portal sigue funcionando: los campos quedan
vacíos y administración lo marca como aviso de calidad.

Atajo para poblarlas: trabaja en local, usa **Exportar a Excel** en `/admin` y
sube ese fichero a la lista con «Editar en vista de cuadrícula» o
«Importar desde Excel».

## 1.b La lista de áreas: `Departamentos BI`

Administración → Áreas y accesos guarda ahí lo que ata cada departamento con su
equipo y su área de trabajo. Créala con estas columnas (todas de texto salvo
donde se diga):

| Nombre interno | Para qué |
|---|---|
| `Title` | Nombre del departamento, **exactamente** como aparece en la columna `Departamento` de la lista de paneles |
| `EquipoId` | `objectId` del equipo de Teams / grupo de M365 |
| `EquipoNombre` | Nombre visible del equipo |
| `EquipoCorreo` | Dirección SMTP del grupo |
| `WorkspaceId` | GUID del área de trabajo de Power BI |
| `Iniciales`, `Color`, `ColorTexto` | Cara del área |
| `Descripcion`, `Responsable`, `HoraActualizacion` | Ficha del área |

Si la lista no existe, el portal arranca igual con lo que traiga
`src/config/departamentos.config.ts`; lo que no podrá es guardar cambios.

## 1.c Los equipos de Teams y los permisos de Graph

El acceso lo decide la pertenencia al equipo de Teams del área. Hace falta:

1. **Un equipo por departamento** (Retail-Online, Multimarca, Logística) y uno
   para el equipo de BI, que es quien entra en administración. El nombre por
   defecto que espera el web part para ese último es `BI-Administradores`; se
   cambia en las propiedades del web part.
2. **Aprobar los permisos de Graph.** `package-solution.json` los pide al subir
   la solución:

   | Permiso | Para qué |
   |---|---|
   | `GroupMember.Read.All` | Leer a qué equipos pertenece quien mira, y quién está en cada equipo |
   | `User.Read.All` | Resolver el nombre y el correo de los miembros |

   Se aprueban en **Administración de SharePoint → Acceso a API**. Mientras no
   se aprueben, `IdentidadSharePoint` no ve ningún grupo y el portal no enseña
   ninguna área: el aviso queda en la consola del navegador.
3. **Enlazar cada área con su equipo** en `#/admin/accesos`. Hasta que se elija
   un equipo real, el emparejamiento se hace por nombre, que funciona pero se
   rompe si alguien renombra el equipo.

Ninguno de los dos permisos escribe. El portal **no** añade ni quita gente de
los equipos; eso se hace en Teams.

## 2. Rellenar el área de trabajo de cada informe

Esto **no** afecta al enlace principal: tarjetas y tablas abren con la `Url Panel`
de la lista, que ya funciona. Afecta solo al botón secundario «Abrir en Power BI».

`src/config/workspaces.config.ts` está vacío a propósito. Mientras lo esté, ese
botón abre por el resolutor de Power BI:

```
https://app.powerbi.com/Redirect?action=OpenReport&reportObjectId={reportId}&ctid={tenant}&reportPage={pageName}
```

Funciona —Power BI busca el informe por su id y redirige al área de trabajo
real—, pero es un salto de más. Con el `workspaceId` relleno se enlaza directo:

```
https://app.powerbi.com/groups/{workspaceId}/reports/{reportId}/{pageName}?ctid={tenant}
```

Ojo: `https://app.powerbi.com/reports/{reportId}/{pageName}` **no** es una ruta
válida del servicio; da error. No la uses en `UrlDirecta`.

Para cada informe, abre el informe en Power BI y copia el GUID que aparece tras
`/groups/` en la barra de direcciones:

```ts
export const WORKSPACES_POR_INFORME: Record<string, string> = {
  '5f662917-4305-4545-bd15-7a9d55c155a5': '<guid del área de trabajo>',
  'a04a0571-f32d-4e68-93c5-8bd9dfdc8541': '<guid del área de trabajo>',
  '570f590b-4ff6-4744-b343-1f26b2ca98a4': '<guid del área de trabajo>',
  '7bab0370-b1ec-4fb1-a92f-1a32bfcb047b': '<guid del área de trabajo>',
  '8eabaadf-5e43-41b4-a97a-4460dfcb90e5': '<guid del área de trabajo>',
};
```

## 3. Empaquetar

```bash
cd spfx
nvm use 18
npm install
gulp bundle --ship
gulp package-solution --ship
```

Sale `spfx/sharepoint/solution/portal-bi.sppkg`.

## 4. Subir al catálogo de aplicaciones

1. Abre `https://lolacasademunt.sharepoint.com/sites/appcatalog/AppCatalog`.
2. Arrastra el `.sppkg`.
3. En el diálogo, marca **Hacer que esta solución esté disponible en todos los
   sitios** (o deja que se instale por sitio) y confirma.
4. Si el tenant pide aprobar permisos de API, no hace falta: el web part usa el
   contexto del usuario vía PnPjs, sin permisos de Graph.

## 5. Añadir el web part a una página existente

1. Ve a la página de la intranet donde deba vivir el portal.
2. **Editar** → `+` → busca **Portal BI** (grupo «Avanzado»).
3. En el panel de propiedades:
   - **Título**: lo que se lee en la barra y en el héroe.
   - **Nombre de la lista**: `Paneles PowerBi LolaCasademunt`.
   - **Departamento por defecto**: preselección al crear un panel.
   - **Mostrar la pantalla de administración**: desmárcalo en la página que ven
     todos y publica una segunda página solo para el equipo de BI.
4. **Publicar**.

El portal ocupa el ancho de la zona donde se coloque; para que se vea como en el
diseño, usa una sección de **una columna a ancho completo**.

## 6. Probar sin empaquetar

```bash
cd spfx
gulp serve --nobrowser
```

y abre
`https://lolacasademunt.sharepoint.com/sites/Operaciones/_layouts/15/workbench.aspx`.
El workbench de SharePoint (no el local) es el único que da contexto real de la
lista.

## Detalles de integración que conviene conocer

- **CSS Modules.** La interfaz usa `.module.css`, que la cadena de SPFx no
  procesa de serie. `spfx/gulpfile.js` añade las dos reglas de webpack que
  faltan (`style-loader` + `css-loader` con `modules`). Si un día el build se
  queja de un `.css`, ese es el sitio.
- **React 17.** SPFx 1.20 va con React 17, así que el código compartido evita a
  propósito las novedades de React 18 (`useId`, `createRoot`) y no usa ninguna
  librería de estado que exija 18.
- **Montserrat.** El web part la carga con `SPComponentLoader.loadCss` desde
  Google Fonts. Si el tenant lo bloquea, instala `@fontsource-variable/montserrat`
  en `/spfx` e impórtalo en `PortalBiWebPart.ts`.
- **Rutas.** Se usa `HashRouter` porque dentro de una página de SharePoint no se
  controla la URL del navegador. Las rutas quedan como
  `…/pagina.aspx#/departamento/multimarca`.
- **`ExcelPanelRepository` no viaja.** Está excluido del `tsconfig` de `/spfx`,
  igual que `main.tsx`: SheetJS solo se empaqueta en la aplicación local.
- **Los tres servicios se eligen en `render()`.** El web part construye
  `SharePointPanelRepository`, `SharePointDepartamentoRepository` e
  `IdentidadSharePoint` y se los pasa a `<PortalBI servicios={…} />`. Es el
  único sitio del proyecto donde se decide la fase.
- **Sin MSAL.** Graph se llama con `context.msGraphClientFactory`, que ya viene
  autenticado por SPFx.
