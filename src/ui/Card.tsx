import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import estilos from './Card.module.css';
import { cx } from './cx';

type Variante = 'normal' | 'burdeos' | 'doc' | 'atenuada';

const CLASE_VARIANTE: Record<Variante, string | undefined> = {
  normal: undefined,
  burdeos: estilos.burdeos,
  doc: estilos.doc,
  atenuada: estilos.atenuada,
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variante?: Variante;
  compacta?: boolean;
  sinRelleno?: boolean;
  children?: ReactNode;
}

export function Card({ variante = 'normal', compacta, sinRelleno, className, children, ...resto }: CardProps) {
  const clases = cx(
    estilos.tarjeta,
    CLASE_VARIANTE[variante],
    compacta && estilos.compacta,
    sinRelleno && estilos.sinRelleno,
    className,
  );
  return (
    <div className={clases} {...resto}>
      {children}
    </div>
  );
}

export interface CardEnlaceProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  a: string;
  externo?: boolean;
  variante?: Variante;
  compacta?: boolean;
  children?: ReactNode;
}

/** Tarjeta que es un enlace. Interna con react-router, externa con <a>. */
export function CardEnlace({ a, externo, variante = 'normal', compacta, className, children, ...resto }: CardEnlaceProps) {
  const clases = cx(estilos.tarjeta, estilos.enlazable, CLASE_VARIANTE[variante], compacta && estilos.compacta, className);
  if (externo) {
    return (
      <a className={clases} href={a} target="_blank" rel="noreferrer" {...resto}>
        {children}
      </a>
    );
  }
  return (
    <Link className={clases} to={a} {...resto}>
      {children}
    </Link>
  );
}

export function CardCabecera({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[estilos.cabecera, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardTitulo({ children }: { children: ReactNode }) {
  return <h3 className={estilos.titulo}>{children}</h3>;
}

export function CardPie({ children }: { children: ReactNode }) {
  return <div className={estilos.pie}>{children}</div>;
}
