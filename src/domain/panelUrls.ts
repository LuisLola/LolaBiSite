import { TENANT_ID } from '../config/tenant.config';
import { WORKSPACES_POR_INFORME } from '../config/workspaces.config';
import type { Panel } from './types';

export interface DatosUrlEmbed {
  reportId: string;
  pageName: string;
  ctid?: string;
}

const RE_GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extrae reportId / pageName / ctid de una URL de Power BI, sea de incrustacion
 * (reportEmbed?reportId=...&pageName=...) o de apertura
 * (/groups/{ws}/reports/{reportId}/{pageName}).
 * Devuelve null si no reconoce nada aprovechable.
 */
export function parsearUrlPanel(url: string | undefined | null): DatosUrlEmbed | null {
  if (!url) return null;
  const texto = String(url).trim();
  if (!texto) return null;

  // Formato embed: query string.
  const query = texto.includes('?') ? texto.slice(texto.indexOf('?') + 1) : '';
  if (query) {
    const params = new URLSearchParams(query.replace(/&amp;/g, '&'));
    // reportId lo usa reportEmbed; reportObjectId, el resolutor /Redirect.
    const reportId = params.get('reportId') ?? params.get('reportObjectId');
    if (reportId && RE_GUID.test(reportId)) {
      const datos: DatosUrlEmbed = {
        reportId: reportId.toLowerCase(),
        pageName: params.get('pageName') ?? params.get('reportPage') ?? '',
      };
      const ctid = params.get('ctid');
      if (ctid) datos.ctid = ctid.toLowerCase();
      return datos;
    }
  }

  // Formato de apertura: /reports/{reportId}/{pageName}
  const ruta = texto.split('?')[0] ?? '';
  const porRuta = ruta.match(
    /\/reports\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/([^/]+))?/i,
  );
  if (porRuta) {
    return {
      reportId: porRuta[1]!.toLowerCase(),
      pageName: porRuta[2] ?? '',
    };
  }

  return null;
}

/** true si la URL es de incrustacion: no debe usarse nunca como enlace. */
export function esUrlEmbed(url: string | undefined | null): boolean {
  if (!url) return false;
  const texto = url.toLowerCase();
  return texto.includes('reportembed') || texto.includes('autoauth=true');
}

export interface OpcionesUrlDirecta {
  pageName?: string;
  workspaceId?: string;
  /** Tenant. Si falta, se usa el de tenant.config.ts. */
  ctid?: string;
}

/**
 * URL de apertura en app.powerbi.com.
 *
 * Con area de trabajo se enlaza directo a /groups/{ws}/reports/{id}/{pagina},
 * que es la forma que genera "Copiar vinculo" en Power BI.
 *
 * Sin area de trabajo NO vale /reports/{id}/{pagina}: esa ruta no existe en el
 * servicio y devuelve error. Hay que pasar por el resolutor
 * /Redirect?action=OpenReport, que localiza el informe por su id y redirige al
 * area de trabajo real. Es un salto mas, pero abre.
 */
export function construirUrlDirecta(reportId: string, opciones: OpcionesUrlDirecta = {}): string {
  if (!reportId) return '';
  const { pageName, workspaceId } = opciones;
  const tenant = opciones.ctid ?? TENANT_ID;

  if (workspaceId) {
    const base = `https://app.powerbi.com/groups/${workspaceId}/reports/${reportId}`;
    const conPagina = pageName ? `${base}/${pageName}` : base;
    return tenant ? `${conPagina}?ctid=${tenant}` : conPagina;
  }

  const parametros = new URLSearchParams({ action: 'OpenReport', reportObjectId: reportId });
  if (tenant) parametros.set('ctid', tenant);
  if (pageName) parametros.set('reportPage', pageName);
  return `https://app.powerbi.com/Redirect?${parametros.toString()}`;
}

export function workspaceDeInforme(reportId: string): string | undefined {
  return WORKSPACES_POR_INFORME[reportId];
}

/**
 * Enlace al informe dentro del portal de Power BI.
 *
 * El area de trabajo es la del departamento (un departamento, un area);
 * WORKSPACES_POR_INFORME queda como excepcion para el informe que viva fuera.
 * Prioridad: override manual > excepcion por informe > area del departamento.
 */
export function urlDirectaEfectiva(panel: Panel, workspaceDelArea?: string): string {
  const manual = panel.urlDirecta?.trim();
  if (manual && !esUrlEmbed(manual)) return manual;
  return construirUrlDirecta(panel.reportId, {
    pageName: panel.pageName,
    workspaceId: workspaceDeInforme(panel.reportId) ?? workspaceDelArea,
    ctid: panel.ctid,
  });
}

/**
 * true si al informe le falta el workspaceId: el enlace funciona igual, pero
 * pasando por el resolutor en vez de ir directo.
 */
export function faltaAreaDeTrabajo(panel: Panel, workspaceDelArea?: string): boolean {
  const manual = panel.urlDirecta?.trim();
  if (manual && !esUrlEmbed(manual)) return false;
  return !(workspaceDeInforme(panel.reportId) ?? workspaceDelArea);
}

/**
 * URL que abren tarjetas, tablas, buscador y portada.
 *
 * Se usa la URL de incrustacion tal cual esta en la lista: abre la pagina sola,
 * limpia, sin el cromo de Power BI. Decision tomada tras comprobarlo en el
 * navegador; como el portal ya lista cada pagina por separado, no hace falta el
 * panel de paginas del servicio. El enlace al portal completo sigue disponible
 * en la vista de panel y en administracion (urlDirectaEfectiva).
 *
 * Si un panel no tiene URL de incrustacion (alta manual), cae al portal.
 */
export function urlAbrirPanel(panel: Panel): string {
  const incrustacion = panel.urlPanel?.trim();
  if (incrustacion) return incrustacion;
  return urlDirectaEfectiva(panel);
}

/** URL para el <iframe> de la vista de panel. */
export function urlIframe(panel: Panel): string {
  if (panel.urlPanel?.trim()) return panel.urlPanel.trim();
  const ws = workspaceDeInforme(panel.reportId);
  const params = new URLSearchParams({ reportId: panel.reportId, autoAuth: 'true' });
  if (panel.ctid) params.set('ctid', panel.ctid);
  if (panel.pageName) params.set('pageName', panel.pageName);
  if (ws) params.set('groupId', ws);
  params.set('navContentPaneEnabled', 'false');
  params.set('filterPaneEnabled', 'false');
  return `https://app.powerbi.com/reportEmbed?${params.toString()}`;
}
