/*
 * Fase 2. Este fichero lo compila la cadena de SPFx (que trae @pnp/sp y los
 * tipos de SharePoint), no el build de Vite: esta excluido de tsconfig.app.json
 * porque la aplicacion local nunca lo importa.
 */
import { spfi, SPFx, type SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { NOMBRE_LISTA, URL_SITIO_PORTAL } from '../../config/tenant.config';
import { derivarDepartamentos } from '../../domain/departamentos';
import { ordenarPaneles, siguienteOrden } from '../../domain/paneles';
import type { Departamento, Panel, PanelInput } from '../../domain/types';
import type { PanelRepository } from '../PanelRepository';
import { COLUMNAS, type CampoPanel } from '../excel/columnas';
import { completarPanel } from '../excel/mapeo';

/**
 * Nombres internos de las columnas, derivados de COLUMNAS: una sola fuente de
 * verdad, la misma que replica scripts/pnp/PortalBI.Comun.ps1.
 */
const CAMPOS = COLUMNAS.reduce(
  (acumulado, columna) => {
    acumulado[columna.campo] = columna.interno;
    return acumulado;
  },
  { id: 'Id' } as { id: string } & Record<CampoPanel, string>,
);

const SELECT = [...Object.values(CAMPOS), 'Created', 'Modified'].join(',');

interface ElementoLista {
  Id: number;
  Created?: string;
  Modified?: string;
  [clave: string]: unknown;
}

/** Un hipervinculo de SharePoint llega como { Url, Description } o como texto. */
function textoDeHipervinculo(valor: unknown): string {
  if (!valor) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    return String(objeto['Url'] ?? objeto['Description'] ?? '').trim();
  }
  return String(valor).trim();
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    return String(objeto['Title'] ?? objeto['LookupValue'] ?? objeto['Url'] ?? '').trim();
  }
  return String(valor).trim();
}

/**
 * Misma interfaz que ExcelPanelRepository, contra la lista real via PnPjs v4
 * usando el contexto de SPFx. Sin tokens a mano, sin autoAuth.
 */
export class SharePointPanelRepository implements PanelRepository {
  readonly nombre = 'Lista de SharePoint';

  private readonly sp: SPFI;
  private readonly lista: string;

  /**
   * urlSitio es obligatorio de facto: spfi() sin argumento resuelve al web
   * actual, asi que el web part fuera del sitio del portal (o una pestana de
   * Teams) buscaria la lista en el sitio equivocado y daria 404.
   */
  constructor(
    contextoSpfx: Parameters<typeof SPFx>[0],
    nombreLista: string = NOMBRE_LISTA,
    urlSitio: string = URL_SITIO_PORTAL,
  ) {
    this.sp = spfi(urlSitio).using(SPFx(contextoSpfx));
    this.lista = nombreLista;
  }

  async getPaneles(): Promise<Panel[]> {
    const elementos: ElementoLista[] = await this.items().select(SELECT).top(2000)();
    return ordenarPaneles(elementos.map((elemento, indice) => this.aPanel(elemento, indice)));
  }

  async getDepartamentos(): Promise<Departamento[]> {
    return derivarDepartamentos(await this.getPaneles());
  }

  async createPanel(entrada: PanelInput): Promise<Panel> {
    const existentes = await this.getPaneles();
    const orden = entrada.orden || siguienteOrden(existentes, entrada.departamento);
    const resultado = await this.items().add(this.aElemento({ ...entrada, orden }));
    const id = Number((resultado as { data?: { Id?: number } }).data?.Id ?? 0);
    const creado: ElementoLista = await this.items().getById(id).select(SELECT)();
    return this.aPanel(creado);
  }

  async updatePanel(id: string, cambios: Partial<PanelInput>): Promise<Panel> {
    await this.items().getById(Number(id)).update(this.aElemento(cambios));
    const actualizado: ElementoLista = await this.items().getById(Number(id)).select(SELECT)();
    return this.aPanel(actualizado);
  }

  /** Borrado logico, igual que en fase 1: nunca se borra la fila. */
  async deletePanel(id: string): Promise<void> {
    await this.items().getById(Number(id)).update({ [CAMPOS.estado]: 'Retirado' });
  }

  private items() {
    return this.sp.web.lists.getByTitle(this.lista).items;
  }

  private aPanel(elemento: ElementoLista, indice = 0): Panel {
    const orden = elemento[CAMPOS.orden];
    return completarPanel(
      {
        id: String(elemento.Id),
        nombre: texto(elemento[CAMPOS.nombre]) || '(sin titulo)',
        areaTrabajo: texto(elemento[CAMPOS.areaTrabajo]),
        urlPanel: textoDeHipervinculo(elemento[CAMPOS.urlPanel]),
        urlDirecta: textoDeHipervinculo(elemento[CAMPOS.urlDirecta]),
        departamento: texto(elemento[CAMPOS.departamento]),
        descripcion: texto(elemento[CAMPOS.descripcion]),
        responsable: texto(elemento[CAMPOS.responsable]),
        grupoAcceso: texto(elemento[CAMPOS.grupoAcceso]),
        destacado: elemento[CAMPOS.destacado] === true,
        orden: typeof orden === 'number' ? orden : undefined,
        estado: (texto(elemento[CAMPOS.estado]) || 'Activo') as Panel['estado'],
        horaActualizacion: texto(elemento[CAMPOS.horaActualizacion]),
        creado: elemento.Created,
        modificado: elemento.Modified,
      },
      indice,
    );
  }

  private aElemento(cambios: Partial<PanelInput>): Record<string, unknown> {
    const elemento: Record<string, unknown> = {};
    if (cambios.nombre !== undefined) elemento[CAMPOS.nombre] = cambios.nombre;
    if (cambios.areaTrabajo !== undefined) elemento[CAMPOS.areaTrabajo] = cambios.areaTrabajo;
    if (cambios.urlPanel !== undefined) {
      elemento[CAMPOS.urlPanel] = { Url: cambios.urlPanel, Description: cambios.nombre ?? 'Panel' };
    }
    if (cambios.urlDirecta !== undefined) {
      elemento[CAMPOS.urlDirecta] = { Url: cambios.urlDirecta, Description: cambios.nombre ?? 'Abrir' };
    }
    if (cambios.departamento !== undefined) elemento[CAMPOS.departamento] = cambios.departamento;
    if (cambios.descripcion !== undefined) elemento[CAMPOS.descripcion] = cambios.descripcion;
    if (cambios.responsable !== undefined) elemento[CAMPOS.responsable] = cambios.responsable;
    if (cambios.grupoAcceso !== undefined) elemento[CAMPOS.grupoAcceso] = cambios.grupoAcceso;
    if (cambios.destacado !== undefined) elemento[CAMPOS.destacado] = cambios.destacado;
    if (cambios.orden !== undefined) elemento[CAMPOS.orden] = cambios.orden;
    if (cambios.estado !== undefined) elemento[CAMPOS.estado] = cambios.estado;
    if (cambios.horaActualizacion !== undefined) {
      elemento[CAMPOS.horaActualizacion] = cambios.horaActualizacion;
    }
    return elemento;
  }
}
