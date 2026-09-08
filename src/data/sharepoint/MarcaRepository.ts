/*
 * Lee los colores corporativos de la lista "Marca LC".
 *
 * Es una lista clave/valor a proposito: digitalizacion edita una celda y lo ve
 * con F5, sin JSON que romper con una coma y sin sesion de PowerShell. La lista
 * vive en un sitio unico del tenant y se lee por URL absoluta, asi que el mismo
 * origen sirve a cualquier sitio donde se incruste el portal.
 *
 * Excluido del build de Vite, igual que el resto de /sharepoint.
 */
import { spfi, SPFx, type SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { NOMBRE_LISTA_MARCA, URL_SITIO_MARCA } from '../../config/tenant.config';
import type { Tema } from '../../tema/tema';

interface FilaMarca {
  Title: string;
  Valor?: string | null;
}

export class MarcaRepository {
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
   * Devuelve solo las claves con valor. El saneado y el merge con los valores
   * por defecto los hace resolverTema(); aqui no se valida nada.
   */
  async getMarca(): Promise<Partial<Tema>> {
    try {
      const filas: FilaMarca[] = await this.sp.web.lists
        .getByTitle(this.lista)
        .items.select('Title', 'Valor')
        .top(200)();

      const marca: Record<string, string> = {};
      for (const fila of filas) {
        const clave = String(fila.Title ?? '').trim();
        const valor = String(fila.Valor ?? '').trim();
        if (clave && valor) marca[clave] = valor;
      }
      return marca as Partial<Tema>;
    } catch (error) {
      // Si la lista no existe o no hay permiso, se usan los valores del paquete.
      console.error(`[Portal BI] No se ha podido leer la lista "${this.lista}"`, error);
      return {};
    }
  }
}
