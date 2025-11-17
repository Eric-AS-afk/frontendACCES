import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.sienacces.site';

export default function ImageModal({ filename, show, onClose, title }) {
  if (!show || !filename) return null;

  const src = filename.startsWith('http') ? filename : `${API_BASE}/uploads/evidencias/${filename}`;

  return (
    <div style={backdropStyle} onClick={onClose} role="presentation">
      <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>{title || 'Evidencia'}</strong>
          <button className="btn btn-sm btn-light" onClick={onClose} aria-label="Cerrar">Cerrar</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src={src} alt={title || filename} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 6 }} />
        </div>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <a className="btn btn-sm btn-outline-primary" href={src} target="_blank" rel="noreferrer">Abrir en pestaña</a>
          <a className="btn btn-sm btn-primary ms-2" href={src} download>Descargar</a>
        </div>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: 16,
};

const containerStyle = {
  background: '#fff',
  borderRadius: 8,
  maxWidth: 980,
  width: '100%',
  padding: 16,
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)'
};
