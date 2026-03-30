import React, { memo } from "react";

const Terminal = memo(({ activeFileName }) => {
  return (
    <div className="terminal">
      <div className="terminal-status">
        <span>Terminal</span>
        <span className="terminal-active">{activeFileName || "No file selected"}</span>
      </div>
      <div className="terminal-window">
        <div className="terminal-prompt">~  {activeFileName ? `Editing ${activeFileName}` : "Ready"}</div>
      </div>
    </div>
  );
});

export default Terminal;
