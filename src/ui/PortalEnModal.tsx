/*
 * Boton que abre el portal en un modal a pantalla casi completa, sobre
 * cualquier pagina de SharePoint.
 *
 * El portal se carga en un <iframe> a su propia pagina, no montando <PortalBI />
 * aqui, por tres razones concretas:
 *  - global.css pinta body y style-loader lo inyecta en el head de la pagina
 *    anfitriona: montarlo en proceso repinta esa pagina.
 *  - PortalBI usa HashRouter sin basename; dos instancias en la misma pagina
 *    se pelean por window.location.hash.
 *  - un bundle con el portal dentro se descargaria en TODAS las paginas del
 *    tenant, porque el Application Customizer se ejecuta siempre.
 *
 * Por eso este fichero no importa nada de /src salvo cx y sus estilos: es lo
 * unico que viaja en el bundle de la extension.
 */
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import estilos from './PortalEnModal.module.css';
import './tokens.css';

export interface PortalEnModalProps {
  /** Pagina del portal, absoluta. */
  urlPortal: string;
  /** Texto del boton. */
  etiqueta?: string;
  /** Titulo de la cabecera del modal. */
  titulo?: string;
}

export function PortalEnModal({ urlPortal, etiqueta = 'Paneles BI', titulo = 'Portal BI' }: PortalEnModalProps) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  // env=Embedded quita la barra de suite y la navegacion de la pagina moderna.
  const separador = urlPortal.indexOf('?') === -1 ? '?' : '&';
  const src = `${urlPortal}${separador}env=Embedded`;

  return (
    // portalBiTokens: sin el, el boton se renderiza fuera del portal (en la barra
    // de SharePoint) y no resolveria ninguna variable del tema.
    <span className="portalBiTokens">
      <button type="button" className={estilos.boton} onClick={() => setAbierto(true)}>
        {etiqueta}
      </button>

      {abierto
        ? createPortal(
            <div className="portalBiTokens">
              <div
                className={estilos.fondo}
                role="presentation"
                onMouseDown={(evento) => {
                  if (evento.target === evento.currentTarget) setAbierto(false);
                }}
              >
                <div className={estilos.marco} role="dialog" aria-modal="true" aria-label={titulo}>
                  <div className={estilos.cabecera}>
                    <span className={estilos.titulo}>{titulo}</span>
                    <button
                      type="button"
                      className={estilos.cerrar}
                      onClick={() => setAbierto(false)}
                      aria-label="Cerrar"
                    >
                      <X size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <iframe src={src} title={titulo} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
