import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import estilos from './Modal.module.css';
import { cx } from './cx';

export interface ModalProps {
  titulo: string;
  subtitulo?: string;
  estrecho?: boolean;
  alCerrar: () => void;
  pie?: ReactNode;
  children: ReactNode;
}

export function Modal({ titulo, subtitulo, estrecho, alCerrar, pie, children }: ModalProps) {
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    dialogo.current?.focus();
    return () => document.removeEventListener('keydown', alPulsar);
  }, [alCerrar]);

  return (
    <div
      className={estilos.fondo}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar();
      }}
    >
      <div
        className={cx(estilos.dialogo, estrecho && estilos.estrecho)}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        ref={dialogo}
      >
        <div className={estilos.cabecera}>
          <div>
            <h2 className={estilos.titulo}>{titulo}</h2>
            {subtitulo ? <p className={estilos.subtitulo}>{subtitulo}</p> : null}
          </div>
          <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar">
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
        {children}
        {pie ? <div className={estilos.pie}>{pie}</div> : null}
      </div>
    </div>
  );
}
