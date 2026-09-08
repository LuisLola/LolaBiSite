import { describe, expect, it } from 'vitest';
import { DEPARTAMENTOS_CONFIG } from '../config/departamentos.config';
import { derivarDepartamentos } from './departamentos';
import {
  agruparPorInforme,
  filtrarPorTexto,
  ordenarPaneles,
  prefijoComun,
  siguienteOrden,
  soloActivos,
} from './paneles';
import type { Panel } from './types';

function panel(extra: Partial<Panel> & { nombre: string }): Panel {
  return {
    id: extra.nombre,
    areaTrabajo: '',
    urlPanel: '',
    reportId: 'r1',
    pageName: 'p1',
    departamento: 'Retail-Online',
    destacado: false,
    orden: 10,
    estado: 'Activo',
    ...extra,
  };
}

describe('ordenarPaneles', () => {
  it('ordena por destacado, luego orden y luego nombre', () => {
    const paneles = [
      panel({ nombre: 'Zeta', orden: 10 }),
      panel({ nombre: 'Alfa', orden: 10 }),
      panel({ nombre: 'Primero', orden: 5 }),
      panel({ nombre: 'Estrella', orden: 99, destacado: true }),
    ];
    expect(ordenarPaneles(paneles).map((p) => p.nombre)).toEqual([
      'Estrella',
      'Primero',
      'Alfa',
      'Zeta',
    ]);
  });

  it('no muta la lista original', () => {
    const paneles = [panel({ nombre: 'B' }), panel({ nombre: 'A' })];
    ordenarPaneles(paneles);
    expect(paneles.map((p) => p.nombre)).toEqual(['B', 'A']);
  });
});

describe('soloActivos', () => {
  it('deja fuera lo retirado y lo que está en pruebas', () => {
    const paneles = [
      panel({ nombre: 'Vivo' }),
      panel({ nombre: 'Retirado', estado: 'Retirado' }),
      panel({ nombre: 'Pruebas', estado: 'En pruebas' }),
    ];
    expect(soloActivos(paneles).map((p) => p.nombre)).toEqual(['Vivo']);
  });
});

describe('agruparPorInforme', () => {
  it('junta las páginas del mismo informe', () => {
    const paneles = [
      panel({ nombre: 'LC - Desempeño de ventas', reportId: 'a', pageName: '1', orden: 10 }),
      panel({ nombre: 'LC - Ranking por Temporada', reportId: 'a', pageName: '2', orden: 20 }),
      panel({ nombre: 'LC - Analisis Transportes', reportId: 'b', pageName: '3', orden: 30 }),
    ];
    const informes = agruparPorInforme(paneles);
    expect(informes).toHaveLength(2);
    expect(informes[0]?.paneles).toHaveLength(2);
    expect(informes[1]?.paneles).toHaveLength(1);
  });

  it('deduce un título común para el grupo', () => {
    expect(prefijoComun(['LC - Ranking por Temporada', 'LC - Rankings Producto'])).toBe('LC - Ranking');
    expect(prefijoComun(['Uno'])).toBe('Uno');
    expect(prefijoComun([])).toBe('');
  });

  it('no agrupa paneles sin reportId', () => {
    const paneles = [
      panel({ nombre: 'Suelto 1', id: 's1', reportId: '' }),
      panel({ nombre: 'Suelto 2', id: 's2', reportId: '' }),
    ];
    expect(agruparPorInforme(paneles)).toHaveLength(2);
  });
});

describe('filtrarPorTexto', () => {
  const paneles = [
    panel({ nombre: 'LC - Previsión Entradas', departamento: 'Logistica', descripcion: 'Almacén' }),
    panel({ nombre: 'Plan de Servicio B2B', departamento: 'Multimarca', areaTrabajo: 'Luis Díaz' }),
  ];

  it('busca sin acentos y sin distinguir mayúsculas', () => {
    expect(filtrarPorTexto(paneles, 'prevision').map((p) => p.nombre)).toEqual([
      'LC - Previsión Entradas',
    ]);
    expect(filtrarPorTexto(paneles, 'LUIS').map((p) => p.nombre)).toEqual(['Plan de Servicio B2B']);
  });

  it('exige todos los términos', () => {
    expect(filtrarPorTexto(paneles, 'plan multimarca')).toHaveLength(1);
    expect(filtrarPorTexto(paneles, 'plan logistica')).toHaveLength(0);
  });

  it('con la consulta vacía devuelve todo', () => {
    expect(filtrarPorTexto(paneles, '   ')).toHaveLength(2);
  });
});

describe('derivarDepartamentos', () => {
  const paneles = [
    panel({ nombre: 'A', departamento: 'Retail-Online', reportId: 'r1' }),
    panel({ nombre: 'B', departamento: 'Retail-Online', reportId: 'r1', pageName: 'p2' }),
    panel({ nombre: 'C', departamento: 'Logistica', reportId: 'r2' }),
    panel({ nombre: 'D', departamento: 'Compras', reportId: 'r3' }),
    panel({ nombre: 'E', departamento: 'Logistica', reportId: 'r4', estado: 'Retirado' }),
  ];

  it('deriva los departamentos de los datos, no de una tabla', () => {
    const departamentos = derivarDepartamentos(paneles);
    expect(departamentos.map((d) => d.nombre)).toEqual(
      expect.arrayContaining(['Retail-Online', 'Logistica', 'Compras']),
    );
  });

  it('cuenta paneles activos e informes distintos', () => {
    const retail = derivarDepartamentos(paneles).find((d) => d.nombre === 'Retail-Online');
    expect(retail?.totalPaneles).toBe(2);
    expect(retail?.totalInformes).toBe(1);
  });

  it('no cuenta los retirados pero sí los conserva en el total', () => {
    const logistica = derivarDepartamentos(paneles).find((d) => d.nombre === 'Logistica');
    expect(logistica?.totalPaneles).toBe(1);
    expect(logistica?.totalPanelesTodos).toBe(2);
  });

  it('un departamento sin configurar cae en el estilo neutro y se marca huérfano', () => {
    const compras = derivarDepartamentos(paneles).find((d) => d.nombre === 'Compras');
    expect(compras?.huerfano).toBe(true);
    expect(compras?.iniciales).toBe('CO');
    expect(compras?.id).toBe('compras');
  });

  it('los configurados traen iniciales y color de la config', () => {
    const retail = derivarDepartamentos(paneles).find((d) => d.nombre === 'Retail-Online');
    expect(retail?.iniciales).toBe('RO');
    // Ciego al color concreto: lo que se prueba es de donde sale, no cual es.
    expect(retail?.color).toBe(DEPARTAMENTOS_CONFIG['Retail-Online']!.color);
    expect(retail?.huerfano).toBe(false);
  });

  it('lo editado en Administración manda sobre la config', () => {
    const retail = derivarDepartamentos(paneles, [
      { nombre: 'Retail-Online', color: '#123456' },
    ]).find((d) => d.nombre === 'Retail-Online');
    expect(retail?.color).toBe('#123456');
    expect(retail?.iniciales).toBe('RO');
  });
});

describe('siguienteOrden', () => {
  it('deja hueco al final del departamento', () => {
    const paneles = [panel({ nombre: 'A', orden: 10 }), panel({ nombre: 'B', orden: 30 })];
    expect(siguienteOrden(paneles, 'Retail-Online')).toBe(40);
    expect(siguienteOrden(paneles, 'Logistica')).toBe(10);
  });
});
