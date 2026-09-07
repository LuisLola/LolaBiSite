import { Navigate, Route, Routes } from 'react-router-dom';
import { useAcceso } from '../hooks/useAcceso';
import { Layout } from '../layout/Layout';
import { AccesosPage } from '../pages/Admin/AccesosPage';
import { AdminPage } from '../pages/Admin/AdminPage';
import { DepartamentoPage } from '../pages/Departamento/DepartamentoPage';
import { HubPage } from '../pages/Hub/HubPage';
import { PanelViewPage } from '../pages/Panel/PanelViewPage';
import { useConfiguracion } from './configuracion';

export function Rutas() {
  const { mostrarAdministracion } = useConfiguracion();
  const { esAdministrador, cargando } = useAcceso();
  // Administracion solo para quien la tiene concedida. Mientras se resuelve la
  // identidad no se decide nada, para no expulsar a un administrador.
  const admin = mostrarAdministracion && (cargando || esAdministrador);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HubPage />} />
        <Route path="/departamento/:slug" element={<DepartamentoPage />} />
        <Route path="/admin" element={admin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="/admin/accesos" element={admin ? <AccesosPage /> : <Navigate to="/" replace />} />
      </Route>
      <Route path="/panel/:id" element={<PanelViewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
