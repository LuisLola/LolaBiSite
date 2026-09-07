import type { Departamento, Panel, PanelInput } from '../domain/types';

/**
 * Única puerta de acceso a los datos. Los componentes no saben si detrás hay un
 * Excel o una lista de SharePoint.
 */
export interface PanelRepository {
  getPaneles(): Promise<Panel[]>;
  getDepartamentos(): Promise<Departamento[]>;
  createPanel(p: PanelInput): Promise<Panel>;
  updatePanel(id: string, p: Partial<PanelInput>): Promise<Panel>;
  /** Borrado lógico: Estado = "Retirado". */
  deletePanel(id: string): Promise<void>;

  /** Etiqueta para la interfaz ("Excel local", "Lista de SharePoint"). */
  readonly nombre: string;
  /** Fase 1: sustituye el conjunto entero (importar Excel). Opcional. */
  reemplazarTodo?(paneles: readonly Panel[]): Promise<Panel[]>;
  /** Fase 1: descarta los cambios locales y vuelve al fichero. Opcional. */
  restablecer?(): Promise<Panel[]>;
}

export type { Departamento, Panel, PanelInput };
