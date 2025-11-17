
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";

// Helper para mostrar fecha DD/MM/YYYY
const formatDMY = (iso) => {
  if (!iso) return '';
  const s = String(iso);
  const base = s.includes('T') ? s.split('T')[0] : s;
  const [y, m, d] = (base || '').split('-');
  if (y && m && d) return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  return base;
};

function HistorialPage() {
  const [pagos, setPagos] = useState([]);
  const [pagosExtra, setPagosExtra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('mensuales'); // 'mensuales' o 'extras'
  const navigate = useNavigate();
  const meses = useMemo(() => ([
    '01','02','03','04','05','06','07','08','09','10','11','12'
  ]), []);
  const mesesEs = useMemo(() => ({
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  }), []);

  useEffect(() => {
    const usuarioId = localStorage.getItem("id");
    if (!usuarioId) {
      setLoading(false);
      return;
    }
    Promise.all([
      axios.get(`/api/pagos/por-usuario?usuarioId=${usuarioId}`),
      axios.get(`/api/extra?usuarioId=${usuarioId}`)
    ])
      .then(([mensualRes, extraRes]) => {
        setPagos(mensualRes.data || []);
        setPagosExtra(extraRes.data || []);
      })
      .catch(() => {
        setPagos([]);
        setPagosExtra([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const puedeVerGlobal = tipoId === '1' || tipoId === '2';

  const irHistorialGeneral = () => navigate('/historial-general');

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-5">
        <div className="card shadow p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="mb-0">Historial de Pagos</h2>
            {puedeVerGlobal && (
              <button className="btn btn-outline-secondary" onClick={irHistorialGeneral}>
                Ver historial general
              </button>
            )}
          </div>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {/* Pestañas de navegación */}
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${vistaActiva === 'mensuales' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('mensuales')}
                  >
                    Pagos Mensuales
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${vistaActiva === 'extras' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('extras')}
                  >
                    Pagos Extras
                  </button>
                </li>
              </ul>

              {/* Pagos Mensuales */}
              {vistaActiva === 'mensuales' && (
                <>
                  {pagos.length === 0 ? (
                    <p className="text-muted">No hay pagos mensuales registrados.</p>
                  ) : (
                    <div className="table-responsive mb-4">
                      <table className="table table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Boleta</th>
                            <th>Mes</th>
                            <th>Año</th>
                            <th>Total Pagado</th>
                            <th>Evidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos.map((p) => (
                            <tr key={p.PAG_PAGO}>
                              <td>{p.PAG_CODIGO || ''}</td>
                              <td>{mesesEs[String(p.PAG_MES).padStart(2,'0')] || p.PAG_MES}</td>
                              <td>{p.PAG_AÑO}</td>
                              <td>Q {Number(p.PAG_TOTAL || 0).toFixed(2)}</td>
                              <td>
                                {p.PAG_EVIDENCIA ? (
                                  <a href={`/uploads/evidencias/${p.PAG_EVIDENCIA}`} target="_blank" rel="noreferrer" title={p.PAG_EVIDENCIA}>
                                    <span className="bi bi-file-earmark-image" aria-label="Ver evidencia" /> Ver evidencia
                                  </a>
                                ) : (
                                  <span className="text-muted">Sin evidencia</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Pagos Extras */}
              {vistaActiva === 'extras' && (
                <>
                  {pagosExtra.length === 0 ? (
                    <p className="text-muted">No hay pagos extras registrados.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Boleta</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Fecha</th>
                            <th>Fecha del Evento</th>
                            <th>Total Pagado</th>
                            <th>Evidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosExtra.map((e) => (
                            <tr key={e.EXT_EXTRA}>
                              <td>{e.EXT_CODIGO || ''}</td>
                              <td>{e.TIE_NOMBRE || e.TIE_TIPO || ''}</td>
                              <td>{e.TIE_DESCRIPCION || ''}</td>
                              <td>{formatDMY(e.EXT_FECHA)}</td>
                              <td>{e.EXT_FECHA_EVENTO ? formatDMY(e.EXT_FECHA_EVENTO) : '-'}</td>
                              <td>Q {Number(e.EXT_TOTAL || 0).toFixed(2)}</td>
                              <td>
                                {e.EXT_EVIDENCIA ? (
                                  <a href={`/uploads/evidencias/${e.EXT_EVIDENCIA}`} target="_blank" rel="noreferrer" title={e.EXT_EVIDENCIA}>
                                    <span className="bi bi-file-earmark-image" aria-label="Ver evidencia" /> Ver evidencia
                                  </a>
                                ) : (
                                  <span className="text-muted">Sin evidencia</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {/* Historial general movido a su propia página */}
        </div>
      </div>
      <VersionFooter />
    </PageLayout>
  );
}

export default HistorialPage;
