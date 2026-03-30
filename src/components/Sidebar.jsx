import React, { memo } from "react";

const ChevronDown = () => (
  <svg viewBox="0 0 16 16" role="img" aria-hidden="true">
    <path d="M12 6l-4 4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 16 16" role="img" aria-hidden="true">
    <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const FolderIcon = () => (
  <svg viewBox="0 0 20 20" role="img" aria-hidden="true">
    <path
      d="M3 5h5l2 2h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg viewBox="0 0 20 20" role="img" aria-hidden="true">
    <path
      d="M5 2h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ActionButton = memo(({ icon, label, onClick, title }) => (
  <button className="sidebar-action" type="button" onClick={onClick} title={title || label}>
    {icon}
  </button>
));

const ExplorerNode = memo(
  ({ node, depth, expandedFolders, onToggleFolder, onFileSelect, activeFileId }) => {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders.has(node.id);
    const indent = depth * 16;

    if (isFolder) {
      return (
        <div className="sidebar-node" key={node.id}>
          <button
            className={`sidebar-folder ${isExpanded ? "expanded" : ""}`}
            type="button"
            onClick={() => onToggleFolder(node.id)}
            style={{ paddingLeft: `${indent + 12}px` }}
          >
            <span className="sidebar-chevron">
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </span>
            <span className="sidebar-node-icon">
              <FolderIcon />
            </span>
            <span className="sidebar-node-label">{node.name}</span>
          </button>
          {isExpanded && node.children?.length ? (
            <div className="sidebar-children">
              {node.children.map((child) => (
                <ExplorerNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  onFileSelect={onFileSelect}
                  activeFileId={activeFileId}
                />
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <button
        className={`sidebar-file ${activeFileId === node.id ? "active" : ""}`}
        type="button"
        onClick={() => onFileSelect(node.id)}
        style={{ paddingLeft: `${indent + 40}px` }}
      >
        <span className="sidebar-node-icon">
          <DocumentIcon />
        </span>
        <span className="sidebar-node-label">{node.name}</span>
      </button>
    );
  }
);

const Sidebar = memo(
  ({
    tree,
    expandedFolders,
    onToggleFolder,
    onFileSelect,
    onNewFile,
    onNewFolder,
    onRefresh,
    onCollapseAll,
    activeFileId,
  }) => {
    const root = tree?.[0];

    return (
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Explorer</div>
          <div className="sidebar-actions">
            <ActionButton icon={<span>+</span>} onClick={onNewFile} title="New File" />
            <ActionButton icon={<span>⋁</span>} onClick={onNewFolder} title="New Folder" />
            <ActionButton icon={<span>⟳</span>} onClick={onRefresh} title="Refresh" />
            <ActionButton icon={<span>🡡</span>} onClick={onCollapseAll} title="Collapse All" />
          </div>
        </div>
        <div className="sidebar-body">
          {root ? (
            <ExplorerNode
              node={root}
              depth={0}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileSelect={onFileSelect}
              activeFileId={activeFileId}
            />
          ) : (
            <div className="sidebar-empty">No workspace loaded</div>
          )}
        </div>
      </aside>
    );
  }
);

export default Sidebar;
