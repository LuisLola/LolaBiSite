# Aprovisionamiento del Portal BI

Scripts de PnP PowerShell que crean el sitio del portal, sus dos listas, migran los
datos desde `/sites/Operaciones` y despliegan la solución de SPFx.

Todos son **idempotentes**: se pueden volver a ejecutar sin duplicar nada.

## Requisitos

- PowerShell 7 y el módulo `PnP.PowerShell` (`Install-Module PnP.PowerShell -Scope CurrentUser`).
- La cuenta `serviceaccountm365@lolacasademunt.com` (administrador de SharePoint).
- Un ClientId propio de app: **PnP PowerShell ya no incluye una app multi-tenant**.

### Paso 0 (una sola vez)

```powershell
Register-PnPEntraIDAppForInteractiveLogin `
  -ApplicationName "PnP PowerShell LolaCasademunt" `
  -Tenant lolacasademunt.onmicrosoft.com -Interactive
```

Guarda el `ClientId` que devuelve (no es un secreto) en la variable de entorno que
leen los scripts:

```powershell
$env:PNP_CLIENT_ID = '<el ClientId>'
```

Para que persista entre sesiones: `[Environment]::SetEnvironmentVariable('PNP_CLIENT_ID','<id>','User')`.

Sin esto, todos los `Connect-PnPOnline -Interactive` fallan con `AADSTS700016`.

## Orden

```powershell
cd scripts\pnp

.\1-Aprovisionar-Sitio.ps1          # sitio + 2 listas + columnas + vistas + permisos
.\2-Migrar-Paneles.ps1 -Simular     # revisar la salida
.\2-Migrar-Paneles.ps1              # aplicar
# build de SPFx a mano (Node 18):  cd ..\..\spfx; nvm use 18; gulp bundle --ship; gulp package-solution --ship
.\3-Desplegar-App.ps1 -ConfigurarPagina
.\4-Publicar-Marca.ps1 -CrearLista   # una vez, para poder cambiar colores sin desplegar
```

`1-Aprovisionar-Sitio.ps1 -SoloComprobar` valida los nombres internos de columna sin
crear nada. Útil después de cualquier cambio a mano en las listas.

## Qué hace cada uno

| Script | Qué hace |
|---|---|
| `PortalBI.Comun.ps1` | Constantes (URLs, nombres de lista) y helpers. No se ejecuta solo: los demás lo cargan con dot-source |
| `1-Aprovisionar-Sitio.ps1` | Crea el Communication site `/sites/PortalBI`, las listas `Paneles PowerBi LolaCasademunt` y `Departamentos BI` con todas sus columnas, ajusta vistas y versionado, da permisos y siembra los 3 departamentos |
| `2-Migrar-Paneles.ps1` | Copia los paneles de `/sites/Operaciones` al sitio nuevo. **No escribe nada en el origen.** Deduplica por Título + Url |
| `3-Desplegar-App.ps1` | Sube el `.sppkg` al catálogo, aprueba los permisos de Graph y opcionalmente publica la página con el web part |
| `4-Publicar-Marca.ps1` | Crea la lista `Marca LC` de colores corporativos y, desde esos mismos valores, genera y aplica el tema nativo de SharePoint. Ver [docs/marca.md](../../docs/marca.md) |

## Lo que más se rompe

**Nombres internos de columna.** SharePoint congela el nombre interno al crear el
campo y lo deriva del nombre visible (un espacio se convierte en `_x0020_`).
Renombrar la columna después **no** cambia el nombre interno, y el síntoma de
equivocarse no es un error: es una columna vacía en todas las filas.

Por eso los campos se crean con `Add-PnPFieldFromXml` y `Name`/`StaticName`
explícitos, y `Comprobar-Campos` valida al final que existen todos. **Si esa
comprobación falla, no sigas al paso 2.**

El origen de verdad de los nombres internos es el código:

- Lista de paneles: `src/data/excel/columnas.ts`, campo `interno` de `COLUMNAS`
- Lista de departamentos: `src/data/sharepoint/SharePointDepartamentoRepository.ts`, `const CAMPOS`

Si cambian ahí, hay que cambiarlos en `PortalBI.Comun.ps1`.

**Permisos de Graph sin aprobar.** El portal arranca, no da error y no muestra
ninguna área, porque `IdentidadSharePoint` se queda sin grupos. Verificar con:

```powershell
Get-PnPTenantServicePrincipalPermissionGrants
```

## Notas

- La lista de origen se llama `Paneles PowerBi LolaCasadeMunt` (con M mayúscula) y la
  nueva `Paneles PowerBi LolaCasademunt`, como dice `src/config/tenant.config.ts`. Los
  scripts las tratan como dos nombres distintos a propósito.
- Los departamentos se siembran **solo con el nombre**. Una celda vacía en
  `Departamentos BI` significa "usa el valor de `src/config/departamentos.config.ts`",
  así que rellenar el color aquí congelaría el tema en vez de dejarlo seguir a la marca.
  `WorkspaceId` y `EquipoId` se rellenan desde la propia app, en `#/admin/accesos`.
- Carga masiva de paneles: es `2-Migrar-Paneles.ps1`. El botón "Importar Excel" de la
  pantalla de administración solo aparece en el modo local con Excel, porque el
  repositorio de SharePoint no implementa `reemplazarTodo` a propósito.
- Todo el que tenga acceso al sitio puede leer las listas completas entrando a
  `/Lists/`. El filtrado por equipo de Teams del portal es de interfaz; el permiso
  real sobre los datos lo aplica Power BI al cargar cada panel.
