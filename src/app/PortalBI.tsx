import { useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import { AjustesDepartamentoProvider } from '../data/estadoDepartamentos';
import { EstadoPanelesProvider } from '../data/estadoPaneles';
import { ServiciosProvider, type ServiciosPortal } from '../data/ServiciosProvider';
import { AccesoProvider } from '../hooks/useAcceso';
import { useTema, type CargarMarca } from '../tema/useTema';
import '../ui/tokens.global.css';
import '../ui/base.global.css';
import { Rutas } from './Rutas';
import { ConfiguracionProvider, type ConfiguracionPortal } from './configuracion';

export interface PortalBIProps extends Partial<ConfiguracionPortal> {
  /** Datos e identidad. Los elige el arranque, no los componentes. */
  servicios: ServiciosPortal;
  /**
   * Colores corporativos editables sin recompilar. En local no se pasa y se
   * usan los valores de src/tema/tema.ts.
   */
  cargarMarca?: CargarMarca;
}

/**
 * Raíz compartida. La monta igual src/main.tsx (Vite, Excel + identidad
 * simulada) que el web part de SPFx (lista de SharePoint + equipos de Teams
 * reales): lo único que cambia son los servicios que recibe.
 */
export function PortalBI({ servicios, cargarMarca, ...configuracion }: PortalBIProps) {
  useTema(cargarMarca);

  const valorConfiguracion = useMemo(
    () => ({ origenDatos: servicios.paneles.nombre, ...configuracion }),
    [servicios.paneles.nombre, configuracion],
  );

  return (
    <ServiciosProvider servicios={servicios}>
      <EstadoPanelesProvider>
        <AjustesDepartamentoProvider>
          <AccesoProvider>
            <ConfiguracionProvider valor={valorConfiguracion}>
              <HashRouter>
                <Rutas />
              </HashRouter>
            </ConfiguracionProvider>
          </AccesoProvider>
        </AjustesDepartamentoProvider>
      </EstadoPanelesProvider>
    </ServiciosProvider>
  );
}
