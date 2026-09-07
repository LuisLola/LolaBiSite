import type { ReactNode } from 'react';
import estilos from './Badge.module.css';
import { cx } from './cx';

export type TonoBadge =
  | 'neutro'
  | 'tienes'
  | 'solicitar'
  | 'activo'
  | 'pruebas'
  | 'retirado'
  | 'destacado'
  | 'aviso'
  | 'sobreBurdeos';

const CLASE_TONO: Record<TonoBadge, string | undefined> = {
  neutro: estilos.neutro,
  tienes: estilos.tienes,
  solicitar: estilos.solicitar,
  activo: estilos.activo,
  pruebas: estilos.pruebas,
  retirado: estilos.retirado,
  destacado: estilos.destacado,
  aviso: estilos.aviso,
  sobreBurdeos: estilos.sobreBurdeos,
};

export interface BadgeProps {
  tono?: TonoBadge;
  punto?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tono = 'neutro', punto, className, children }: BadgeProps) {
  return (
    <span className={cx(estilos.badge, CLASE_TONO[tono], className)}>
      {punto ? <span className={estilos.punto} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const TONO_ESTADO: Record<string, TonoBadge> = {
  Activo: 'activo',
  'En pruebas': 'pruebas',
  Retirado: 'retirado',
};

export function BadgeEstado({ estado }: { estado: string }) {
  return <Badge tono={TONO_ESTADO[estado] ?? 'neutro'}>{estado}</Badge>;
}

export function BadgeAcceso({ tieneAcceso }: { tieneAcceso: boolean }) {
  return tieneAcceso ? <Badge tono="tienes">Tienes</Badge> : <Badge tono="solicitar">Solicitar</Badge>;
}
