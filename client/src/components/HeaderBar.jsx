import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth.jsx";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import axios from "axios";
import icono from "../assets/icono.jpeg";

// navItems se construye dinámicamente dentro del componente

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 2,
  minWidth: 400,
  maxWidth: 500,
  maxHeight: '90vh',
  overflow: 'auto'
};

function HeaderBar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [casaNumero, setCasaNumero] = useState("");
  const [formData, setFormData] = useState({
    correo: "",
    telefono: ""
  });
  const [passwordData, setPasswordData] = useState({
    actual: "",
    nueva: "",
    confirmar: ""
  });
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPasswordNueva, setShowPasswordNueva] = useState(false);
  const [showPasswordConfirmar, setShowPasswordConfirmar] = useState(false);
  
  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const isAdminOrControl = tipoId === '1' || tipoId === '2';

  // Datos de usuario
  const user = {
    id: localStorage.getItem("id") || "",
    nombre: localStorage.getItem("usuario") || "Usuario",
    correo: localStorage.getItem("correo") || "",
    telefono: localStorage.getItem("telefono") || "",
    casa: localStorage.getItem("casa") || "",
    tipo_nombre: localStorage.getItem("tipo") || "",
  };

  useEffect(() => {
    // Cargar número de casa cuando se abre el modal
    if (open && user.casa) {
      console.log("Fetching casa with ID:", user.casa);
      axios.get(`/api/casas/${user.casa}`)
        .then(res => {
          console.log("Casa data received:", res.data);
          if (res.data) {
            setCasaNumero(res.data.CAS_NUMERO || "N/A");
          }
        })
        .catch(err => {
          console.error("Error fetching casa:", err);
          setCasaNumero("N/A");
        });
    }
  }, [open, user.casa]);

  const handleOpen = () => {
    setFormData({
      correo: user.correo,
      telefono: user.telefono
    });
    setEditMode(false);
    setShowChangePassword(false);
    setPasswordData({ actual: "", nueva: "", confirmar: "" });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setShowChangePassword(false);
  };

  const handleSaveProfile = async () => {
    if (!currentPassword) {
      alert("Para actualizar el perfil, ingresa tu contraseña actual");
      return;
    }
    setSaving(true);
    try {
      // Verificar contraseña actual primero
      const loginCheck = await axios.post("/api/usuarios/login", {
        US_NOMBRE: user.nombre,
        US_CONTRASEÑA: currentPassword
      });
      if (!loginCheck.data.success) {
        alert("La contraseña actual es incorrecta");
        setSaving(false);
        return;
      }
      // Actualizar perfil manteniendo la contraseña actual
      await axios.put(`/api/usuarios/${user.id}`, {
        US_NOMBRE: user.nombre,
        US_CONTRASEÑA: currentPassword,
        TIP_TIPO_USUARIO: parseInt(tipoId),
        CAS_CASA: parseInt(user.casa),
        US_TELEFONO: formData.telefono,
        US_CORREO: formData.correo
      });
      localStorage.setItem("correo", formData.correo);
      localStorage.setItem("telefono", formData.telefono);
      setEditMode(false);
      setCurrentPassword("");
      alert("Perfil actualizado correctamente");
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      alert("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.actual || !passwordData.nueva || !passwordData.confirmar) {
      alert("Completa todos los campos");
      return;
    }
    if (passwordData.nueva !== passwordData.confirmar) {
      alert("La nueva contraseña y la confirmación no coinciden");
      return;
    }
    if (passwordData.nueva.length < 4) {
      alert("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    setSaving(true);
    try {
      // Verificar contraseña actual
      const loginCheck = await axios.post("/api/usuarios/login", {
        US_NOMBRE: user.nombre,
        US_CONTRASEÑA: passwordData.actual
      });
      if (!loginCheck.data.success) {
        alert("La contraseña actual es incorrecta");
        setSaving(false);
        return;
      }
      // Actualizar contraseña
      await axios.put(`/api/usuarios/${user.id}`, {
        US_NOMBRE: user.nombre,
        US_CONTRASEÑA: passwordData.nueva,
        TIP_TIPO_USUARIO: parseInt(tipoId),
        CAS_CASA: parseInt(user.casa),
        US_TELEFONO: formData.telefono,
        US_CORREO: formData.correo
      });
      alert("Contraseña actualizada correctamente");
      setShowChangePassword(false);
      setPasswordData({ actual: "", nueva: "", confirmar: "" });
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      alert("Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // Obtener color del header según el tipo de usuario
  const getHeaderColor = () => {
    switch(tipoId) {
      case '1': // Administrador
        return 'linear-gradient(135deg, #942222 0%, #6b1818 100%)';
      case '2': // Control
        return 'linear-gradient(135deg, #25857D 0%, #1a5f59 100%)';
      case '3': // Usuario
        return 'linear-gradient(135deg, #1976d2 0%, #115293 100%)';
      default:
        return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
    }
  };

  const navItems = [
    { path: "/", label: "Inicio" },
    { path: "/pago-mensual", label: "Pago mensual" },
    { path: "/pago-extra", label: "Pago Extra" },
    { path: "/historial", label: "Historial" },
    ...(isAdminOrControl ? [
      { path: "/retiro", label: "Desembolsos" },
      { path: "/historial-retiro", label: "Historial de Desembolsos" },
    ] : [])
  ];

  return (
    <>
      <style>{`
        .nav-link-custom {
          color: #D4CDAD !important;
          padding: 0.5rem 1rem;
          border-radius: 0;
          transition: all 0.2s ease;
        }
        .nav-link-custom:hover {
          background-color: rgba(0, 0, 0, 0.15);
        }
        .nav-link-custom.active {
          font-weight: 700;
          background-color: #ffffff !important;
          color: #25857D !important;
        }
        .dropdown-toggle-custom {
          color: #D4CDAD !important;
          padding: 0.5rem 1rem;
          border-radius: 0;
          transition: background-color 0.2s ease;
        }
        .dropdown-toggle-custom:hover {
          background-color: rgba(0, 0, 0, 0.15);
        }
        .navbar {
          border-bottom: none !important;
        }
      `}</style>
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: "#25857D", borderBottom: "none" }}>
        <div className="container-fluid">
          <div className="navbar-brand d-flex align-items-center gap-2" style={{ color: "#D4CDAD", backgroundColor: "#BD3737", borderRadius: "0.5rem", padding: "0.25rem 0.75rem", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            <img src={icono} alt="Icono Siena" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "0.25rem" }} />
            <span>Siena</span>
          </div>
          
          {/* Desktop: todas las opciones en fila */}
          <div className="d-none d-lg-flex mx-auto">
            <ul className="navbar-nav flex-row gap-1">
              {navItems.map((item) => (
                <li className="nav-item" key={item.path}>
                  <Link
                    className={`nav-link nav-link-custom${location.pathname === item.path ? " active" : ""}`}
                    to={item.path}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile: primeras 2 opciones + dropdown "Más" */}
          <div className="d-flex d-lg-none mx-auto gap-1">
            {navItems.slice(0, 2).map((item) => (
              <Link
                key={item.path}
                className={`nav-link nav-link-custom${location.pathname === item.path ? " active" : ""}`}
                to={item.path}
                style={{ whiteSpace: 'nowrap' }}
              >
                {item.label}
              </Link>
            ))}
            {navItems.length > 2 && (
              <div className="dropdown">
                <button
                  className="btn btn-link nav-link dropdown-toggle-custom dropdown-toggle"
                  type="button"
                  id="dropdownMas"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Más
                </button>
                <ul className={`dropdown-menu${dropdownOpen ? ' show' : ''}`} aria-labelledby="dropdownMas">
                  {navItems.slice(2).map((item) => (
                    <li key={item.path}>
                      <Link
                        className={`dropdown-item${location.pathname === item.path ? " active" : ""}`}
                        to={item.path}
                        onClick={() => setDropdownOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-light btn-sm me-2"
              style={{ borderRadius: "0.5rem", backgroundColor: "#ffffffff",borderColor: "#1976d2", color: "#1976d2", fontWeight: 500 }}
              onClick={handleOpen}
              title="Perfil"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#1975d2';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffffffff';
                e.currentTarget.style.color = '#1975d2';
              }}
            >
              Perfil <AccountCircleIcon style={{ color: "#1976d2" }} />
            </button>
            <button
              className="btn btn-outline-danger btn-sm logout-btn"
              style={{ borderRadius: "0.5rem", borderColor: "#dc3545", backgroundColor: "#ffffffff", color: "#dc3545", fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={handleLogout}
              title="Cerrar sesión"
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#dc3545';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffffffff';
                e.currentTarget.style.color = '#dc3545';
              }}
            >
              Cerrar Sesión <LogoutIcon className="logout-icon" style={{ color: "inherit" }} />
            </button>
          </div>
        </div>
      </nav>
      <Modal open={open} onClose={handleClose} aria-labelledby="perfil-modal-title">
        <Box sx={modalStyle}>
          {/* Header con icono de perfil */}
          <div style={{ 
            background: getHeaderColor(), 
            padding: '2rem 1.5rem',
            borderRadius: '8px 8px 0 0',
            textAlign: 'center',
            color: 'white'
          }}>
            <AccountCircleIcon style={{ fontSize: 80, marginBottom: '0.5rem' }} />
            <h4 style={{ margin: 0, fontWeight: 600 }}>{user.nombre}</h4>
            <small style={{ opacity: 0.9 }}>{user.tipo_nombre}</small>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* Información del perfil */}
            {!showChangePassword && (
              <>


                <div className="mb-3">
                  <label style={{ fontSize: '0.875rem', color: '#666', fontWeight: 600 }}>Número de Casa</label>
                  <div style={{ padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', marginTop: '0.25rem' }}>
                    {casaNumero || "Cargando..."}
                  </div>
                </div>

                <div className="mb-3">
                  <label style={{ fontSize: '0.875rem', color: '#666', fontWeight: 600 }}>Correo Electrónico</label>
                  {editMode ? (
                    <input 
                      type="email" 
                      className="form-control mt-1"
                      value={formData.correo}
                      onChange={e => setFormData({...formData, correo: e.target.value})}
                    />
                  ) : (
                    <div style={{ padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', marginTop: '0.25rem' }}>
                      {user.correo || "No especificado"}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label style={{ fontSize: '0.875rem', color: '#666', fontWeight: 600 }}>Teléfono</label>
                  {editMode ? (
                    <input 
                      type="tel" 
                      className="form-control mt-1"
                      value={formData.telefono}
                      onChange={e => setFormData({...formData, telefono: e.target.value})}
                    />
                  ) : (
                    <div style={{ padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px', marginTop: '0.25rem' }}>
                      {user.telefono ? String(user.telefono) : "No especificado"}
                    </div>
                  )}
                </div>

                {/* Campo de contraseña cuando está en modo edición */}
                {editMode && (
                  <div className="mb-3">
                    <label style={{ fontSize: '0.875rem', color: '#666', fontWeight: 600 }}>Contraseña Actual</label>
                    <div className="input-group mt-1">
                      <input 
                        type={showCurrentPassword ? "text" : "password"} 
                        className="form-control"
                        placeholder="Ingresa tu contraseña para confirmar cambios"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                      />
                      <button 
                        className="btn btn-outline-secondary" 
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ borderLeft: 0 }}
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </button>
                    </div>
                    <small className="text-muted">Requerido para actualizar tu perfil</small>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="d-flex gap-2 mt-4">
                  {editMode ? (
                    <>
                      <button 
                        className="btn btn-success flex-fill" 
                        onClick={handleSaveProfile}
                        disabled={saving}
                      >
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                      <button 
                        className="btn btn-secondary flex-fill" 
                        onClick={() => {
                          setEditMode(false);
                          setCurrentPassword("");
                        }}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-primary flex-fill" 
                        onClick={() => setEditMode(true)}
                      >
                        <EditIcon style={{ fontSize: 18, marginRight: '0.25rem' }} />
                        Editar Perfil
                      </button>
                      <button 
                        className="btn btn-warning flex-fill" 
                        onClick={() => setShowChangePassword(true)}
                      >
                        <LockIcon style={{ fontSize: 18, marginRight: '0.25rem' }} />
                        Cambiar Contraseña
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Formulario cambiar contraseña */}
            {showChangePassword && (
              <>
                <h5 className="mb-3">Cambiar Contraseña</h5>
                <div className="mb-3">
                  <label className="form-label">Contraseña Actual</label>
                  <div className="input-group">
                    <input 
                      type={showPasswordActual ? "text" : "password"} 
                      className="form-control"
                      value={passwordData.actual}
                      onChange={e => setPasswordData({...passwordData, actual: e.target.value})}
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => setShowPasswordActual(!showPasswordActual)}
                      style={{ borderLeft: 0 }}
                    >
                      {showPasswordActual ? <VisibilityOff /> : <Visibility />}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Nueva Contraseña</label>
                  <div className="input-group">
                    <input 
                      type={showPasswordNueva ? "text" : "password"} 
                      className="form-control"
                      value={passwordData.nueva}
                      onChange={e => setPasswordData({...passwordData, nueva: e.target.value})}
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => setShowPasswordNueva(!showPasswordNueva)}
                      style={{ borderLeft: 0 }}
                    >
                      {showPasswordNueva ? <VisibilityOff /> : <Visibility />}
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirmar Nueva Contraseña</label>
                  <div className="input-group">
                    <input 
                      type={showPasswordConfirmar ? "text" : "password"} 
                      className="form-control"
                      value={passwordData.confirmar}
                      onChange={e => setPasswordData({...passwordData, confirmar: e.target.value})}
                    />
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => setShowPasswordConfirmar(!showPasswordConfirmar)}
                      style={{ borderLeft: 0 }}
                    >
                      {showPasswordConfirmar ? <VisibilityOff /> : <Visibility />}
                    </button>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-success flex-fill" 
                    onClick={handleChangePassword}
                    disabled={saving}
                  >
                    {saving ? "Actualizando..." : "Actualizar Contraseña"}
                  </button>
                  <button 
                    className="btn btn-secondary flex-fill" 
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({ actual: "", nueva: "", confirmar: "" });
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {/* Botón cerrar */}
            {!editMode && !showChangePassword && (
              <button className="btn btn-outline-secondary w-100 mt-3" onClick={handleClose}>
                Cerrar
              </button>
            )}
          </div>
        </Box>
      </Modal>
    </>
  );
}

export default HeaderBar;
