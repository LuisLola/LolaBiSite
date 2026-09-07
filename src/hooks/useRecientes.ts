import { useCallback, useEffect, useMemo, useState } from 'react';
import { guardarRecientes, leerRecientes } from '../data/excel/almacenLocal';
import type { Panel } from '../domain/types';
import { usePaneles } from './usePaneles';

const EVENTO = 'portal-bi:recientes';

/** "Mis paneles": ultimos paneles abiertos por este navegador. */
export function useRecientes() {
  const [ids, setIds] = useState<string[]>(() => leerRecientes());
  const { data } = usePaneles();

  useEffect(() => {
    const alCambiar = () => setIds(leerRecientes());
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);

  const registrar = useCallback((id: string) => {
    const previos = leerRecientes().filter((x) => x !== id);
    const siguientes = [id, ...previos].slice(0, 8);
    guardarRecientes(siguientes);
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const paneles = useMemo<Panel[]>(() => {
    const porId = new Map((data ?? []).map((panel) => [panel.id, panel]));
    return ids
      .map((id) => porId.get(id))
      .filter((panel): panel is Panel => Boolean(panel) && panel!.estado === 'Activo');
  }, [ids, data]);

  return { paneles, registrar };
}
