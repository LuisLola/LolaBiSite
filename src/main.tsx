import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortalBI } from './app/PortalBI';
import '@fontsource-variable/roboto-flex';
import { ExcelPanelRepository } from './data/excel/ExcelPanelRepository';
import { IdentidadSimulada } from './data/identidad/IdentidadSimulada';
import { DepartamentosLocalRepository } from './data/local/DepartamentosLocalRepository';
import type { ServiciosPortal } from './data/ServiciosProvider';

/**
 * Arranque local (Vite). Aqui, y solo aqui, se decide el origen de datos de la
 * fase 1. El web part de SPFx hace lo mismo con SharePointPanelRepository.
 */
const origen = import.meta.env.VITE_DATA_SOURCE ?? 'excel';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('No existe #root');

if (origen === 'sharepoint') {
  contenedor.innerHTML =
    '<p style="font-family:sans-serif;padding:32px;max-width:60ch">' +
    'VITE_DATA_SOURCE=sharepoint solo funciona dentro del web part de SPFx, que es quien aporta ' +
    'el contexto autenticado. Para trabajar en local pon VITE_DATA_SOURCE=excel en el .env.' +
    '</p>';
} else {
  const servicios: ServiciosPortal = {
    paneles: new ExcelPanelRepository(),
    departamentos: new DepartamentosLocalRepository(),
    identidad: new IdentidadSimulada(),
  };

  createRoot(contenedor).render(
    <StrictMode>
      <PortalBI servicios={servicios} />
    </StrictMode>,
  );
}
