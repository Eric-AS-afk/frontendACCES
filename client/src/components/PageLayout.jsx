import React from "react";
import icono from "../assets/icono.jpeg";

function PageLayout({ children }) {
  return (
    <div style={{ 
      minHeight: "100vh",
      backgroundImage: `url(${icono})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      position: "relative"
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(154, 204, 119, 0.65)",
        zIndex: 0
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
