import { Version } from '@microsoft/sp-core-library';
import { SPComponentLoader } from '@microsoft/sp-loader';
import {
  IPropertyPaneConfiguration,
  PropertyPaneCheckbox,
  PropertyPaneChoiceGroup,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import * as strings from 'PortalBiWebPartStrings';

import { PortalBI } from '../../compartido/app/PortalBI';
import { URL_PAGINA_PORTAL, URL_SITIO_PORTAL } from '../../compartido/config/tenant.config';
import type { ServiciosPortal } from '../../compartido/data/ServiciosProvider';
import { IdentidadSharePoint } from '../../compartido/data/sharepoint/IdentidadSharePoint';
import { MarcaRepository } from '../../compartido/data/sharepoint/MarcaRepository';
import { SharePointDepartamentoRepository } from '../../compartido/data/sharepoint/SharePointDepartamentoRepository';
import { SharePointPanelRepository } from '../../compartido/data/sharepoint/SharePointPanelRepository';
import type { Tema } from '../../compartido/tema/tema';
import { PortalEnModal } from '../../compartido/ui/PortalEnModal';

export interface IPortalBiWebPartProps {
  titulo: string;
  nombreLista: string;
  nombreListaDepartamentos: string;
  /** Sitio donde viven las listas. Vacio = URL_SITIO_PORTAL. */
  urlSitio: string;
  grupoAdministradores: string;
  departamentoPorDefecto: string;
  mostrarAdministracion: boolean;
  /** 'inline' ocupa la pagina; 'boton' abre el portal en un modal. */
  modo: 'inline' | 'boton';
  textoBoton: string;
}

const FUENTE_MONTSERRAT =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap';

/**
 * Fase 2. El web part no duplica interfaz: monta <PortalBI /> de /src y le
 * inyecta el repositorio de SharePoint. Cambiar de Excel a la lista es cambiar
 * esta linea, no los componentes.
 */
export default class PortalBiWebPart extends BaseClientSideWebPart<IPortalBiWebPartProps> {
  private servicios?: ServiciosPortal;
  private claveServicios = '';
  private cargarMarca?: () => Promise<Partial<Tema>>;

  protected onInit(): Promise<void> {
    // Montserrat: si el tenant bloquea Google Fonts, sustituye esta carga por
    // el paquete @fontsource-variable/montserrat empaquetado en la solucion.
    SPComponentLoader.loadCss(FUENTE_MONTSERRAT);
    return super.onInit();
  }

  /**
   * Aqui, y solo aqui, se decide de donde salen datos e identidad en la
   * intranet. La interfaz es exactamente la misma que corre en local.
   *
   * Memoizado porque SPFx llama a render() en cada cambio del panel de
   * propiedades: sin esto, cada pulsacion de tecla crea un SPFI nuevo y
   * dispara una relectura completa de la lista.
   */
  private obtenerServicios(): ServiciosPortal {
    const { nombreLista, nombreListaDepartamentos, grupoAdministradores, urlSitio } = this.properties;
    const clave = [nombreLista, nombreListaDepartamentos, grupoAdministradores, urlSitio].join('|');
    if (this.servicios && this.claveServicios === clave) return this.servicios;

    const sitio = urlSitio || URL_SITIO_PORTAL;
    this.servicios = {
      paneles: new SharePointPanelRepository(this.context, nombreLista || undefined, sitio),
      departamentos: new SharePointDepartamentoRepository(
        this.context,
        nombreListaDepartamentos || undefined,
        sitio,
      ),
      identidad: new IdentidadSharePoint(this.context, grupoAdministradores || undefined),
    };
    this.claveServicios = clave;
    return this.servicios;
  }

  public render(): void {
    // Modo boton: no se monta el portal aqui, se abre su propia pagina en un
    // iframe. Ver el comentario de cabecera de PortalEnModal.
    if (this.properties.modo === 'boton') {
      ReactDom.render(
        React.createElement(PortalEnModal, {
          urlPortal: URL_PAGINA_PORTAL,
          etiqueta: this.properties.textoBoton || undefined,
          titulo: this.properties.titulo || undefined,
        }),
        this.domElement,
      );
      return;
    }

    // Estable entre renders: si cambiara de identidad, useTema releeria la
    // lista de marca en cada cambio del panel de propiedades.
    if (!this.cargarMarca) {
      const marca = new MarcaRepository(this.context);
      this.cargarMarca = () => marca.getMarca();
    }

    const elemento = React.createElement(PortalBI, {
      servicios: this.obtenerServicios(),
      cargarMarca: this.cargarMarca,
      titulo: this.properties.titulo || 'Portal BI',
      departamentoPorDefecto: this.properties.departamentoPorDefecto || undefined,
      mostrarAdministracion: this.properties.mostrarAdministracion !== false,
    });

    ReactDom.render(elemento, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.PropiedadesDescripcion },
          groups: [
            {
              groupName: strings.GrupoBasico,
              groupFields: [
                PropertyPaneTextField('titulo', { label: strings.EtiquetaTitulo }),
                PropertyPaneChoiceGroup('modo', {
                  label: strings.EtiquetaModo,
                  options: [
                    { key: 'inline', text: strings.ModoInline },
                    { key: 'boton', text: strings.ModoBoton },
                  ],
                }),
                PropertyPaneTextField('textoBoton', {
                  label: strings.EtiquetaTextoBoton,
                  description: strings.AyudaModo,
                }),
                PropertyPaneTextField('nombreLista', { label: strings.EtiquetaLista }),
                PropertyPaneTextField('nombreListaDepartamentos', {
                  label: strings.EtiquetaListaAreas,
                }),
                PropertyPaneTextField('urlSitio', {
                  label: strings.EtiquetaUrlSitio,
                  description: strings.AyudaUrlSitio,
                }),
                PropertyPaneTextField('grupoAdministradores', {
                  label: strings.EtiquetaGrupoAdmin,
                  description: strings.AyudaGrupoAdmin,
                }),
                PropertyPaneTextField('departamentoPorDefecto', {
                  label: strings.EtiquetaDepartamento,
                  description: strings.AyudaDepartamento,
                }),
                PropertyPaneCheckbox('mostrarAdministracion', {
                  text: strings.EtiquetaAdministracion,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
