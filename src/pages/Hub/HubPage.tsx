import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConfiguracion } from '../../app/configuracion';
import { ListaPaneles } from '../../components/ListaPaneles';
import { slugDepartamento } from '../../config/departamentos.config';
import { agruparPorInforme } from '../../domain/paneles';
import type { Panel } from '../../domain/types';
import { useDepartamentosVisibles, usePanelesVisibles } from '../../hooks/useAcceso';
import { useRecientes } from '../../hooks/useRecientes';
import { Badge } from '../../ui/Badge';
import { BotonEnlace } from '../../ui/Button';
import { Buscador } from '../../ui/Campos';
import { Card, CardCabecera, CardTitulo } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import { DepartamentoCard } from './DepartamentoCard';
import { TarjetaDestacada, TarjetaNovedad } from './TarjetaDestacada';
import estilos from './HubPage.module.css';

/** Destacado real si existe; si no, el primero por orden (marcado como sugerido). */
function elegirDestacado(paneles: readonly Panel[]): { panel: Panel; marcado: boolean } | null {
  const marcado = paneles.find((p) => p.destacado);
  if (marcado) return { panel: marcado, marcado: true };
  const primero = paneles[0];
  return primero ? { panel: primero, marcado: false } : null;
}

/** Ultima incorporacion: por fecha de creacion si la hay, si no la ultima fila. */
function elegirNovedad(paneles: readonly Panel[]): Panel | null {
  const conFecha = paneles.filter((p) => p.creado);
  if (conFecha.length > 0) {
    return [...conFecha].sort((a, b) => (b.creado ?? '').localeCompare(a.creado ?? ''))[0] ?? null;
  }
  return paneles[paneles.length - 1] ?? null;
}

export function HubPage() {
  const { titulo, subtitulo, urlGlosario } = useConfiguracion();
  const { paneles, cargando } = usePanelesVisibles();
  const { departamentos } = useDepartamentosVisibles();
  const { paneles: recientes } = useRecientes();
  const navegar = useNavigate();
  const [consulta, setConsulta] = useState('');

  const porDepartamento = useMemo(() => {
    const mapa = new Map<string, Panel[]>();
    for (const panel of paneles) {
      const lista = mapa.get(panel.departamento);
      if (lista) lista.push(panel);
      else mapa.set(panel.departamento, [panel]);
    }
    return mapa;
  }, [paneles]);

  const totalInformes = useMemo(() => agruparPorInforme(paneles).length, [paneles]);
  const destacado = useMemo(() => elegirDestacado(paneles), [paneles]);
  const novedad = useMemo(() => elegirNovedad(paneles), [paneles]);

  const coincidencias = useMemo(() => {
    if (!consulta.trim()) return [];
    const texto = consulta.trim().toLowerCase();
    return paneles.filter((panel) => panel.nombre.toLowerCase().includes(texto)).slice(0, 5);
  }, [consulta, paneles]);

  return (
    <div className={estilos.pagina}>
      <section className={estilos.heroe}>
        <div>
          <span className={estilos.heroeMarca}>Lola Casademunt · {titulo}</span>
          <h1 className={estilos.heroeTitulo}>Los paneles de la casa, ordenados por departamento.</h1>
          <p className={estilos.heroeTexto}>{subtitulo}</p>
          <div className={estilos.heroeCifras}>
            <span className={estilos.cifra}>
              <span className={estilos.cifraValor}>{paneles.length}</span>
              <span className={estilos.cifraEtiqueta}>Paneles</span>
            </span>
            <span className={estilos.cifra}>
              <span className={estilos.cifraValor}>{totalInformes}</span>
              <span className={estilos.cifraEtiqueta}>Informes</span>
            </span>
            <span className={estilos.cifra}>
              <span className={estilos.cifraValor}>{departamentos.length}</span>
              <span className={estilos.cifraEtiqueta}>Departamentos</span>
            </span>
          </div>
        </div>

        <div className={estilos.heroeBuscador}>
          <Buscador
            etiquetaAccesible="Buscar un panel"
            placeholder="Buscar un panel…"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            onKeyDown={(evento) => {
              const primera = coincidencias[0];
              if (evento.key === 'Enter' && primera) {
                navegar(`/departamento/${slugDepartamento(primera.departamento)}`);
              }
            }}
          />
          {coincidencias.length > 0 ? (
            <Card compacta>
              <ListaPaneles paneles={coincidencias} mostrarDepartamento />
            </Card>
          ) : (
            <span className={estilos.heroeBuscadorPie}>Ctrl K abre el buscador completo</span>
          )}
        </div>
      </section>

      <section className={estilos.estado} aria-label="Estado de los datos">
        <SectionLabel>Estado de los datos</SectionLabel>
        <div className={estilos.estadoItems}>
          {departamentos.map((departamento) => (
            <Link key={departamento.id} to={`/departamento/${departamento.id}`} className={estilos.estadoItem}>
              <span className={estilos.estadoPunto} style={{ background: departamento.color }} aria-hidden="true" />
              {departamento.nombre}
              <span className={estilos.estadoHora}>
                {departamento.horaActualizacion ?? 'sin hora'} · {departamento.totalPaneles}
              </span>
            </Link>
          ))}
        </div>
        <span className={estilos.estadoNota}>Horas declaradas por área, no monitorizadas.</span>
      </section>

      <div className={estilos.cuerpo}>
        <div className={estilos.principal}>
          <div className={estilos.duo}>
            {destacado ? <TarjetaDestacada panel={destacado.panel} marcado={destacado.marcado} /> : null}
            {novedad ? <TarjetaNovedad panel={novedad} total={paneles.length} /> : null}
          </div>

          <section className={estilos.seccion}>
            <div className={estilos.seccionCabecera}>
              <SectionLabel>Departamentos</SectionLabel>
              <span className={estilos.seccionNota}>
                {cargando ? 'Cargando…' : `${departamentos.length} áreas con paneles publicados`}
              </span>
            </div>
            <div className={estilos.rejillaAreas}>
              {departamentos.map((departamento) => (
                <DepartamentoCard
                  key={departamento.id}
                  departamento={departamento}
                  paneles={porDepartamento.get(departamento.nombre) ?? []}
                  informes={departamento.totalInformes}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className={estilos.columnaDerecha}>
          <Card compacta>
            <CardCabecera>
              <CardTitulo>Mis paneles</CardTitulo>
              <Badge>{recientes.length}</Badge>
            </CardCabecera>
            <ListaPaneles
              paneles={recientes}
              vacio="Aquí aparecerán los últimos paneles que abras."
              mostrarDepartamento
            />
          </Card>

          <Card compacta>
            <CardCabecera>
              <CardTitulo>Novedades</CardTitulo>
            </CardCabecera>
            <ListaPaneles paneles={paneles.slice(-3).reverse()} mostrarDepartamento />
          </Card>

          <div className={estilos.acciones}>
            <BotonEnlace a={urlGlosario} externo variante="secundario" anchoCompleto>
              <BookOpen size={14} strokeWidth={1.75} />
              Glosario
            </BotonEnlace>
          </div>
        </aside>
      </div>
    </div>
  );
}
