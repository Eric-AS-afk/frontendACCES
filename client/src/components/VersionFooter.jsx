import React from "react";

function VersionFooter() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "10px",
        fontSize: "0.75rem",
        color: "#6c757d",
        zIndex: 1000,
        userSelect: "none",
      }}
    >
      Version: Alpha 1.01
    </div>
  );
}

export default VersionFooter;
