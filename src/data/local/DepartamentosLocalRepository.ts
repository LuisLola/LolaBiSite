import { DEPARTAMENTOS_CONFIG } from '../../config/departamentos.config';
import type { AjustesDepartamento, DepartamentoRepository } from '../DepartamentoRepository';

const CLAVE = 'portal-bi:departamentos:v1';

function almacen(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function leerGuardados(): AjustesDepartamento[] {
  const memoria = almacen();
  if (!memoria) return [];
  try {
    const datos = JSON.parse(memoria.getItem(CLAVE) ?? '[]') as unknown;
    return Array.isArray(datos) ? (datos as AjustesDepartamento[]) : [];
  } catch {
    return [];
  }
}

/*
 * "Sin equipo" tiene que poder guardarse.
 *
 * JSON.stringify se come las claves con undefined, asi que un departamento al
 * que se le quita el equipo se guardaba sin la clave `grupo`, y al releer
 * volvia a heredar el de la configuracion: el cambio se deshacia solo al
 * recargar. Se escribe null, que si viaja, y se traduce a undefined al leer.
 */
function escribir(ajustes: readonly AjustesDepartamento[]): void {
  const memoria = almacen();
  if (!memoria) return;
  try {
    memoria.setItem(
      CLAVE,
      JSON.stringify(ajustes, (_clave, valor: unknown) => (valor === undefined ? null : valor)),
    );
  } catch {
    // Cuota llena o almacenamiento bloqueado: la sesión sigue en memoria.
  }
}

/** null en el almacen significa "puesto a vacio a proposito". */
function sinNulos(ajustes: AjustesDepartamento): AjustesDepartamento {
  const limpio = { ...ajustes } as Record<string, unknown>;
  for (const clave of Object.keys(limpio)) {
    if (limpio[clave] === null) limpio[clave] = undefined;
  }
  return limpio as unknown as AjustesDepartamento;
}

/** Los ajustes de arranque que trae departamentos.config.ts. */
function deLaConfiguracion(): AjustesDepartamento[] {
  return Object.entries(DEPARTAMENTOS_CONFIG).map(([nombre, config]) => ({
    nombre,
    ...config,
  }));
}

/**
 * Fase 1. Parte de departamentos.config.ts y guarda encima lo que se edite en
 * Administración, en localStorage. En fase 2 lo sustituye la lista de
 * SharePoint, con la misma interfaz.
 */
export class DepartamentosLocalRepository implements DepartamentoRepository {
  readonly nombre = 'Configuración local';

  private ajustes: AjustesDepartamento[] | null = null;

  async getAjustes(): Promise<AjustesDepartamento[]> {
    if (!this.ajustes) {
      const porNombre = new Map<string, AjustesDepartamento>();
      for (const base of deLaConfiguracion()) porNombre.set(base.nombre, base);
      for (const guardado of leerGuardados()) {
        porNombre.set(guardado.nombre, sinNulos({ ...porNombre.get(guardado.nombre), ...guardado }));
      }
      this.ajustes = [...porNombre.values()];
    }
    return this.ajustes;
  }

  async guardarAjustes(ajustes: AjustesDepartamento): Promise<AjustesDepartamento> {
    const actuales = await this.getAjustes();
    const indice = actuales.findIndex((a) => a.nombre === ajustes.nombre);
    const fusionado = indice >= 0 ? { ...actuales[indice], ...ajustes } : ajustes;
    const copia = [...actuales];
    if (indice >= 0) copia[indice] = fusionado;
    else copia.push(fusionado);
    this.ajustes = copia;
    escribir(copia);
    return fusionado;
  }

  async restablecer(): Promise<AjustesDepartamento[]> {
    const memoria = almacen();
    try {
      memoria?.removeItem(CLAVE);
    } catch {
      // sin efecto
    }
    this.ajustes = null;
    return this.getAjustes();
  }
}
