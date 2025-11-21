import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/auth.jsx";
import { useNavigate } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import VersionFooter from "../components/VersionFooter";
import fondo from "../assets/fondo.jpeg";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/usuarios/login", {
        US_NOMBRE: username,
        US_CONTRASEÑA: password,
      });
      if (res.data && res.data.success) {
        const usuario = res.data.usuario;
        console.log("Usuario data from login:", usuario);
        localStorage.setItem("id", usuario.US_USUARIO);
        localStorage.setItem("usuario", usuario.US_NOMBRE);
        localStorage.setItem("correo", usuario.US_CORREO || "");
        localStorage.setItem("telefono", String(usuario.US_TELEFONO || ""));
        localStorage.setItem("casa", String(usuario.CAS_CASA || ""));
        // Guardar también el ID numérico del tipo de usuario para controles de rol
        if (usuario.TIP_TIPO_USUARIO !== undefined && usuario.TIP_TIPO_USUARIO !== null) {
          localStorage.setItem("tipo_id", String(usuario.TIP_TIPO_USUARIO));
        }
        localStorage.setItem("tipo", usuario.TIP_NOMBRE || "");
        localStorage.setItem("tipo_desc", usuario.TIP_DESCRIPCION || "");
        login();
        navigate("/", { replace: true });
      } else {
        setError("Usuario o contraseña incorrectos");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError("Usuario o contraseña incorrectos");
      setIsSubmitting(false);
    }
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const sendRecovery = async (identifier) => {
    setForgotStatus('');
    setForgotLoading(true);
    try {
      await axios.post('/api/usuarios/forgot-password', { identifier });
      setForgotStatus('Correo enviado existosamente, revisa tu bandeja de entrada');
      // keep modal open and display message in the same window
    } catch (err) {
      const support = 'soporteacces@sienacces.site';
      const subject = encodeURIComponent('Solicitud de recuperación de contraseña');
      const body = encodeURIComponent(
        `Hola soporte,\n\nSolicito ayuda para recuperar la contraseña del usuario con identificador: ${identifier}\nPor favor, enviar instrucciones al correo registrado o restablecer la contraseña.\n\nGracias.`
      );
      setForgotStatus('No se pudo enviar automáticamente. Redirigiendo al cliente de correo...');
      // Open mail client
      window.location.href = `mailto:${support}?subject=${subject}&body=${body}`;
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <style>{`
        .login-bg { position: relative; min-height: 100vh; overflow: hidden; }
        .login-bg .bg-slide { 
          position: absolute; 
          inset: 0; 
          background-image: url(${fondo}), url(${fondo}); 
          background-size: auto 100%; 
          background-repeat: repeat-x; 
          background-position: 0% 50%; 
          animation: slideBackground 30s linear infinite; 
        }
        .login-bg .bg-overlay { position: absolute; inset: 0; background: rgba(19, 71, 19, 0.35); }
        .login-copy { color: #D4CDAD; }
    .login-copy h1 { font-weight: 900; letter-spacing: 1.2px; }
    .login-copy em { opacity: 0.95; font-size: 1.1rem; font-weight: 600; }
  .login-card { color: #D4CDAD; border: none; background: transparent !important; box-shadow: none !important; }
    .login-card .form-label { color: #D4CDAD; font-weight: 600; }
    .login-card h2 { color: #D4CDAD; font-weight: 700; font-size: 1.75rem; }
        .login-card .input-group-text { background: #ffffff; color: inherit; }
        .login-card .form-control { background-color: rgba(255,255,255,0.9); }
        .login-separator { position: absolute; top: 15%; bottom: 15%; left: 50%; transform: translateX(-0.5px); border-left: 2px solid rgba(212,205,173,0.5); }
        @media (max-width: 767.98px) { .login-separator { display: none; } }
        @keyframes slideBackground {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
      <div className="bg-slide" />
      <div className="bg-overlay" />
      <div className="container position-relative min-vh-100 d-flex align-items-center" style={{ zIndex: 1 }}>
        <div className="login-separator d-none d-md-block" />
        <div className="row align-items-center w-100 g-2">
          <div className="col-12 col-md-6 text-center text-md-start mb-4 mb-md-0 login-copy">
            <h1 className="display-4 m-0">ACCES</h1>
            <em>Administración de Control y Cuentas Electrónicas de Siena</em>
          </div>
          <div className="col-12 col-md-6 d-flex justify-content-center justify-content-md-start">
            <div className="card p-4 login-card" style={{ minWidth: 350 }}>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Usuario</label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contraseña</label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span className="input-group-text" style={{ background: '#ffffff' }}>
                      <IconButton
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </span>
                  </div>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div>
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => {
                        // If username field is filled, try sending recovery immediately using it
                        if (username && username.trim() !== '') {
                          sendRecovery(username.trim());
                        } else {
                          setForgotIdentifier('');
                          setForgotStatus('');
                          setShowForgot(true);
                        }
                      }}
                      style={{ color: '#7fd61bff', fontWeight: 600 }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ backgroundColor: '#942222', borderColor: '#942222' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Entrando...' : 'Entrar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <VersionFooter />
      {showForgot && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
          <div className="modal-backdrop show" onClick={() => setShowForgot(false)} />
          <div className="card p-4" style={{ width: 420, zIndex: 1060 }}>
            <h5 className="mb-3">Recuperar contraseña</h5>
            <p className="small">Ingresa tu usuario o correo registrado. </p>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Usuario o correo"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
              />
            </div>
            {forgotStatus && <div className="alert alert-info">{forgotStatus}</div>}
              <div className="d-flex justify-content-end">
                {forgotStatus && (
                  <button
                    className="btn btn-success me-2"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotStatus('');
                      setForgotIdentifier('');
                    }}
                  >
                    Volver al Inicio de Sesión
                  </button>
                )}
                <button className="btn btn-secondary me-2" onClick={() => setShowForgot(false)}>Cerrar</button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!forgotIdentifier || forgotIdentifier.trim() === '') return;
                    await sendRecovery(forgotIdentifier.trim());
                  }}
                  disabled={forgotLoading || !forgotIdentifier}
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar correo'}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
  }

export default LoginPage;
