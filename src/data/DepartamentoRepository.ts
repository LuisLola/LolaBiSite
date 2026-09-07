import type { GrupoM365 } from '../domain/acceso';

/**
 * Lo que Administración puede cambiar de un departamento sin tocar código:
 * su cara, su área de trabajo de Power BI y el equipo de Teams que da acceso.
 */
export interface AjustesDepartamento {
  /** Clave: el valor tal cual de la columna "Departamento". */
  nombre: string;
  iniciales?: string;
  color?: string;
  colorTexto?: string;
  descripcion?: string;
  responsable?: string;
  horaActualizacion?: string;
  workspaceId?: string;
  grupo?: GrupoM365;
}

export interface DepartamentoRepository {
  readonly nombre: string;
  getAjustes(): Promise<AjustesDepartamento[]>;
  guardarAjustes(ajustes: AjustesDepartamento): Promise<AjustesDepartamento>;
  /** Fase 1: descartar lo guardado en local y volver a la configuración. */
  restablecer?(): Promise<AjustesDepartamento[]>;
}
