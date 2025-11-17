
import React, { useEffect, useState } from "react";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import axios from "axios";

function PagoMensualPage() {
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [loading, setLoading] = useState(false);
  const [pagoExiste, setPagoExiste] = useState(null); // null = sin consulta todavía, false = no existe, true = existe
  const [consultado, setConsultado] = useState(false); // controla si ya se ejecutó la consulta
  
  // Datos del formulario
  const [numeroBoleta, setNumeroBoleta] = useState("");
  const [boletaExiste, setBoletaExiste] = useState(false);
  const [tipoPago, setTipoPago] = useState("");
  const [evidencia, setEvidencia] = useState(null);
  const [tiposPago, setTiposPago] = useState([]);
  const [totalServicios, setTotalServicios] = useState(0);
  const [servicios, setServicios] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sugerir mes/año actual por defecto (sin consultar automáticamente)
  useEffect(() => {
    const now = new Date();
    const mesActual = String(now.getMonth() + 1).padStart(2, "0");
    const anioActual = now.getFullYear();
    setMes(mesActual);
    setAnio(anioActual);
  }, []);

  // Obtener tipos de pago
  useEffect(() => {
    axios.get("/api/tipo-pago")
      .then(res => setTiposPago(res.data))
      .catch(err => console.error("Error al obtener tipos de pago:", err));
  }, []);

  // Obtener servicios y calcular total
  useEffect(() => {
    axios.get("/api/servicios")
      .then(res => {
        setServicios(res.data);
        const total = res.data.reduce((sum, servicio) => sum + parseFloat(servicio.SER_COSTO || 0), 0);
        setTotalServicios(total);
      })
      .catch(err => console.error("Error al obtener servicios:", err));
  }, []);

  // Ejecutar consulta bajo demanda
  const consultarPago = async () => {
    const usuarioId = localStorage.getItem("id");
    if (!usuarioId) return;
    if (!mes || !anio) {
      alert("Selecciona mes y año");
      return;
    }
    setLoading(true);
    setConsultado(true);
    try {
      const res = await axios.get(`/api/pagos/check-status?usuarioId=${usuarioId}&mes=${mes}&anio=${anio}`);
      setPagoExiste(res.data?.exists ?? false);
    } catch (err) {
      console.error('Error al consultar pago:', err);
      setPagoExiste(false);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de confirmación después de validar
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (boletaExiste) {
      alert('este numero de boleta ya fue registrado');
      return;
    }
    if (!numeroBoleta || !tipoPago || !evidencia) {
      alert("Por favor completa todos los campos");
      return;
    }
    if (!mes || !anio) {
      alert("Selecciona mes y año");
      return;
    }
    setShowConfirm(true);
  };

  // Verifica en backend si el numero de boleta ya existe
  const checkBoleta = async (valor) => {
    if (!valor) {
      setBoletaExiste(false);
      return;
    }
    try {
      const res = await axios.get(`/api/pagos/check-codigo?codigo=${valor}`);
      const exists = res.data?.exists || false;
      setBoletaExiste(exists);
      if (exists) alert('este numero de boleta ya fue registrado');
    } catch (err) {
      console.error('Error al verificar boleta:', err);
      setBoletaExiste(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const usuarioId = localStorage.getItem("id");
      // 1. Crear el registro en SIE_PAGO
      const pagoData = {
        PAG_CODIGO: parseInt(numeroBoleta),
        US_USUARIO: parseInt(usuarioId),
        PAG_MES: mes,
        PAG_AÑO: parseInt(anio),
        PAG_TOTAL: parseFloat(totalServicios),
        CUE_CUENTA: 1,
        TIP_TIPO: parseInt(tipoPago),
        PAG_EVIDENCIA: evidencia?.name || null,
        PAG_fecha: new Date().toISOString().split('T')[0]
      };

      const pagoResponse = await axios.post("/api/pagos", pagoData);
      const pagoId = pagoResponse.data.id || pagoResponse.data.insertId;
      // Nota: Ya se insertó PAG_EVIDENCIA (nombre de archivo) junto con el resto de los datos

      // Subir físicamente la evidencia al servidor (carpeta uploads/evidencias)
      if (pagoId && evidencia) {
        const formData = new FormData();
        formData.append("evidencia", evidencia);
        await axios.post(`/api/pagos/evidencia/${pagoId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      // 3. Crear registros en SIE_DETALLE_PAGO para cada servicio
      for (const servicio of servicios) {
        await axios.post("/api/detalle-pago", {
          PAG_PAGO: pagoId,
          SER_SERVICIO: servicio.SER_SERVICIO,
          DET_FECHA_PAGO: new Date().toISOString().split('T')[0]
        });
      }
      // Sin alertas para evitar bloquear el flujo
    } catch (err) {
      console.error("Error al registrar el pago:", err);
      // No mostramos alerta; recargaremos de todas formas
    } finally {
      // Siempre refrescar la página después de aceptar la confirmación
      window.location.reload();
    }
  };

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-5">
        {/* Barra de filtros para seleccionar mes y año */}
        <div className="card shadow p-3 mb-4">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Mes</label>
              <select className="form-select" value={mes} onChange={(e) => setMes(e.target.value)}>
                <option value="">Selecciona</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
                <option value="01">Enero</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Año</label>
              <select
                className="form-select"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              >
                <option value="">Selecciona</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary" onClick={consultarPago} disabled={!mes || !anio || loading}>
                {loading ? "Consultando..." : "Aplicar"}
              </button>
            </div>
          </div>
        </div>

        {/* Loading state solo después de consultar */}
        {loading && (
          <div className="text-center py-2">
            <p>Cargando...</p>
          </div>
        )}

        {/* Mensaje de pago pendiente - parte superior */}
        {!loading && consultado && pagoExiste === false && (
          <>
            <div className="alert alert-warning mb-4" role="alert">
              <strong>Tienes el pago mensual pendiente</strong>
              <div className="mt-2">
                <small>Mes: {mes}/{anio}</small>
              </div>
            </div>

            {/* Formulario de pago */}
            <div className="card shadow p-4">
              <h3 className="mb-4">Registrar Pago Mensual</h3>
              <form onSubmit={handleOpenConfirm}>
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label">Número de Boleta</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={numeroBoleta}
                        onChange={(e) => { setNumeroBoleta(e.target.value); if (boletaExiste) setBoletaExiste(false); }}
                        onBlur={(e) => checkBoleta(e.target.value)}
                        required
                        placeholder="Ingresa el número de boleta"
                      />
                      {boletaExiste && (
                        <div className="form-text text-danger" style={{ fontWeight: 600 }}>
                          Este número de boleta ya fue registrado
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Tipo de Pago</label>
                      <select 
                        className="form-select" 
                        value={tipoPago}
                        onChange={(e) => setTipoPago(e.target.value)}
                        required
                      >
                        <option value="">Selecciona un tipo de pago</option>
                        {tiposPago.map((tipo) => (
                          <option key={tipo.TIP_TIPO} value={tipo.TIP_TIPO}>
                            {tipo.TIP_NOMBRE}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Evidencia de Pago (Imagen)</label>
                      <input 
                        type="file" 
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => setEvidencia(e.target.files[0])}
                        required
                      />
                      <small className="text-muted">Formatos aceptados: JPG, PNG, PDF</small>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Servicios Incluidos</label>
                      <ul className="list-group" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {servicios.map((servicio) => (
                          <li className="list-group-item d-flex justify-content-between" key={servicio.SER_SERVICIO}>
                            <span>{servicio.SER_NOMBRE}</span>
                            <span className="badge bg-primary">Q {parseFloat(servicio.SER_COSTO).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h5 className="card-title">Total a Pagar</h5>
                        <h2 className="text-success">Q {totalServicios.toFixed(2)}</h2>
                        <hr />
                        <p className="mb-1"><small>Mes: {mes}/{anio}</small></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg px-5"
                    disabled={submitting || boletaExiste}
                  >
                    {submitting ? "Procesando..." : "Agregar Pago"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Mensaje de pago completado - centro de la vista */}
        {!loading && consultado && pagoExiste === true && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
            <div className="alert alert-success text-center p-5" role="alert" style={{ maxWidth: "600px", width: "100%" }}>
              <h3>¡Felicidades, no tienes pagos pendientes!</h3>
              <div className="mt-3">
                <small>Mes: {mes}/{anio}</small>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        open={showConfirm}
        title="¿Confirmar Pago?"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        confirming={submitting}
      >
        <div className="mb-2"><strong>Usuario:</strong> {localStorage.getItem('id')}</div>
        <div className="mb-2"><strong>Mes/Año:</strong> {mes}/{anio}</div>
        <div className="mb-2"><strong>Número de Boleta:</strong> {numeroBoleta}</div>
        <div className="mb-2"><strong>Tipo de Pago:</strong> {tiposPago.find(t => t.TIP_TIPO == tipoPago)?.TIP_NOMBRE || ''}</div>
        <div className="mb-2"><strong>Total:</strong> Q {totalServicios.toFixed(2)}</div>
        <div className="mb-2"><strong>Evidencia:</strong> {evidencia?.name}</div>
      </ConfirmModal>
      <VersionFooter />
    </PageLayout>
  );
}

export default PagoMensualPage;

// Modal de confirmación simple
function ConfirmModal({ open, title, onCancel, onConfirm, children, confirmText = 'Confirmar', cancelText = 'Cancelar', confirming = false }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div style={{ maxWidth: 520, margin: '10% auto', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.2)' }}>
        <div className="p-3 border-bottom">
          <h5 className="m-0">{title}</h5>
        </div>
        <div className="p-3">
          {children}
        </div>
        <div className="p-3 border-top d-flex justify-content-end gap-2">
          <button className="btn btn-light" onClick={onCancel} disabled={confirming}>{cancelText}</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={confirming}>{confirming ? 'Procesando...' : confirmText}</button>
        </div>
      </div>
    </div>
  );
}
