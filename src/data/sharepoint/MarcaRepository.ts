/*
 * Lee y escribe la lista "Marca LC": los colores corporativos y que tema esta
 * puesto.
 *
 * Es una lista clave/valor con una columna "Tema" a proposito: digitalizacion
 * edita una celda y lo ve con F5, sin JSON que romper con una coma y sin sesion
 * de PowerShell. Cada tema declara SOLO lo que cambia y hereda del tema Base,
 * asi que un tema nuevo son una o dos filas, no treinta.
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
  TOKEN_TEMA_ACTIVO,
  type Marca,
  type ServicioMarca,
} from '../../tema/tema';

interface FilaMarca {
  Id: number;
  Title: string;
  Valor?: string | null;
  Tema?: string | null;
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
      const filas: FilaMarca[] = await this.items().select('Id', 'Title', 'Valor', 'Tema').top(500)();

      const marca: Marca = { activo: TEMA_BASE, temas: {} };
      for (const fila of filas) {
        const clave = String(fila.Title ?? '').trim();
        const valor = String(fila.Valor ?? '').trim();
        if (!clave || !valor) continue;

        if (clave === TOKEN_TEMA_ACTIVO) {
          marca.activo = valor;
          continue;
        }

        // Sin columna Tema (o vacia) la fila pertenece al tema Base: asi la
        // lista que ya existia sigue funcionando sin tocar ni una fila.
        const tema = String(fila.Tema ?? '').trim() || TEMA_BASE;
        const valores = marca.temas[tema] ?? {};
        (valores as Record<string, string>)[clave] = valor;
        marca.temas[tema] = valores;
      }
      return marca;
    } catch (error) {
      // Si la lista no existe o no hay permiso, se usan los valores del paquete.
      console.error(`[Portal BI] No se ha podido leer la lista "${this.lista}"`, error);
      return MARCA_VACIA;
    }
  }

  /**
   * Cambia el tema activo para todo el mundo. Lo llama la pantalla de
   * administracion; requiere permiso de escritura en la lista.
   */
  async guardarTemaActivo(tema: string): Promise<void> {
    const filas: FilaMarca[] = await this.items()
      .select('Id')
      .filter(`Title eq '${TOKEN_TEMA_ACTIVO}'`)
      .top(1)();

    const fila = filas[0];
    if (fila) await this.items().getById(fila.Id).update({ Valor: tema });
    else {
      await this.items().add({
        Title: TOKEN_TEMA_ACTIVO,
        Valor: tema,
        Nota: 'Tema del portal. Lo cambia Administracion; no es un color.',
      });
    }
  }

  private items() {
    return this.sp.web.lists.getByTitle(this.lista).items;
  }
}
