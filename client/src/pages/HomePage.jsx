import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth.jsx";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import axios from "axios";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/YYYY
const formatDMY = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  return iso;
};

function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [estaAlDia, setEstaAlDia] = useState(null); // true | false | null (desconocido)
  const [ultimosPagos, setUltimosPagos] = useState([]);
  const [ultimosRetiros, setUltimosRetiros] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [usuariosAll, setUsuariosAll] = useState([]);
  const [pagosAll, setPagosAll] = useState([]);
  const [paidStats, setPaidStats] = useState({ paid: 0, unpaid: 0 });
  const [paymentsByDate, setPaymentsByDate] = useState([]);

  const usuarioId = useMemo(() => localStorage.getItem("id"), []);
  const hoy = useMemo(() => new Date(), []);
  const mesActual = useMemo(() => String(hoy.getMonth() + 1).padStart(2, '0'), [hoy]);
  const anioActual = useMemo(() => String(hoy.getFullYear()), [hoy]);
  const tipoId = useMemo(() => (localStorage.getItem('tipo_id') || '').toString(), []);
  const esAdmin = tipoId === '1' || tipoId === '2';

  useEffect(() => {
    setChecked(true);
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Cargar estado de pago del mes actual y últimos 3 pagos del usuario
  useEffect(() => {
    const run = async () => {
      if (!usuarioId) {
        setStatusLoading(false);
        return;
      }
      try {
        const [statusRes, pagosRes] = await Promise.all([
          axios.get('/api/pagos/check-status', { params: { usuarioId, mes: mesActual, anio: anioActual } }),
          axios.get('/api/pagos/por-usuario', { params: { usuarioId } })
        ]);
        setEstaAlDia(Boolean(statusRes.data?.exists));
        const pagos = Array.isArray(pagosRes.data) ? pagosRes.data : [];
        // Ya vienen en orden DESC por año y mes según el servicio; tomar top 3
        setUltimosPagos(pagos.slice(0, 3));
      } catch (err) {
        setEstaAlDia(null);
        setUltimosPagos([]);
      } finally {
        setStatusLoading(false);
      }
    };
    run();
  }, [usuarioId, mesActual, anioActual]);

  // Cargar últimos retiros y proveedores (solo Admin/Control)
  useEffect(() => {
    if (!esAdmin) return;
    const run = async () => {
      try {
        const [rRes, pRes] = await Promise.all([
          axios.get('/api/retiro'),
          axios.get('/api/proveedor')
        ]);
        const retiros = Array.isArray(rRes.data) ? rRes.data : [];
        setUltimosRetiros(retiros.slice(0, 3));
        setProveedores(Array.isArray(pRes.data) ? pRes.data : []);
      } catch (err) {
        setUltimosRetiros([]);
        setProveedores([]);
      }
    };
    run();
  }, [esAdmin]);

  // Cargar usuarios y todos los pagos para métricas (run for all users)
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const [uRes, pagosRes] = await Promise.all([
          axios.get('/api/usuarios'),
          axios.get('/api/pagos/todos-con-usuario')
        ]);
        const users = Array.isArray(uRes.data) ? uRes.data : [];
        const pagos = Array.isArray(pagosRes.data) ? pagosRes.data : [];
        setUsuariosAll(users);
        setPagosAll(pagos);

        // Calcular pagos del mes actual por usuario
        const usersSet = new Set();
        pagos.forEach(p => {
          const pm = String(p.PAG_MES).padStart(2,'0');
          const py = String(p.PAG_AÑO);
          if (pm === mesActual && py === anioActual) {
            usersSet.add(String(p.US_USUARIO));
          }
        });
        const paid = usersSet.size;
        const unpaid = Math.max(0, users.length - paid);
        setPaidStats({ paid, unpaid });

        // Agrupar pagos por fecha en el mes
        const map = new Map();
        pagos.forEach(p => {
          const pm = String(p.PAG_MES).padStart(2,'0');
          const py = String(p.PAG_AÑO);
          if (pm === mesActual && py === anioActual) {
            const fecha = p.PAG_fecha ? String(p.PAG_fecha).split('T')[0] : '';
            if (!fecha) return;
            map.set(fecha, (map.get(fecha) || 0) + 1);
          }
        });
        const arr = Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([date,count])=>({ date, count }));
        setPaymentsByDate(arr);
      } catch (err) {
        setUsuariosAll([]);
        setPagosAll([]);
        setPaidStats({ paid: 0, unpaid: 0 });
        setPaymentsByDate([]);
      }
    };
    loadMetrics();
  }, [mesActual, anioActual]);

  // Chart data for react-chartjs-2
  const barData = {
    labels: ['Al día', 'Pendientes'],
    datasets: [
      {
        label: 'Usuarios',
        data: [paidStats.paid, paidStats.unpaid],
        backgroundColor: ['#198754', '#dc3545']
      }
    ]
  };
  const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const lineData = {
    labels: paymentsByDate.map(p => p.date.split('-').pop()),
    datasets: [
      {
        label: 'Cantidad de pagos',
        data: paymentsByDate.map(p => p.count),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.15)',
        fill: true,
        tension: 0.3
      }
    ]
  };
  const lineOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, precision: 0 } } };

  const proveedorMap = useMemo(() => {
    const map = new Map();
    (proveedores || []).forEach(p => map.set(p.PRO_PROVEEDOR, p));
    return map;
  }, [proveedores]);

  if (!checked || !isAuthenticated) return null;

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-4">
        {/* Encabezado centrado */}
        <div className="text-center mb-4">
          <h1 className="fw-bold">¡Bienvenido a ACCES!</h1>
          <h5 className="text-muted">Administración del Control y Cuentas Electrónicas de Siena</h5>
          <div className="mt-3" style={{ minHeight: 24 }}>
            {/* Espacio para una frase inspiradora */}
            <em className="text-secondary">"La organización es la clave para una comunidad en armonía"</em>
          </div>
        </div>

        <div className="row g-4">
          {/* Estado de pago actual */}
          <div className="col-12 col-md-10 col-lg-8 mx-auto">
            <div className="card shadow">
              <div className="card-body">
                <h4 className="card-title mb-3">Estado de Cuenta - {mesActual}/{anioActual}</h4>
                {statusLoading ? (
                  <p className="text-muted mb-0">Verificando tu estado...</p>
                ) : (
                  <>
                    {estaAlDia ? (
                      <div className="alert alert-success" role="alert">
                        Parece que estás al día, puedes revisar si no tienes otros meses pendientes.
                      </div>
                    ) : (
                      <div className="alert alert-warning" role="alert">
                        Parece que tienes pagos pendientes, ve a la página de pagos mensuales para ingresar tu boleta pago.
                      </div>
                    )}
                    <div className="text-end">
                      <button className="btn btn-primary" onClick={() => navigate('/pago-mensual')}>
                        Ir a Pagos Mensuales
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Últimos 3 pagos */}
          <div className="col-12 col-md-10 col-lg-8 mx-auto">
            <div className="card shadow">
              <div className="card-body">
                <h4 className="card-title mb-3">Tus últimos pagos</h4>
                {statusLoading ? (
                  <p className="text-muted mb-0">Cargando...</p>
                ) : ultimosPagos.length === 0 ? (
                  <p className="text-muted mb-0">Aún no hay pagos registrados.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th>Año</th>
                          <th>Fecha</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultimosPagos.map(p => (
                          <tr key={`home-${p.PAG_PAGO}`}>
                            <td>{String(p.PAG_MES).padStart(2,'0')}</td>
                            <td>{p.PAG_AÑO}</td>
                            <td>{formatDMY(p.PAG_fecha)}</td>
                            <td className="text-end">Q {Number(p.PAG_TOTAL || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="text-end mt-2">
                  <button className="btn btn-outline-secondary" onClick={() => navigate('/historial')}>
                    Ver más
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Charts - visible to all users (small, side-by-side) */}
          <div className="col-12 col-md-10 col-lg-10 mx-auto">
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="card shadow">
                  <div className="card-body">
                    <h5 className="card-title">Usuarios que están al día</h5>
                    <div style={{ height: 200 }}>
                      <Bar data={barData} options={barOptions} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="card shadow">
                  <div className="card-body">
                    <h5 className="card-title">Fechas de pagos en el mes</h5>
                    {paymentsByDate.length === 0 ? (
                      <p className="text-muted mb-0">Sin datos de pagos este mes</p>
                    ) : (
                      <div style={{ height: 200 }}>
                        <Line data={lineData} options={lineOptions} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Últimos retiros (solo Admin/Control) */}
          {esAdmin && (
            <div className="col-12 col-md-10 col-lg-8 mx-auto">
              <div className="card shadow">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="card-title mb-0">Últimos Desembolsos</h4>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/historial-retiro')}>
                      Ver más
                    </button>
                  </div>
                  {ultimosRetiros.length === 0 ? (
                    <p className="text-muted mb-0">Sin desembolsos</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Proveedor</th>
                            <th>Fecha</th>
                            <th className="text-end">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ultimosRetiros.map(r => {
                            const prov = proveedorMap.get(r.PRO_PROVEEDOR);
                            const labelProv = prov?.SER_NOMBRE ? `${r.PRO_NOMBRE || prov.PRO_NOMBRE} - ${prov.SER_NOMBRE}` : (r.PRO_NOMBRE || prov?.PRO_NOMBRE || '');
                            return (
                              <tr key={`ret-home-${r.RET_RETIRO}`}>
                                <td>{r.US_NOMBRE} (ID: {r.US_USUARIO})</td>
                                <td>{labelProv}</td>
                                <td>{formatDMY(r.RET_FECHA)}</td>
                                <td className="text-end">Q {Number(r.RET_TOTAL || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <VersionFooter />
    </PageLayout>
  );
}

export default HomePage;
