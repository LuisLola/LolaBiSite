/*
 * Lee y escribe la lista "Marca LC": los colores corporativos y que tema esta
 * puesto.
 *
 * Forma de la lista: UNA FILA POR TEMA y una COLUMNA POR TOKEN.
 *
 *   Title | Activo | primario | primario-texto | lienzo | ...
 *   Base  | Si     | #6f263d  | #fff6ed        | #fff6ed| ...
 *
 * Un tema solo necesita rellenar las celdas que cambian; las vacias se heredan
 * del tema Base, y lo que Base no traiga sale de src/tema/tema.ts.
 *
 * OJO con los nombres internos: SharePoint no admite guiones y codifica
 * "primario-texto" como "primario_x002d_texto". Aqui se decodifica de vuelta,
 * asi que no hace falta mantener ninguna tabla token<->columna: el nombre de la
 * columna ES el nombre del token.
 *
 * La lista vive en un sitio unico del tenant y se lee por URL absoluta, asi que
 * el mismo origen sirve a cualquier sitio donde se incruste el portal.
 *
 * Excluido del build de Vite, igual que el resto de /sharepoint.
 */
import { spfi, SPFx, type SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { NOMBRE_LISTA_MARCA, URL_SITIO_MARCA } from '../../config/tenant.config';
import {
  MARCA_VACIA,
  TEMA_BASE,
  TOKENS,
  type Marca,
  type ServicioMarca,
  type Tema,
} from '../../tema/tema';

/** Columna que marca el tema puesto. */
const CAMPO_ACTIVO = 'Activo';

const ES_TOKEN = new Set<string>(TOKENS as readonly string[]);

/** "primario_x002d_texto" -> "primario-texto" */
function tokenDeColumna(interno: string): string {
  return interno.replace(/_x002d_/gi, '-');
}

/** "primario-texto" -> "primario_x002d_texto" */
export function columnaDeToken(token: string): string {
  return token.replace(/-/g, '_x002d_');
}

interface FilaTema {
  Id: number;
  Title: string;
  [columna: string]: unknown;
}

export class MarcaRepository implements ServicioMarca {
  private readonly sp: SPFI;
  private readonly lista: string;

  constructor(
    contextoSpfx: Parameters<typeof SPFx>[0],
    nombreLista: string = NOMBRE_LISTA_MARCA,
    urlSitio: string = URL_SITIO_MARCA,
  ) {
    this.sp = spfi(urlSitio).using(SPFx(contextoSpfx));
    this.lista = nombreLista;
  }

  /**
   * Devuelve los temas y cual esta activo. El saneado y el merge con los
   * valores del paquete los hace resolverMarca(); aqui no se valida nada.
   */
  async leer(): Promise<Marca> {
    try {
      // select('*') para no tener que enumerar las columnas: cada token nuevo
      // es una columna mas y esto la coge sola.
      const filas: FilaTema[] = await this.items().select('*').top(200)();

      const marca: Marca = { activo: TEMA_BASE, temas: {} };
      for (const fila of filas) {
        const nombre = String(fila.Title ?? '').trim();
        if (!nombre) continue;

        const valores: Record<string, string> = {};
        for (const columna of Object.keys(fila)) {
          const token = tokenDeColumna(columna);
          if (!ES_TOKEN.has(token)) continue;
          const valor = String(fila[columna] ?? '').trim();
          // Celda vacia = "usa el valor de abajo", no "sin color".
          if (valor) valores[token] = valor;
        }

        marca.temas[nombre] = valores as Partial<Tema>;
        if (fila[CAMPO_ACTIVO] === true) marca.activo = nombre;
      }
      return marca;
    } catch (error) {
      // Si la lista no existe o no hay permiso, se usan los valores del paquete.
      console.error(`[Portal BI] No se ha podido leer la lista "${this.lista}"`, error);
      return MARCA_VACIA;
    }
  }

  /**
   * Cambia el tema activo para todo el mundo: marca su fila y desmarca el
   * resto. Lo llama la pantalla de administracion; requiere permiso de
   * escritura en la lista.
   */
  async guardarTemaActivo(tema: string): Promise<void> {
    const filas: FilaTema[] = await this.items().select('Id', 'Title', CAMPO_ACTIVO).top(200)();

    for (const fila of filas) {
      const debeEstarActivo = String(fila.Title ?? '').trim() === tema;
      if ((fila[CAMPO_ACTIVO] === true) === debeEstarActivo) continue;
      await this.items().getById(fila.Id).update({ [CAMPO_ACTIVO]: debeEstarActivo });
    }
  }

  private items() {
    return this.sp.web.lists.getByTitle(this.lista).items;
  }
}
