import { useEffect, useMemo, useRef, useState } from 'react';
import { configDepartamento } from '../../config/departamentos.config';
import { filtrarPorTexto } from '../../domain/paneles';
import { urlAbrirPanel } from '../../domain/panelUrls';
import type { Panel } from '../../domain/types';
import { usePanelesVisibles } from '../../hooks/useAcceso';
import { useRecientes } from '../../hooks/useRecientes';
import { AreaAvatar } from '../../ui/AreaAvatar';
import { Buscador } from '../../ui/Campos';
import { cx } from '../../ui/cx';
import estilos from './CommandPalette.module.css';

const MAXIMO = 12;

export function CommandPalette({ alCerrar }: { alCerrar: () => void }) {
  const { paneles } = usePanelesVisibles();
  const { paneles: recientes, registrar } = useRecientes();
  const [consulta, setConsulta] = useState('');
  const [activo, setActivo] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    entrada.current?.focus();
  }, []);

  const resultados = useMemo<Panel[]>(() => {
    if (!consulta.trim()) return (recientes.length > 0 ? recientes : paneles).slice(0, MAXIMO);
    return filtrarPorTexto(paneles, consulta).slice(0, MAXIMO);
  }, [consulta, paneles, recientes]);

  useEffect(() => setActivo(0), [consulta]);

  const abrir = (panel: Panel) => {
    registrar(panel.id);
    window.open(urlAbrirPanel(panel), '_blank', 'noreferrer');
    alCerrar();
  };

  const alPulsar = (evento: React.KeyboardEvent) => {
    if (evento.key === 'Escape') {
      alCerrar();
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setActivo((previo) => Math.min(previo + 1, resultados.length - 1));
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setActivo((previo) => Math.max(previo - 1, 0));
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const panel = resultados[activo];
      if (panel) abrir(panel);
    }
  };

  return (
    <div
      className={estilos.fondo}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar();
      }}
    >
      <div className={estilos.panel} role="dialog" aria-modal="true" aria-label="Buscar panel" onKeyDown={alPulsar}>
        <div className={estilos.cabecera}>
          <Buscador
            ref={entrada}
            etiquetaAccesible="Buscar por nombre, descripción, departamento o área de trabajo"
            placeholder="Buscar por nombre, descripción, departamento o área…"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
          />
        </div>

        <div className={estilos.resultados}>
          {!consulta.trim() && recientes.length > 0 ? (
            <div className={estilos.grupo}>
              <span className={estilos.detalle}>Últimos que has abierto</span>
            </div>
          ) : null}

          {resultados.length === 0 ? (
            <p className={estilos.vacio}>Ningún panel coincide con «{consulta}».</p>
          ) : (
            resultados.map((panel, indice) => {
              const { config } = configDepartamento(panel.departamento);
              return (
                <button
                  key={panel.id}
                  type="button"
                  className={cx(estilos.opcion, indice === activo && estilos.opcionActiva)}
                  onMouseEnter={() => setActivo(indice)}
                  onClick={() => abrir(panel)}
                >
                  <AreaAvatar
                    iniciales={config.iniciales}
                    color={config.color}
                    colorTexto={config.colorTexto}
                    tamano="pequeno"
                  />
                  <span className={estilos.textos}>
                    <span className={estilos.nombre}>{panel.nombre}</span>
                    <span className={estilos.detalle}>
                      {panel.departamento}
                      {panel.descripcion ? ` · ${panel.descripcion}` : ''}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className={estilos.pie}>
          <span>↑ ↓ para moverte</span>
          <span>Enter abre en Power BI</span>
          <span>Esc cierra</span>
        </div>
      </div>
    </div>
  );
}
