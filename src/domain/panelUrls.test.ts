import { describe, expect, it } from 'vitest';
import { TENANT_ID } from '../config/tenant.config';
import {
  construirUrlDirecta,
  esUrlEmbed,
  parsearUrlPanel,
  urlAbrirPanel,
  urlDirectaEfectiva,
} from './panelUrls';
import type { Panel } from './types';

const URL_EMBED =
  'https://app.powerbi.com/reportEmbed?reportId=5f662917-4305-4545-bd15-7a9d55c155a5&autoAuth=true' +
  '&ctid=52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70&pageName=94444b40d96605bad7e4' +
  '&navContentPaneEnabled=false&filterPaneEnabled=false';

function panelDePrueba(extra: Partial<Panel> = {}): Panel {
  return {
    id: 'p1',
    nombre: 'LC - Desempeño de ventas',
    areaTrabajo: 'Integrantes de la Operaciones',
    urlPanel: URL_EMBED,
    reportId: '5f662917-4305-4545-bd15-7a9d55c155a5',
    pageName: '94444b40d96605bad7e4',
    departamento: 'Retail-Online',
    destacado: false,
    orden: 10,
    estado: 'Activo',
    ...extra,
  };
}

describe('parsearUrlPanel', () => {
  it('extrae reportId, pageName y ctid de una URL de incrustación', () => {
    expect(parsearUrlPanel(URL_EMBED)).toEqual({
      reportId: '5f662917-4305-4545-bd15-7a9d55c155a5',
      pageName: '94444b40d96605bad7e4',
      ctid: '52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70',
    });
  });

  it('acepta el &amp; que deja algún export de SharePoint', () => {
    const sucia = URL_EMBED.replace(/&/g, '&amp;');
    expect(parsearUrlPanel(sucia)?.pageName).toBe('94444b40d96605bad7e4');
  });

  it('también entiende una URL de apertura con grupo', () => {
    const abierta =
      'https://app.powerbi.com/groups/11111111-2222-3333-4444-555555555555' +
      '/reports/a04a0571-f32d-4e68-93c5-8bd9dfdc8541/ae2d803c570e5bf27f6e';
    expect(parsearUrlPanel(abierta)).toEqual({
      reportId: 'a04a0571-f32d-4e68-93c5-8bd9dfdc8541',
      pageName: 'ae2d803c570e5bf27f6e',
    });
  });

  it('devuelve null con basura o vacío', () => {
    expect(parsearUrlPanel('')).toBeNull();
    expect(parsearUrlPanel(undefined)).toBeNull();
    expect(parsearUrlPanel('https://intranet/algo')).toBeNull();
  });
});

describe('esUrlEmbed', () => {
  it('reconoce las URL que no deben usarse como enlace', () => {
    expect(esUrlEmbed(URL_EMBED)).toBe(true);
    expect(esUrlEmbed('https://app.powerbi.com/reports/abc/def')).toBe(false);
  });
});

describe('construirUrlDirecta', () => {
  it('usa /groups cuando se conoce el área de trabajo, con el tenant', () => {
    expect(construirUrlDirecta('rep', { pageName: 'pag', workspaceId: 'ws', ctid: 'ten' })).toBe(
      'https://app.powerbi.com/groups/ws/reports/rep/pag?ctid=ten',
    );
  });

  it('sin área de trabajo pasa por el resolutor, no por /reports/', () => {
    const url = construirUrlDirecta('rep', { pageName: 'pag', ctid: 'ten' });
    expect(url).toBe(
      'https://app.powerbi.com/Redirect?action=OpenReport&reportObjectId=rep&ctid=ten&reportPage=pag',
    );
    expect(url).not.toMatch(/app\.powerbi\.com\/reports\//);
  });

  it('completa el tenant con el de configuración si no viene en la URL', () => {
    expect(construirUrlDirecta('rep')).toContain(`ctid=${TENANT_ID}`);
  });

  it('aguanta que falte la página', () => {
    expect(construirUrlDirecta('rep', { workspaceId: 'ws', ctid: 'ten' })).toBe(
      'https://app.powerbi.com/groups/ws/reports/rep?ctid=ten',
    );
    expect(construirUrlDirecta('rep', { ctid: 'ten' })).not.toContain('reportPage');
  });

  it('sin reportId no inventa una URL', () => {
    expect(construirUrlDirecta('')).toBe('');
  });
});

describe('urlDirectaEfectiva', () => {
  it('deriva un enlace que abre, con informe, página y tenant', () => {
    expect(urlDirectaEfectiva(panelDePrueba())).toBe(
      'https://app.powerbi.com/Redirect?action=OpenReport' +
        '&reportObjectId=5f662917-4305-4545-bd15-7a9d55c155a5' +
        '&ctid=52dfd00a-ad1b-4688-8b88-c8cb5c7b1a70' +
        '&reportPage=94444b40d96605bad7e4',
    );
  });

  it('respeta el override manual si es un enlace de verdad', () => {
    const panel = panelDePrueba({ urlDirecta: 'https://app.powerbi.com/groups/w/reports/r/p' });
    expect(urlDirectaEfectiva(panel)).toBe('https://app.powerbi.com/groups/w/reports/r/p');
  });

  it('ignora un override que sea una URL de incrustación', () => {
    const panel = panelDePrueba({ urlDirecta: URL_EMBED });
    expect(urlDirectaEfectiva(panel)).toContain('action=OpenReport');
    expect(urlDirectaEfectiva(panel)).not.toContain('autoAuth');
    expect(urlDirectaEfectiva(panel)).not.toContain('reportEmbed');
  });
});

describe('urlAbrirPanel', () => {
  it('abre con la URL de la lista, que es la que enseña la página sola', () => {
    expect(urlAbrirPanel(panelDePrueba())).toBe(URL_EMBED);
  });

  it('sin URL de incrustación cae al enlace del portal', () => {
    const url = urlAbrirPanel(panelDePrueba({ urlPanel: '' }));
    expect(url).toContain('action=OpenReport');
    expect(url).toContain('reportPage=94444b40d96605bad7e4');
  });

  it('un panel sin nada no devuelve una URL rota', () => {
    expect(urlAbrirPanel(panelDePrueba({ urlPanel: '', reportId: '' }))).toBe('');
  });
});
