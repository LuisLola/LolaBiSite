/*
 * Fase 2. Los ajustes de area (equipo de Teams, area de trabajo, cara) viven en
 * una lista propia, no en codigo, para que Administracion pueda cambiarlos.
 * Excluido del build de Vite, igual que el resto de /sharepoint.
 */
import { spfi, SPFx, type SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { NOMBRE_LISTA_DEPARTAMENTOS } from '../../config/tenant.config';
import type { GrupoM365 } from '../../domain/acceso';
import type { AjustesDepartamento, DepartamentoRepository } from '../DepartamentoRepository';

/** Columnas de la lista "Departamentos BI". */
const CAMPOS = {
  id: 'Id',
  nombre: 'Title',
  iniciales: 'Iniciales',
  color: 'Color',
  colorTexto: 'ColorTexto',
  descripcion: 'Descripcion',
  responsable: 'Responsable',
  horaActualizacion: 'HoraActualizacion',
  workspaceId: 'WorkspaceId',
  equipoId: 'EquipoId',
  equipoNombre: 'EquipoNombre',
  equipoCorreo: 'EquipoCorreo',
} as const;

const SELECT = Object.values(CAMPOS).join(',');

interface ElementoLista {
  Id: number;
  [clave: string]: unknown;
}

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

export class SharePointDepartamentoRepository implements DepartamentoRepository {
  readonly nombre = 'Lista de SharePoint';

  private readonly sp: SPFI;
  private readonly lista: string;

  constructor(contextoSpfx: Parameters<typeof SPFx>[0], nombreLista: string = NOMBRE_LISTA_DEPARTAMENTOS) {
    this.sp = spfi().using(SPFx(contextoSpfx));
    this.lista = nombreLista;
  }

  async getAjustes(): Promise<AjustesDepartamento[]> {
    try {
      const elementos: ElementoLista[] = await this.items().select(SELECT).top(500)();
      return elementos.map((elemento) => this.aAjustes(elemento));
    } catch (error) {
      // Si la lista todavia no existe, se trabaja con departamentos.config.ts.
      console.error(`[Portal BI] No se ha podido leer la lista "${this.lista}"`, error);
      return [];
    }
  }

  async guardarAjustes(ajustes: AjustesDepartamento): Promise<AjustesDepartamento> {
    const existentes: ElementoLista[] = await this.items()
      .select(SELECT)
      .filter(`${CAMPOS.nombre} eq '${ajustes.nombre.replace(/'/g, "''")}'`)
      .top(1)();

    const elemento = this.aElemento(ajustes);
    const previo = existentes[0];
    if (previo) await this.items().getById(previo.Id).update(elemento);
    else await this.items().add(elemento);
    return ajustes;
  }

  private items() {
    return this.sp.web.lists.getByTitle(this.lista).items;
  }

  private aAjustes(elemento: ElementoLista): AjustesDepartamento {
    const ajustes: AjustesDepartamento = { nombre: texto(elemento[CAMPOS.nombre]) };
    const asignar = (clave: keyof AjustesDepartamento, valor: string) => {
      if (valor) (ajustes as unknown as Record<string, unknown>)[clave] = valor;
    };
    asignar('iniciales', texto(elemento[CAMPOS.iniciales]));
    asignar('color', texto(elemento[CAMPOS.color]));
    asignar('colorTexto', texto(elemento[CAMPOS.colorTexto]));
    asignar('descripcion', texto(elemento[CAMPOS.descripcion]));
    asignar('responsable', texto(elemento[CAMPOS.responsable]));
    asignar('horaActualizacion', texto(elemento[CAMPOS.horaActualizacion]));
    asignar('workspaceId', texto(elemento[CAMPOS.workspaceId]));

    const nombreEquipo = texto(elemento[CAMPOS.equipoNombre]);
    const idEquipo = texto(elemento[CAMPOS.equipoId]);
    if (nombreEquipo || idEquipo) {
      const grupo: GrupoM365 = { id: idEquipo, nombre: nombreEquipo || idEquipo, esEquipoTeams: true };
      const correo = texto(elemento[CAMPOS.equipoCorreo]);
      if (correo) grupo.correo = correo;
      ajustes.grupo = grupo;
    }
    return ajustes;
  }

  private aElemento(ajustes: AjustesDepartamento): Record<string, unknown> {
    return {
      [CAMPOS.nombre]: ajustes.nombre,
      [CAMPOS.iniciales]: ajustes.iniciales ?? '',
      [CAMPOS.color]: ajustes.color ?? '',
      [CAMPOS.colorTexto]: ajustes.colorTexto ?? '',
      [CAMPOS.descripcion]: ajustes.descripcion ?? '',
      [CAMPOS.responsable]: ajustes.responsable ?? '',
      [CAMPOS.horaActualizacion]: ajustes.horaActualizacion ?? '',
      [CAMPOS.workspaceId]: ajustes.workspaceId ?? '',
      [CAMPOS.equipoId]: ajustes.grupo?.id ?? '',
      [CAMPOS.equipoNombre]: ajustes.grupo?.nombre ?? '',
      [CAMPOS.equipoCorreo]: ajustes.grupo?.correo ?? '',
    };
  }
}
