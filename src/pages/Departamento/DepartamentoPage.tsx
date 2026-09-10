import { ArrowUpRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useConfiguracion } from '../../app/configuracion';
import { useEstadoPaneles } from '../../data/estadoPaneles';
import { buscarDepartamento } from '../../domain/departamentos';
import { urlAbrirPanel } from '../../domain/panelUrls';
import { useDepartamentosVisibles, usePanelesVisiblesDeDepartamento } from '../../hooks/useAcceso';
import { useRecientes } from '../../hooks/useRecientes';
import { AreaAvatar } from '../../ui/AreaAvatar';
import { AvisoDeError } from '../../ui/AvisoDeCarga';
import { Badge } from '../../ui/Badge';
import { BotonEnlace } from '../../ui/Button';
import { Card, CardCabecera, CardTitulo } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import { FilaGrupo, FilaVacia, Table, Td, Th, claseFilaAlterna } from '../../ui/Table';
import estilos from './DepartamentoPage.module.css';

const COLUMNAS = 4;

export function DepartamentoPage() {
  const { slug } = useParams();
  // Solo se buscan entre los departamentos visibles: si no es de tus equipos,
  // la pagina no existe. Ni se atenua ni se ofrece pedir acceso.
  const { departamentos, cargando } = useDepartamentosVisibles();
  const departamento = buscarDepartamento(departamentos, slug);
  const { paneles, informes } = usePanelesVisiblesDeDepartamento(departamento?.nombre);
  const { registrar } = useRecientes();
  const { urlGlosario, contactoSoporte } = useConfiguracion();
  const { error, recargar } = useEstadoPaneles();

  // Antes que nada: si la lista no ha cargado, el departamento "no existe"
  // aunque exista. Decirle eso a alguien cuyo companero lo tiene abierto al
  // lado es la forma mas rapida de generar un ticket.
  if (error) {
    return <AvisoDeError error={error} reintentar={() => void recargar()} contacto={contactoSoporte} />;
  }

  if (!departamento) {
    return (
      <Card>
        <CardTitulo>{cargando ? 'Cargando…' : 'Este departamento no está entre los tuyos'}</CardTitulo>
        {cargando ? null : (
          <p className={estilos.descripcion}>
            Aquí solo aparecen los departamentos de los equipos a los que perteneces. Si crees que
            deberías ver «{slug}», escribe a {contactoSoporte} y te damos acceso.{' '}
            <Link to="/">Vuelve a la portada</Link>.
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className={estilos.pagina}>
      <nav className={estilos.migas} aria-label="Migas de pan">
        <Link to="/">Inicio</Link>
        <span aria-hidden="true">/</span>
        <span>{departamento.nombre}</span>
      </nav>

      <header className={estilos.cabecera}>
        <AreaAvatar
          iniciales={departamento.iniciales}
          color={departamento.color}
          colorTexto={departamento.colorTexto}
          tamano="grande"
          huerfano={departamento.huerfano}
        />
        <div className={estilos.cabeceraTextos}>
          <h1 className={estilos.titulo}>{departamento.nombre}</h1>
          <p className={estilos.descripcion}>
            {departamento.descripcion ?? 'Este área todavía no tiene descripción en departamentos.config.ts.'}
          </p>
          <div className={estilos.metaCabecera}>
            <span>{departamento.responsable ?? 'Sin responsable asignado'}</span>
            <span className={estilos.metaValor}>
              {paneles.length} {paneles.length === 1 ? 'panel' : 'paneles'} en {informes.length}{' '}
              {informes.length === 1 ? 'informe' : 'informes'}
            </span>
            <span className={estilos.metaValor}>
              {departamento.horaActualizacion ? `Actualiza ${departamento.horaActualizacion}` : 'Hora sin declarar'}
            </span>
            {departamento.grupo ? <Badge>{departamento.grupo.nombre}</Badge> : null}
          </div>
        </div>
      </header>

      <section>
        <SectionLabel conMargen>Informes del área</SectionLabel>
        <Card sinRelleno compacta>
          <Table cebraManual>
            <thead>
              <tr>
                <Th>Informe</Th>
                <Th>Para qué sirve</Th>
                <Th>Responsable</Th>
                <Th numerico>Actualizado</Th>
              </tr>
            </thead>
            <tbody>
              {informes.length === 0 ? (
                <FilaVacia colSpan={COLUMNAS}>Este área no tiene paneles activos.</FilaVacia>
              ) : (
                (() => {
                  let indiceFila = -1;
                  return informes.map((informe) => (
                  <Fragment key={informe.reportId}>
                    {informe.paneles.length > 1 ? (
                      <FilaGrupo colSpan={COLUMNAS}>
                        <span className={estilos.grupoInforme}>
                          {informe.titulo}
                          <span className={estilos.grupoInformeConteo}>
                            {informe.paneles.length} páginas del mismo informe
                          </span>
                        </span>
                      </FilaGrupo>
                    ) : null}
                    {informe.paneles.map((panel) => {
                      indiceFila += 1;
                      return (
                        <tr key={panel.id} className={claseFilaAlterna(indiceFila)}>
                          <Td>
                            <a
                              className={estilos.nombrePanel}
                              href={urlAbrirPanel(panel)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => registrar(panel.id)}
                            >
                              {panel.nombre}
                            </a>
                          </Td>
                          <Td>
                            <span className={panel.descripcion ? estilos.paraQue : estilos.sinDato}>
                              {panel.descripcion ?? 'Sin descripción'}
                            </span>
                          </Td>
                          <Td>
                            <span className={panel.responsable ? undefined : estilos.sinDato}>
                              {panel.responsable ?? 'Sin asignar'}
                            </span>
                          </Td>
                          <Td numerico>
                            <span className={panel.horaActualizacion ? undefined : estilos.sinDato}>
                              {panel.horaActualizacion ?? departamento.horaActualizacion ?? '—'}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  </Fragment>
                  ));
                })()
              )}
            </tbody>
          </Table>
        </Card>
      </section>

      <div className={estilos.pieTarjetas}>
        <Card variante="doc">
          <CardCabecera>
            <CardTitulo>Cómo se leen estos paneles</CardTitulo>
          </CardCabecera>
          <ul className={estilos.listaAyuda}>
            <li>
              <span className={estilos.vinieta}>1</span>
              Cada fila es una página de un informe: cuando ves un grupo, son vistas del mismo
              informe con filtros distintos.
            </li>
            <li>
              <span className={estilos.vinieta}>2</span>
              La columna «Actualizado» es la hora de refresco declarada por el área, no una medición
              en vivo.
            </li>
            <li>
              <span className={estilos.vinieta}>3</span>
              Ves este área porque estás en su equipo de Teams
              {departamento.grupo ? ` (${departamento.grupo.nombre})` : ''}. El permiso sobre los
              datos lo aplica Power BI al abrir.
            </li>
          </ul>
        </Card>

        <Card variante="doc">
          <CardCabecera>
            <CardTitulo>Documentos del área</CardTitulo>
          </CardCabecera>
          <ul className={estilos.listaAyuda}>
            <li>
              <span className={estilos.vinieta}>·</span>
              Responsable del área: {departamento.responsable ?? 'sin asignar'}.
            </li>
            <li>
              <span className={estilos.vinieta}>·</span>
              Equipo de Teams: {departamento.grupo?.nombre ?? 'sin asignar'}.
            </li>
          </ul>
          {/*
            Sin glosario configurado no se pinta el boton. Antes apuntaba a
            #/glosario, que no es ninguna ruta: te devolvia a la portada sin
            decir nada, que es peor que no ofrecerlo.
          */}
          {urlGlosario ? (
            <BotonEnlace a={urlGlosario} externo variante="secundario" pequeno className={estilos.accionDocumentos}>
              Abrir glosario
              <ArrowUpRight size={13} strokeWidth={1.75} />
            </BotonEnlace>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
