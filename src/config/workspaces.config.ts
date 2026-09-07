/**
 * Mapa reportId -> workspaceId (el "groups/{id}" de app.powerbi.com).
 *
 * El export de SharePoint NO trae el area de trabajo real de Power BI, asi que
 * esto se rellena a mano. Mientras un reportId no este aqui, la URL de apertura
 * cae al formato sin grupo y administracion muestra el aviso "falta area de trabajo".
 *
 * Para rellenarlo: abre el informe en Power BI y copia el GUID que aparece tras
 * /groups/ en la barra de direcciones.
 */
export const WORKSPACES_POR_INFORME: Record<string, string> = {
  // '5f662917-4305-4545-bd15-7a9d55c155a5': '00000000-0000-0000-0000-000000000000',
};

/**
 * Nombre legible por informe, opcional. Si falta, se deduce del prefijo comun
 * de los titulos de sus paginas.
 */
export const NOMBRES_INFORME: Record<string, string> = {
  '5f662917-4305-4545-bd15-7a9d55c155a5': 'LC Retail & Online',
  'a04a0571-f32d-4e68-93c5-8bd9dfdc8541': 'LC Multimarca',
};
