import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { slugDepartamento } from '../../config/departamentos.config';
import { urlDirectaEfectiva, urlIframe } from '../../domain/panelUrls';
import { useAcceso } from '../../hooks/useAcceso';
import { usePanel } from '../../hooks/usePaneles';
import { useRecientes } from '../../hooks/useRecientes';
import { Badge } from '../../ui/Badge';
import { BotonEnlace } from '../../ui/Button';
import { Card, CardTitulo } from '../../ui/Card';
import { cx } from '../../ui/cx';
import estilos from './PanelViewPage.module.css';

/** Un solo informe incrustado por vista. */
export function PanelViewPage() {
  const { id } = useParams();
  const { panel: encontrado, cargando } = usePanel(id);
  const { puedeVerPanel } = useAcceso();
  const { registrar } = useRecientes();

  // Si no es de tus equipos, para ti no existe.
  const panel = encontrado && puedeVerPanel(encontrado) ? encontrado : undefined;

  useEffect(() => {
    if (panel) registrar(panel.id);
  }, [panel, registrar]);

  if (!panel) {
    return (
      <div className={cx(estilos.pantalla, 'portalBiRaiz')}>
        <div className={estilos.mensaje}>
          <Card>
            <CardTitulo>{cargando ? 'Cargando…' : 'Ese panel no existe'}</CardTitulo>
            <p className={estilos.mensajeTexto}>
              <Link to="/">Volver a la portada</Link>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cx(estilos.pantalla, 'portalBiRaiz')}>
      <header className={estilos.cabecera}>
        <BotonEnlace a={`/departamento/${slugDepartamento(panel.departamento)}`} variante="secundario" pequeno>
          <ArrowLeft size={13} strokeWidth={1.75} />
          {panel.departamento}
        </BotonEnlace>
        <div className={estilos.textos}>
          <div className={estilos.titulo}>{panel.nombre}</div>
          <div className={estilos.meta}>
            {panel.descripcion ?? 'Sin descripción'}
            {panel.horaActualizacion ? ` · actualiza ${panel.horaActualizacion}` : ''}
          </div>
        </div>
        <div className={estilos.acciones}>
          {panel.estado === 'Activo' ? null : <Badge tono="pruebas">{panel.estado}</Badge>}
          <BotonEnlace a={urlDirectaEfectiva(panel)} externo variante="primario" pequeno>
            Abrir en Power BI
            <ArrowUpRight size={13} strokeWidth={1.75} />
          </BotonEnlace>
        </div>
      </header>

      <p className={estilos.nota}>
        La incrustación pide inicio de sesión de Microsoft: si el marco sale en blanco, abre el
        panel en Power BI con el botón de arriba.
      </p>
      <div className={estilos.marco}>
        <iframe className={estilos.iframe} title={panel.nombre} src={urlIframe(panel)} allowFullScreen />
      </div>
    </div>
  );
}
