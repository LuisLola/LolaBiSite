import { describe, expect, it } from 'vitest';
import { campoDeCabecera, normalizarCabecera } from './columnas';
import { filasAPaneles, panelesAFilas } from './mapeo';

const FILA_EXPORT = {
  'Título': 'LC - Desempeño de ventas',
  'Area de Trabajo': 'Integrantes de la Operaciones',
  'Url Panel':
    'https://app.powerbi.com/reportEmbed?reportId=5f662917-4305-4545-bd15-7a9d55c155a5&autoAuth=true' +
    '&ctid=52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70&pageName=94444b40d96605bad7e4',
  Departamento: 'Retail-Online',
  'Tipo de elemento': 'Elemento',
  'Ruta de acceso': 'sites/Operaciones/Lists/Paneles PowerBi LolaCasadeMunt',
};

describe('mapeo de columnas', () => {
  it('normaliza cabeceras con acentos y con el _x0020_ de SharePoint', () => {
    expect(normalizarCabecera('Título')).toBe('titulo');
    expect(normalizarCabecera('Area_x0020_de_x0020_Trabajo')).toBe('area de trabajo');
  });

  it('reconoce tanto la cabecera humana como el nombre interno', () => {
    expect(campoDeCabecera('Título')).toBe('nombre');
    expect(campoDeCabecera('Title')).toBe('nombre');
    expect(campoDeCabecera('Url_x0020_Panel')).toBe('urlPanel');
    expect(campoDeCabecera('HoraActualizacion')).toBe('horaActualizacion');
  });

  it('ignora el ruido del export', () => {
    expect(campoDeCabecera('Tipo de elemento')).toBeNull();
    expect(campoDeCabecera('Ruta de acceso')).toBeNull();
  });
});

describe('filasAPaneles', () => {
  it('deriva reportId, pageName y ctid de la URL de incrustación', () => {
    const { paneles } = filasAPaneles([FILA_EXPORT]);
    expect(paneles).toHaveLength(1);
    expect(paneles[0]).toMatchObject({
      nombre: 'LC - Desempeño de ventas',
      departamento: 'Retail-Online',
      reportId: '5f662917-4305-4545-bd15-7a9d55c155a5',
      pageName: '94444b40d96605bad7e4',
      ctid: '52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70',
      estado: 'Activo',
      destacado: false,
    });
  });

  it('devuelve las columnas de ruido para poder avisar en administración', () => {
    const { columnasIgnoradas } = filasAPaneles([FILA_EXPORT]);
    expect(columnasIgnoradas).toEqual(
      expect.arrayContaining(['Tipo de elemento', 'Ruta de acceso']),
    );
  });

  it('no inventa grupo de acceso: vacío significa heredar el equipo del área', () => {
    const { paneles } = filasAPaneles([FILA_EXPORT]);
    expect(paneles[0]?.grupoAcceso).toBeUndefined();
  });

  it('respeta el grupo de la fila cuando la lista lo trae', () => {
    const { paneles } = filasAPaneles([{ ...FILA_EXPORT, GrupoAcceso: 'BI-Direccion' }]);
    expect(paneles[0]?.grupoAcceso).toBe('BI-Direccion');
  });

  it('da un id estable a la misma fila', () => {
    const primero = filasAPaneles([FILA_EXPORT]).paneles[0];
    const segundo = filasAPaneles([FILA_EXPORT]).paneles[0];
    expect(primero?.id).toBe(segundo?.id);
  });

  it('distingue páginas del mismo informe', () => {
    const otraPagina = { ...FILA_EXPORT, 'Título': 'LC - Ranking', 'Url Panel': FILA_EXPORT['Url Panel'].replace('94444b40d96605bad7e4', 'a4c82d91b06e359cbdd5') };
    const { paneles } = filasAPaneles([FILA_EXPORT, otraPagina]);
    expect(paneles[0]?.reportId).toBe(paneles[1]?.reportId);
    expect(paneles[0]?.pageName).not.toBe(paneles[1]?.pageName);
    expect(paneles[0]?.id).not.toBe(paneles[1]?.id);
  });

  it('descarta filas sin título ni URL', () => {
    const { paneles, filasVacias } = filasAPaneles([{ 'Título': '', 'Url Panel': '' }]);
    expect(paneles).toHaveLength(0);
    expect(filasVacias).toBe(1);
  });

  it('no se rompe si faltan descripción, responsable y hora', () => {
    const { paneles } = filasAPaneles([{ 'Título': 'Suelto', Departamento: 'Nuevo' }]);
    expect(paneles[0]?.descripcion).toBeUndefined();
    expect(paneles[0]?.responsable).toBeUndefined();
    expect(paneles[0]?.reportId).toBe('');
  });
});

describe('panelesAFilas', () => {
  it('vuelve a escribir las cabeceras del export más las columnas nuevas', () => {
    const { paneles } = filasAPaneles([FILA_EXPORT]);
    const filas = panelesAFilas(paneles);
    expect(Object.keys(filas[0] ?? {})).toEqual(
      expect.arrayContaining(['Título', 'Area de Trabajo', 'Url Panel', 'Departamento', 'Estado', 'Orden']),
    );
    expect(filas[0]?.['Destacado']).toBe('No');
  });

  it('lo exportado se vuelve a importar sin perder nada', () => {
    const { paneles } = filasAPaneles([FILA_EXPORT]);
    const reimportados = filasAPaneles(panelesAFilas(paneles)).paneles;
    expect(reimportados[0]?.reportId).toBe(paneles[0]?.reportId);
    expect(reimportados[0]?.pageName).toBe(paneles[0]?.pageName);
    expect(reimportados[0]?.id).toBe(paneles[0]?.id);
  });
});
