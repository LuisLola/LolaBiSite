import { Search } from 'lucide-react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef, useState } from 'react';
import estilos from './Campos.module.css';
import { cx } from './cx';

export interface CampoProps {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: (idControl: string) => ReactNode;
}

let contadorIds = 0;

/** Id estable por instancia. React 17 (SPFx) todavia no tiene useId. */
function useIdCampo(): string {
  const [id] = useState(() => {
    contadorIds += 1;
    return `campo-${contadorIds}`;
  });
  return id;
}

export function Campo({ etiqueta, ayuda, error, children }: CampoProps) {
  const id = useIdCampo();
  return (
    <div className={estilos.campo}>
      <label className={estilos.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      {children(id)}
      {error ? <span className={estilos.mensajeError}>{error}</span> : null}
      {!error && ayuda ? <span className={estilos.ayuda}>{ayuda}</span> : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  url?: boolean;
  enLinea?: boolean;
}

export function Input({ error, url, enLinea, className, ...resto }: InputProps) {
  return (
    <input
      className={cx(estilos.control, url && estilos.monoUrl, enLinea && estilos.controlEnLinea, error && estilos.error, className)}
      {...resto}
    />
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...resto }: TextareaProps) {
  return <textarea className={cx(estilos.control, estilos.textarea, error && estilos.error, className)} {...resto} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  enLinea?: boolean;
}

export function Select({ error, enLinea, className, children, ...resto }: SelectProps) {
  return (
    <select
      className={cx(estilos.control, enLinea && estilos.controlEnLinea, error && estilos.error, className)}
      {...resto}
    >
      {children}
    </select>
  );
}

export interface CasillaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  etiqueta: string;
}

export function Casilla({ etiqueta, className, ...resto }: CasillaProps) {
  return (
    <label className={cx(estilos.casilla, className)}>
      <input type="checkbox" {...resto} />
      {etiqueta}
    </label>
  );
}

export interface BuscadorProps extends InputHTMLAttributes<HTMLInputElement> {
  etiquetaAccesible: string;
}

export const Buscador = forwardRef<HTMLInputElement, BuscadorProps>(function Buscador(
  { etiquetaAccesible, className, ...resto },
  ref,
) {
  return (
    <div className={cx(estilos.buscador, className)}>
      <span className={estilos.buscadorIcono}>
        <Search size={15} strokeWidth={1.5} />
      </span>
      <input
        ref={ref}
        type="search"
        aria-label={etiquetaAccesible}
        className={cx(estilos.control, estilos.buscadorControl)}
        {...resto}
      />
    </div>
  );
});

export function FilaCampos({ children }: { children: ReactNode }) {
  return <div className={estilos.enLinea}>{children}</div>;
}

export const estilosCampos = estilos;
