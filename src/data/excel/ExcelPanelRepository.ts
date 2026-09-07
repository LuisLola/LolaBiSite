import { derivarDepartamentos } from '../../domain/departamentos';
import { ordenarPaneles, siguienteOrden } from '../../domain/paneles';
import type { Departamento, Panel, PanelInput } from '../../domain/types';
import type { PanelRepository } from '../PanelRepository';
import { borrarPanelesGuardados, guardarPaneles, leerPanelesGuardados } from './almacenLocal';
import { filasDeLibro } from './libroExcel';
import { aplicarEdicion, completarPanel, filasAPaneles, nuevoId, type FilaExcel } from './mapeo';
import panelesUrl from '../paneles.xlsx?url';
import semilla from '../paneles.json';

/**
 * Fase 1. Lee src/data/paneles.xlsx (o paneles.json como respaldo), guarda en
 * memoria + localStorage y no hace ni una llamada de red a Microsoft 365.
 */
export class ExcelPanelRepository implements PanelRepository {
  readonly nombre = 'Excel local';

  private paneles: Panel[] | null = null;
  private cargando: Promise<Panel[]> | null = null;

  /** Cabeceras del fichero que el mapeo no ha usado (ruido del export). */
  columnasIgnoradas: string[] = [];
  /** De donde salieron los datos que hay ahora en memoria. */
  origen: 'excel' | 'json' | 'localStorage' | 'importado' = 'excel';

  async getPaneles(): Promise<Panel[]> {
    const paneles = await this.asegurarCarga();
    return ordenarPaneles(paneles);
  }

  async getDepartamentos(): Promise<Departamento[]> {
    const paneles = await this.asegurarCarga();
    return derivarDepartamentos(paneles);
  }

  async createPanel(entrada: PanelInput): Promise<Panel> {
    const paneles = await this.asegurarCarga();
    const ahora = new Date().toISOString();
    const panel = completarPanel({
      ...entrada,
      id: nuevoId(),
      orden: entrada.orden || siguienteOrden(paneles, entrada.departamento),
      creado: ahora,
      modificado: ahora,
    });
    this.persistir([...paneles, panel]);
    return panel;
  }

  async updatePanel(id: string, cambios: Partial<PanelInput>): Promise<Panel> {
    const paneles = await this.asegurarCarga();
    const indice = paneles.findIndex((p) => p.id === id);
    if (indice < 0) throw new Error(`No existe el panel ${id}`);
    const actualizado = aplicarEdicion(paneles[indice]!, cambios);
    const copia = [...paneles];
    copia[indice] = actualizado;
    this.persistir(copia);
    return actualizado;
  }

  /** Borrado logico. */
  async deletePanel(id: string): Promise<void> {
    await this.updatePanel(id, { estado: 'Retirado' });
  }

  /** Importar Excel: sustituye el conjunto entero. */
  async reemplazarTodo(paneles: readonly Panel[]): Promise<Panel[]> {
    this.origen = 'importado';
    this.persistir([...paneles]);
    return ordenarPaneles(this.paneles ?? []);
  }

  /** Descarta los cambios locales y vuelve a leer el fichero del proyecto. */
  async restablecer(): Promise<Panel[]> {
    borrarPanelesGuardados();
    this.paneles = null;
    this.cargando = null;
    return this.getPaneles();
  }

  private persistir(paneles: Panel[]): void {
    this.paneles = paneles;
    guardarPaneles(paneles);
  }

  private asegurarCarga(): Promise<Panel[]> {
    if (this.paneles) return Promise.resolve(this.paneles);
    if (!this.cargando) this.cargando = this.cargar();
    return this.cargando;
  }

  private async cargar(): Promise<Panel[]> {
    const guardados = leerPanelesGuardados();
    if (guardados && guardados.length > 0) {
      this.origen = 'localStorage';
      this.paneles = guardados.map((panel) => completarPanel(panel));
      return this.paneles;
    }

    let filas: FilaExcel[] = [];
    try {
      const respuesta = await fetch(panelesUrl);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      filas = await filasDeLibro(await respuesta.arrayBuffer());
      this.origen = 'excel';
    } catch {
      filas = semilla as FilaExcel[];
      this.origen = 'json';
    }

    if (filas.length === 0) {
      filas = semilla as FilaExcel[];
      this.origen = 'json';
    }

    const resultado = filasAPaneles(filas);
    this.columnasIgnoradas = resultado.columnasIgnoradas;
    this.paneles = resultado.paneles;
    return this.paneles;
  }
}
