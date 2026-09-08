/*
 * Engranaje de "Editar site", igual que en el resto de la intranet.
 *
 * Son paginas propias de SharePoint, no del portal, asi que van como enlaces
 * externos y se abren en otra pestana. Solo se muestra a quien administra: para
 * el resto son enlaces a los que no tiene acceso.
 */
import { Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { URL_SITIO_PORTAL } from '../config/tenant.config';
import estilos from './MenuSitio.module.css';

const OPCIONES = [
  { etiqueta: 'Contenidos del sitio', ruta: '/_layouts/15/viewlsts.aspx' },
  { etiqueta: 'Permisos del sitio', ruta: '/_layouts/15/user.aspx' },
  { etiqueta: 'Configuración del sitio', ruta: '/_layouts/15/settings.aspx' },
];

export function MenuSitio() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierto]);

  return (
    <div className={estilos.contenedor} ref={contenedor}>
      <button
        type="button"
        className={estilos.boton}
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Editar site"
        title="Editar site"
      >
        <Settings size={16} strokeWidth={1.75} />
      </button>

      {abierto ? (
        <div className={estilos.menu} role="menu">
          <span className={estilos.titulo}>Editar site</span>
          {OPCIONES.map((opcion) => (
            <a
              key={opcion.ruta}
              className={estilos.opcion}
              role="menuitem"
              href={`${URL_SITIO_PORTAL}${opcion.ruta}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setAbierto(false)}
            >
              {opcion.etiqueta}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
