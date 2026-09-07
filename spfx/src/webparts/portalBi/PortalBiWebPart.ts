import { Version } from '@microsoft/sp-core-library';
import { SPComponentLoader } from '@microsoft/sp-loader';
import {
  IPropertyPaneConfiguration,
  PropertyPaneCheckbox,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import * as strings from 'PortalBiWebPartStrings';

import { PortalBI } from '../../../../src/app/PortalBI';
import type { ServiciosPortal } from '../../../../src/data/ServiciosProvider';
import { IdentidadSharePoint } from '../../../../src/data/sharepoint/IdentidadSharePoint';
import { SharePointDepartamentoRepository } from '../../../../src/data/sharepoint/SharePointDepartamentoRepository';
import { SharePointPanelRepository } from '../../../../src/data/sharepoint/SharePointPanelRepository';

export interface IPortalBiWebPartProps {
  titulo: string;
  nombreLista: string;
  nombreListaDepartamentos: string;
  grupoAdministradores: string;
  departamentoPorDefecto: string;
  mostrarAdministracion: boolean;
}

const FUENTE_MONTSERRAT =
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap';

/**
 * Fase 2. El web part no duplica interfaz: monta <PortalBI /> de /src y le
 * inyecta el repositorio de SharePoint. Cambiar de Excel a la lista es cambiar
 * esta linea, no los componentes.
 */
export default class PortalBiWebPart extends BaseClientSideWebPart<IPortalBiWebPartProps> {
  protected onInit(): Promise<void> {
    // Montserrat: si el tenant bloquea Google Fonts, sustituye esta carga por
    // el paquete @fontsource-variable/montserrat empaquetado en la solucion.
    SPComponentLoader.loadCss(FUENTE_MONTSERRAT);
    return super.onInit();
  }

  public render(): void {
    // Aqui, y solo aqui, se decide de donde salen datos e identidad en la
    // intranet. La interfaz es exactamente la misma que corre en local.
    const servicios: ServiciosPortal = {
      paneles: new SharePointPanelRepository(this.context, this.properties.nombreLista || undefined),
      departamentos: new SharePointDepartamentoRepository(
        this.context,
        this.properties.nombreListaDepartamentos || undefined,
      ),
      identidad: new IdentidadSharePoint(
        this.context,
        this.properties.grupoAdministradores || undefined,
      ),
    };

    const elemento = React.createElement(PortalBI, {
      servicios,
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
                PropertyPaneTextField('nombreLista', { label: strings.EtiquetaLista }),
                PropertyPaneTextField('nombreListaDepartamentos', {
                  label: strings.EtiquetaListaAreas,
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
