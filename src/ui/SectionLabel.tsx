import type { ReactNode } from 'react';
import estilos from './SectionLabel.module.css';
import { cx } from './cx';

export interface SectionLabelProps {
  children: ReactNode;
  sobreBurdeos?: boolean;
  conMargen?: boolean;
  className?: string;
  id?: string;
}

/** Etiqueta de seccion: 10px/800, mayusculas, muy espaciada. */
export function SectionLabel({ children, sobreBurdeos, conMargen, className, id }: SectionLabelProps) {
  return (
    <span
      id={id}
      className={cx(estilos.etiqueta, sobreBurdeos && estilos.sobreBurdeos, conMargen && estilos.conMargen, className)}
    >
      {children}
    </span>
  );
}
