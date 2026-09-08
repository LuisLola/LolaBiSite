/*
 * Boton "Paneles BI" en la barra superior de cualquier sitio del tenant. Abre el
 * portal en un modal (iframe a su propia pagina), asi que este bundle NO lleva
 * el portal dentro: se ejecuta en todas las paginas y tiene que pesar poco.
 */
import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName,
} from '@microsoft/sp-application-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import * as strings from 'BotonPortalBiStrings';

import { URL_PAGINA_PORTAL, URL_SITIO_PORTAL } from '../../compartido/config/tenant.config';
import { PortalEnModal } from '../../compartido/ui/PortalEnModal';

const ORIGEN = 'BotonPortalBi';

export interface IBotonPortalBiProperties {
  /** Pagina del portal. Vacio = URL_PAGINA_PORTAL. */
  urlPortal?: string;
  /** Texto del boton. */
  etiqueta?: string;
}

export default class BotonPortalBiApplicationCustomizer extends BaseApplicationCustomizer<IBotonPortalBiProperties> {
  private hueco?: PlaceholderContent;

  public onInit(): Promise<void> {
    const web = this.context.pageContext.web.absoluteUrl.toLowerCase();
    // En el propio sitio del portal el boton no aporta nada.
    if (web.indexOf(URL_SITIO_PORTAL.toLowerCase()) === 0) return Promise.resolve();

    this.hueco = this.context.placeholderProvider.tryCreateContent(PlaceholderName.Top, {
      onDispose: () => this.limpiar(),
    });
    if (!this.hueco || !this.hueco.domElement) {
      Log.info(ORIGEN, 'El placeholder Top no esta disponible en esta pagina.');
      return Promise.resolve();
    }

    ReactDom.render(
      React.createElement(PortalEnModal, {
        urlPortal: this.properties.urlPortal || URL_PAGINA_PORTAL,
        etiqueta: this.properties.etiqueta || strings.Etiqueta,
        titulo: strings.Titulo,
      }),
      this.hueco.domElement,
    );
    return Promise.resolve();
  }

  protected onDispose(): void {
    this.limpiar();
  }

  private limpiar(): void {
    if (this.hueco && this.hueco.domElement) {
      ReactDom.unmountComponentAtNode(this.hueco.domElement);
    }
  }
}
