/**
 * Mapa reportId -> workspaceId (el "groups/{id}" de app.powerbi.com).
 *
 * EXCEPCION, no la via normal. Lo habitual es "un departamento, un area de
 * trabajo": el area se guarda en la columna WorkspaceId de la lista
 * "Departamentos BI" y se edita en Administracion -> Accesos. Este mapa existe
 * solo para el informe que viva fuera del area de su departamento, y por eso
 * esta vacio a proposito.
 *
 * Prioridad en urlDirectaEfectiva: UrlDirecta manual > este mapa > area del
 * departamento.
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
