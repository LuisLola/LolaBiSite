/**
 * Tenant de Lola Casademunt. Va en config, no por fila: las 9 filas del export
 * repiten el mismo ctid.
 */
export const TENANT_ID = '52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70';

/**
 * Sitio donde viven las listas del portal. Los repositorios lo usan como URL
 * absoluta en spfi(), porque spfi() sin argumento resuelve al web actual: sin
 * esto, el web part solo funcionaria en su propio sitio.
 */
export const URL_SITIO_PORTAL = 'https://lolacasademunt.sharepoint.com/sites/PortalBI';

/** Pagina del portal. La abre el boton que lo muestra en un modal. */
export const URL_PAGINA_PORTAL = `${URL_SITIO_PORTAL}/SitePages/Home.aspx`;

/** Nombre por defecto de la lista de SharePoint (fase 2). */
export const NOMBRE_LISTA = 'Paneles PowerBi LolaCasademunt';

/** Nombre por defecto de la lista de ajustes de área (fase 2). */
export const NOMBRE_LISTA_DEPARTAMENTOS = 'Departamentos BI';

/**
 * Colores corporativos. Vive en el sitio raíz porque todo el mundo tiene
 * lectura ahí y así el mismo origen sirve a cualquier sitio del tenant.
 * Ver docs/marca.md.
 */
export const URL_SITIO_MARCA = 'https://lolacasademunt.sharepoint.com';
export const NOMBRE_LISTA_MARCA = 'Marca LC';

/**
 * Equipo de Teams (o grupo de M365) cuyos miembros entran en Administración.
 * Se puede cambiar desde las propiedades del web part.
 */
export const GRUPO_ADMINISTRADORES = 'BI-Administradores';
