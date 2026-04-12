import React, { memo, useCallback, useState } from "react";
import { FileIconImg, FolderIconImg } from "../../components/icons/FileIcon";
import { ChevronDown, ChevronRight } from "../../components/icons/ChevronIcons";
import { sortNodes, findParentId, uniqueId } from "../workspace/workspaceUtils";
import { fetchFolderContents } from "../../services/backendService";
import InlineInput from "./InlineInput";
import RenameInput from "./RenameInput";

/**
 * Recursive tree node component for the file explorer.
 * Renders a single file or folder with all its interactions.
 * Supports lazy-loading for large folders (node_modules, target).
 */
const ExplorerNode = memo(({ node, depth, tree, expandedFolders, onToggleFolder, onFileSelect, activeFileId, onSelectFolder, selectedFolderId, inlineInput, onInlineSubmit, onInlineCancel, onContextMenu, renameNode, onRenameSubmit, onRenameCancel, onMoveItem, onUploadFiles, dragState, setDragState, clipboard, folderUploadProgress, setFolderUploadProgress, lastSessionId, setTreeData, isChildOfLazy = false }) => {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFolderId === node.id;
  const isRenaming = renameNode?.id === node.id;
  const isDragging = dragState?.draggingId === node.id;
  const isDragOver = dragState?.dragOverId === node.id;
  const isCut = clipboard?.nodeId === node.id && clipboard?.operation === "cut";
  const isLazy = node.lazy === true;
  const indent = depth * 8;

  const [isLoadingLazy, setIsLoadingLazy] = useState(false);

  /**
   * Build the relative path for this node by walking up the tree.
   */
  const getNodePath = useCallback(
    (targetNode) => {
      const parts = [];
      const walk = (nodes, target) => {
        for (const n of nodes) {
          if (n.id === target.id) {
            parts.push(n.name);
            return true;
          }
          if (n.children?.length) {
            if (walk(n.children, target)) {
              parts.unshift(n.name);
              return true;
            }
          }
        }
        return false;
      };
      walk(tree, targetNode);
      // Remove the root folder name (it's the workspace name, not part of the path)
      if (parts.length > 1) parts.shift();
      return parts.join("/");
    },
    [tree],
  );

  /**
   * Convert backend FileTreeNode entries to workspace tree nodes.
   */
  const convertNodes = (backendNodes) => {
    return (backendNodes || []).map((bn) => {
      const dependencyFolders = ["target", "node_modules", "dist", "build", "vendor", "deps", "__pycache__", ".venv", "venv", "cache", "tmp", ".next", ".nuxt"];
      const isDependencyFolder = dependencyFolders.includes(bn.name);

      const node = {
        id: uniqueId(),
        name: bn.name,
        type: bn.type === "folder" ? "folder" : "file",
        children: bn.children?.length ? convertNodes(bn.children) : [],
        lazy: bn.lazy || isDependencyFolder, // Mark dependency folders as lazy
      };

      // Debug log for lazy folders
      if (node.lazy) {
        console.log(`[ExplorerNode] convertNodes: ${bn.name} is lazy (backend: ${bn.lazy}, dependency: ${isDependencyFolder})`);
      }

      return node;
    });
  };

  /**
   * Load lazy folder contents from the backend API.
   */
  const loadLazyFolder = useCallback(async () => {
    if (!lastSessionId) {
      console.warn("[ExplorerNode] No session ID for lazy load");
      return;
    }

    const path = getNodePath(node);
    if (!path) {
      console.warn("[ExplorerNode] Could not get path for node:", node.name);
      return;
    }

    console.log("[ExplorerNode] Starting lazy load for:", node.name, "path:", path);
    setIsLoadingLazy(true);
    try {
      const children = await fetchFolderContents(lastSessionId, path);
      console.log("[ExplorerNode] Fetched children for", node.name, ":", children.length, "items");
      const newChildren = convertNodes(children);

      // Update the tree: replace this node's children but preserve lazy flag for dependency folders
      setTreeData?.((prevTree) => {
        const updateNode = (nodes) =>
          nodes.map((n) => {
            if (n.id === node.id) {
              // Check if this is a dependency folder that should stay lazy
              const dependencyFolders = ["target", "node_modules", "dist", "build", "vendor", "deps", "__pycache__", ".venv", "venv", "cache", "tmp", ".next", ".nuxt"];
              const shouldStayLazy = dependencyFolders.includes(node.name);

              console.log(`[ExplorerNode] loading lazy folder ${node.name}, shouldStayLazy: ${shouldStayLazy}, children count: ${newChildren.length}`);

              return {
                ...n,
                children: newChildren,
                lazy: shouldStayLazy, // Keep lazy flag for dependency folders
              };
            }
            if (n.children?.length) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        return updateNode(prevTree);
      });

      // Expand the folder
      onToggleFolder(node.id);
    } catch (err) {
      console.error("[ExplorerNode] Failed to load lazy folder:", err);
    } finally {
      setIsLoadingLazy(false);
    }
  }, [lastSessionId, node, getNodePath, setTreeData, onToggleFolder]);

  const handleClick = useCallback(() => {
    if (isFolder) {
      // Check if we need to load lazy folder contents
      const needsLazyLoad = isLazy && !isExpanded && !node.children?.length;

      if (needsLazyLoad) {
        // Lazy folder: load contents from API on first expand
        console.log("[ExplorerNode] loading lazy folder on first expand:", node.name);
        loadLazyFolder();
      } else {
        // Normal toggle for expanded folders or non-lazy folders
        console.log("[ExplorerNode] toggling folder:", node.name, { isExpanded, isLazy, hasChildren: !!node.children?.length });
        onToggleFolder(node.id);
      }
      onSelectFolder?.(node.id);
    } else {
      onFileSelect(node.id);
    }
  }, [isFolder, isLazy, isExpanded, node.id, node.children, onToggleFolder, onSelectFolder, onFileSelect, loadLazyFolder]);

  const handleContextMenuEvent = useCallback((e) => onContextMenu(e, node), [node, onContextMenu]);

  const handleDragStart = useCallback(
    (e) => {
      e.dataTransfer.setData("text/plain", node.id);
      e.dataTransfer.effectAllowed = "move";
      setDragState?.({ draggingId: node.id, dragOverId: null });
    },
    [node.id, setDragState],
  );

  const handleDragEnd = useCallback(() => {
    setDragState?.({ draggingId: null, dragOverId: null });
  }, [setDragState]);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isExternal = e.dataTransfer.types.includes("Files");
      const targetFolderId = isFolder ? node.id : findParentId(tree, node.id);

      if (isExternal) {
        const files = e.dataTransfer.files;
        if (files?.length && onUploadFiles && targetFolderId) {
          const filesArray = Array.from(files);
          setFolderUploadProgress?.((prev) => ({
            ...prev,
            [targetFolderId]: { current: 0, total: filesArray.length },
          }));
          for (let i = 0; i < filesArray.length; i++) {
            try {
              await onUploadFiles([filesArray[i]], targetFolderId);
            } catch (err) {
              console.error("Upload failed:", filesArray[i].name, err);
            }
            setFolderUploadProgress?.((prev) => ({
              ...prev,
              [targetFolderId]: { current: i + 1, total: filesArray.length },
            }));
          }
          setTimeout(() => {
            setFolderUploadProgress?.((prev) => {
              const next = { ...prev };
              delete next[targetFolderId];
              return next;
            });
          }, 500);
        }
      } else {
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== node.id && targetFolderId) {
          onMoveItem?.(draggedId, targetFolderId);
        }
      }
      setDragState?.({ draggingId: null, dragOverId: null });
    },
    [node.id, isFolder, tree, onMoveItem, onUploadFiles, setDragState, setFolderUploadProgress],
  );

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExternal = e.dataTransfer.types.includes("Files");
      e.dataTransfer.dropEffect = isExternal ? "copy" : "move";
      const targetId = isFolder ? node.id : findParentId(tree, node.id);
      if (targetId && dragState?.dragOverId !== targetId) {
        setDragState?.({ ...dragState, dragOverId: targetId });
      }
    },
    [node.id, isFolder, tree, dragState, setDragState],
  );

  const handleDragLeave = useCallback(
    (e) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget)) {
        if (dragState?.dragOverId === node.id || dragState?.dragOverId === findParentId(tree, node.id)) {
          setDragState?.({ ...dragState, dragOverId: null });
        }
      }
    },
    [node.id, tree, dragState, setDragState],
  );

  const sharedProps = {
    onContextMenu: handleContextMenuEvent,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    draggable: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  };

  /* ─── Folder rendering ─── */
  if (isFolder) {
    if (isRenaming) {
      return (
        <div className="sidebar-node">
          <RenameInput type="folder" depth={depth} onSubmit={onRenameSubmit} onCancel={onRenameCancel} defaultValue={node.name} />
        </div>
      );
    }

    const className = ["sidebar-folder", isExpanded && "expanded", isSelected && "selected", isDragOver && "drag-over", isDragging && "dragging", isCut && "cut", isLazy && "lazy-folder"].filter(Boolean).join(" ");

    // Debug: log lazy folder state
    if (isLazy) {
      console.log("[ExplorerNode] rendering lazy folder:", node.name, {
        isSelected,
        isExpanded,
        className,
        node,
      });
    }

    // Force inline style for lazy folders and their children
    const shouldHaveLazyStyle = isLazy || isChildOfLazy;
    const lazyStyle = shouldHaveLazyStyle
      ? {
          opacity: isLazy ? 0.5 : 0.6, // Lazy folder: 0.5, children: 0.6
          color: "var(--text-muted)",
          backgroundColor: "transparent",
        }
      : {};

    return (
      <div className="sidebar-node">
        <button
          className={className}
          type="button"
          onClick={handleClick}
          style={{
            paddingLeft: `${indent + 32}px`,
            ...lazyStyle,
          }}
          {...sharedProps}>
          <span className="sidebar-chevron" style={{ position: "absolute", left: `${indent + 12}px` }}>
            {isLoadingLazy ? <span className="lazy-spinner" /> : isExpanded ? <ChevronDown /> : <ChevronRight />}
          </span>
          <span className="sidebar-node-icon">
            <FolderIconImg folderName={node.name} isOpen={isExpanded} size={18} />
          </span>
          <span className={`sidebar-node-label ${isCut ? "cut-label" : ""}`}>{node.name}</span>
          {isLazy && !isExpanded && <span className="lazy-badge">…</span>}
        </button>

        {isExpanded && (
          <div className="sidebar-children">
            {inlineInput?.parentId === node.id && <InlineInput type={inlineInput.type} depth={depth + 1} onSubmit={onInlineSubmit} onCancel={onInlineCancel} defaultValue={inlineInput.type === "file" ? "newfile" : "newfolder"} />}
            {folderUploadProgress?.[node.id] && (
              <div className="upload-progress-bar folder-progress" style={{ marginLeft: `${(depth + 1) * 8 + 8}px` }}>
                <div className="upload-progress-fill" style={{ width: `${(folderUploadProgress[node.id].current / folderUploadProgress[node.id].total) * 100}%` }} />
                <span className="upload-progress-text">
                  {folderUploadProgress[node.id].current}/{folderUploadProgress[node.id].total}
                </span>
              </div>
            )}
            {sortNodes(node.children)?.map((child) => (
              <ExplorerNode key={child.id} node={child} depth={depth + 1} tree={tree} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} onFileSelect={onFileSelect} activeFileId={activeFileId} onSelectFolder={onSelectFolder} selectedFolderId={selectedFolderId} inlineInput={inlineInput} onInlineSubmit={onInlineSubmit} onInlineCancel={onInlineCancel} onContextMenu={onContextMenu} renameNode={renameNode} onRenameSubmit={onRenameSubmit} onRenameCancel={onRenameCancel} onMoveItem={onMoveItem} onUploadFiles={onUploadFiles} dragState={dragState} setDragState={setDragState} clipboard={clipboard} folderUploadProgress={folderUploadProgress} setFolderUploadProgress={setFolderUploadProgress} lastSessionId={lastSessionId} setTreeData={setTreeData} isChildOfLazy={isLazy || isChildOfLazy} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── File rendering ─── */
  if (isRenaming) {
    return <RenameInput type="file" depth={depth} onSubmit={onRenameSubmit} onCancel={onRenameCancel} defaultValue={node.name} />;
  }

  const fileClassName = ["sidebar-file", activeFileId === node.id && "active", isDragging && "dragging", isCut && "cut"].filter(Boolean).join(" ");

  // Force inline style for files in lazy folders
  const shouldHaveLazyStyle = isChildOfLazy;
  const fileLazyStyle = shouldHaveLazyStyle
    ? {
        opacity: 0.6,
        color: "var(--text-muted)",
        backgroundColor: "transparent",
      }
    : {};

  return (
    <button
      className={fileClassName}
      type="button"
      onClick={() => onFileSelect(node.id)}
      style={{
        paddingLeft: `${indent + 32}px`,
        ...fileLazyStyle, // Apply lazy style to files too
      }}
      {...sharedProps}>
      <span className="sidebar-node-icon">
        <FileIconImg filename={node.name} size={18} />
      </span>
      <span className={`sidebar-node-label ${isCut ? "cut-label" : ""}`}>{node.name}</span>
    </button>
  );
});

export default ExplorerNode;
