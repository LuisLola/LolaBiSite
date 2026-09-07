import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import estilos from './Button.module.css';
import { cx } from './cx';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro';

const CLASE_VARIANTE: Record<Variante, string | undefined> = {
  primario: estilos.primario,
  secundario: estilos.secundario,
  fantasma: estilos.fantasma,
  peligro: estilos.peligro,
};

interface Comun {
  variante?: Variante;
  pequeno?: boolean;
  soloIcono?: boolean;
  anchoCompleto?: boolean;
  children?: ReactNode;
}

function clases({ variante = 'secundario', pequeno, soloIcono, anchoCompleto }: Comun, extra?: string) {
  return cx(
    estilos.boton,
    CLASE_VARIANTE[variante],
    pequeno && estilos.pequeno,
    soloIcono && estilos.icono,
    anchoCompleto && estilos.anchoCompleto,
    extra,
  );
}

export type ButtonProps = Comun & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variante, pequeno, soloIcono, anchoCompleto, className, type = 'button', ...resto }: ButtonProps) {
  return <button type={type} className={clases({ variante, pequeno, soloIcono, anchoCompleto }, className)} {...resto} />;
}

export type BotonEnlaceProps = Comun &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { a: string; externo?: boolean };

export function BotonEnlace({
  a,
  externo,
  variante,
  pequeno,
  soloIcono,
  anchoCompleto,
  className,
  children,
  ...resto
}: BotonEnlaceProps) {
  const clase = clases({ variante, pequeno, soloIcono, anchoCompleto }, className);
  if (externo) {
    return (
      <a className={clase} href={a} target="_blank" rel="noreferrer" {...resto}>
        {children}
      </a>
    );
  }
  return (
    <Link className={clase} to={a} {...resto}>
      {children}
    </Link>
  );
}
