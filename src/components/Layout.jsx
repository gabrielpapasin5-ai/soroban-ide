import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { loadState, saveStateSection, clearState } from "../utils/storage";
import { executeTerminalCommand, isBackendCommand } from "../features/terminal/terminalCommands";
import { collectProjectFiles, submitCommand, connectBuildStream } from "../services/backendService";
import { useWorkspaceState, useTabManager } from "../features/workspace/workspaceHooks";
import { FileIconImg, FolderIconImg } from "../components/icons/FileIcon";
import { ChevronDown, ChevronRight } from "../components/icons/ChevronIcons";
import { sortNodes, uniqueId } from "../features/workspace/workspaceUtils";
import { Plus, FolderOpen, FileText, X, Menu } from "lucide-react";
import Sidebar from "../features/sidebar/Sidebar";
import Tabs from "../features/tabs/Tabs";
import Editor from "../features/editor/Editor";
import Terminal from "../features/terminal/Terminal";
import { getLanguageFromName, getLanguageDisplayName } from "../features/editor/editorUtils";
import { cloneNodeWithNewIds, addNodeToTree, moveNodeInTree } from "../features/workspace/workspaceUtils";

/**
 * Main Layout — the slim orchestrator.
 * Composes workspace state hooks with UI feature components.
 */
const Layout = () => {
  const workspace = useWorkspaceState();
  const tabManager = useTabManager(workspace.flattenedNodes);

  const [clipboardState, setClipboardState] = useState(null);
  const [cursorInfo, setCursorInfo] = useState({ lineNumber: 1, column: 1, selectedChars: 0 });
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showGithubClone, setShowGithubClone] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [cloneStatus, setCloneStatus] = useState(null);
  const [lastSessionId, setLastSessionId] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const createMenuRef = useRef(null);
  const setFileContentsRef = useRef(workspace.setFileContents);
  const previewTabIdRef = useRef(tabManager.previewTabId);
  const activeFileIdRef = useRef(tabManager.activeFileId);

  // Keep refs up to date
  useEffect(() => {
    setFileContentsRef.current = workspace.setFileContents;
  }, [workspace.setFileContents]);

  useEffect(() => {
    previewTabIdRef.current = tabManager.previewTabId;
  }, [tabManager.previewTabId]);

  useEffect(() => {
    activeFileIdRef.current = tabManager.activeFileId;
  }, [tabManager.activeFileId]);

  // Derived state
  const activeFile = tabManager.activeFileId ? workspace.flattenedNodes.get(tabManager.activeFileId) : null;
  const activeContent = tabManager.activeFileId ? workspace.fileContents[tabManager.activeFileId] : "";
  const language = activeFile ? getLanguageFromName(activeFile.name) : "rust";

  // Handle new item creation and open in tab
  const handleNewItem = useCallback(
    (type, name, parentId) => {
      const newId = workspace.addItem(type, name, parentId);
      if (newId && type === "file") {
        tabManager.openFile(newId);
      }
    },
    [workspace, tabManager],
  );

  // Handle delete with tab cleanup
  const handleDeleteItem = useCallback(
    (nodeId) => {
      const deletedFileIds = workspace.deleteItem(nodeId);
      deletedFileIds.forEach((fileId) => {
        if (tabManager.tabs.includes(fileId)) {
          tabManager.closeTab(fileId);
        }
      });
    },
    [workspace, tabManager],
  );

  // Handle editor content changes - auto-save to permanent state
  const handleEditorChange = useCallback(
    (value) => {
      const fileId = activeFileIdRef.current;
      const previewId = previewTabIdRef.current;

      if (!fileId) return;

      // Update file content
      workspace.setFileContents((prev) => ({
        ...prev,
        [fileId]: value,
      }));

      // Auto-promote preview tab to permanent when editing
      if (previewId && previewId === fileId) {
        tabManager.setPreviewTabId(null);
      }
    },
    [workspace, tabManager],
  );

  // Handle cursor position changes from editor
  const handleCursorChange = useCallback((info) => {
    setCursorInfo(info);
  }, []);

  // Clipboard operations
  const handleCopyItem = useCallback((nodeId) => {
    setClipboardState({ nodeId, operation: "copy" });
  }, []);

  const handleCutItem = useCallback((nodeId) => {
    setClipboardState({ nodeId, operation: "cut" });
  }, []);

  const handlePasteItem = useCallback(
    (targetParentId) => {
      if (!clipboardState?.nodeId || !clipboardState?.operation) return;

      const sourceNode = workspace.flattenedNodes.get(clipboardState.nodeId);
      if (!sourceNode) {
        setClipboardState(null);
        return;
      }

      if (clipboardState.nodeId === targetParentId) return;

      if (clipboardState.operation === "copy") {
        const idMapping = {};
        const cloned = cloneNodeWithNewIds(sourceNode, idMapping);
        // We need to use workspace internals for copy
        workspace.moveItem.__treeDataSetter?.((prev) => addNodeToTree(prev, targetParentId, cloned.node));
        // For now, just use moveItem approach — copy via addItem
      } else if (clipboardState.operation === "cut") {
        workspace.moveItem(clipboardState.nodeId, targetParentId);
        setClipboardState(null);
      }
    },
    [clipboardState, workspace],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true";
      if (isInput) return;

      const key = event.key.toLowerCase();
      if (key === "s" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (tabManager.previewTabId && tabManager.previewTabId === tabManager.activeFileId) {
          tabManager.setPreviewTabId(null);
        }
      }
      if (key === "w" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        if (tabManager.activeFileId) tabManager.closeTab(tabManager.activeFileId);
        return false;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabManager]);

  // Close create menu clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Convert backend FileTreeNode → workspace tree node format
  const convertBackendNodes = useCallback((backendNodes) => {
    return backendNodes.map((bn) => {
      const node = {
        id: uniqueId(),
        name: bn.name,
        type: bn.type === "folder" ? "folder" : "file",
        children: bn.children?.length ? convertBackendNodes(bn.children) : [],
        lazy: bn.lazy || false,
      };

      // Debug log for lazy folders
      if (bn.lazy) {
        console.log("[Layout] converting lazy folder:", bn.name, "children:", bn.children?.length || 0);
      }

      return node;
    });
  }, []);

  // Handle file tree update from backend (after command execution)
  const handleFileTreeUpdate = useCallback(
    (backendNodes, sessionId) => {
      console.log("[Layout] === FILE TREE UPDATE RECEIVED ===");
      console.log("[Layout] backendNodes:", backendNodes);

      const newChildren = convertBackendNodes(backendNodes);
      console.log("[Layout] converted newChildren:", newChildren);

      // Build file contents map from backend nodes
      const newFileContents = {};
      const extractContents = (nodes, path = "") => {
        nodes.forEach((node) => {
          const fullPath = path ? `${path}/${node.name}` : node.name;
          if (node.type === "file" && node.content !== undefined) {
            newFileContents[fullPath] = node.content;
          }
          if (node.children) {
            extractContents(node.children, fullPath);
          }
        });
      };
      extractContents(backendNodes);
      console.log("[Layout] extracted file contents:", Object.keys(newFileContents));

      // Replace workspace root with Soroban project
      workspace.setTreeData((prevTree) => {
        const root = prevTree[0];
        if (!root) return prevTree;

        // Create completely new root with project children
        const newRoot = {
          ...root,
          children: newChildren,
          id: uniqueId(), // Force new ID to trigger re-render
        };

        console.log("[Layout] new root with children:", newRoot);
        return [newRoot];
      });

      // Update file contents
      if (Object.keys(newFileContents).length > 0) {
        workspace.setFileContents(newFileContents);
        console.log("[Layout] file contents updated");
      }

      setLastSessionId(sessionId);
      console.log("[Layout] === FILE TREE UPDATE COMPLETED ===");
    },
    [workspace, convertBackendNodes],
  );

  // Create project handlers
  const handleCreateHelloWorld = useCallback(async () => {
    try {
      console.log("[Layout] === STARTING CREATE HELLO WORLD ===");
      console.log("[Layout] Current treeData before clear:", workspace.treeData);
      console.log("[Layout] Current fileContents before clear:", workspace.fileContents);

      setIsCreatingProject(true);
      setShowCreateMenu(false);

      // Clear all existing state from localStorage and backend
      clearState();
      tabManager.resetTabs();

      // Reset workspace to empty state immediately
      console.log("[Layout] Resetting workspace to empty...");
      workspace.setTreeData([
        {
          id: uniqueId(),
          name: "workspace",
          type: "folder",
          children: [],
        },
      ]);
      workspace.setFileContents({});

      console.log("[Layout] Workspace reset complete");
      console.log("[Layout] New treeData after reset:", workspace.treeData);

      // Small delay to ensure state reset completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create minimal workspace structure for backend
      const files = {
        "README.md": "# Soroban Project\n\nCreated with Soroban Studio",
      };

      console.log("[Layout] Sending files to backend:", files);

      // Run stellar contract init command to create hello world project
      const sessionId = await submitCommand(files, "stellar contract init soroban-hello-world");

      console.log("[Layout] Got sessionId:", sessionId);

      // Connect to WebSocket to stream output and update file tree
      const cleanup = connectBuildStream(sessionId, {
        onMessage: (msg) => {
          console.log("[Layout] === WEBSOCKET MESSAGE ===");
          console.log("[Layout] msg.type:", msg.type);
          console.log("[Layout] msg.content:", msg.content);
          console.log("[Layout] full msg:", msg);

          // Handle file tree updates from backend
          if (msg.type === "fileTreeUpdate") {
            console.log("[Layout] === FILE TREE UPDATE DETECTED ===");
            try {
              let nodes;
              if (typeof msg.content === "string") {
                nodes = JSON.parse(msg.content);
              } else {
                nodes = msg.content || msg.data;
              }
              console.log("[Layout] parsed nodes:", nodes);
              console.log("[Layout] calling handleFileTreeUpdate...");
              handleFileTreeUpdate(nodes, sessionId);
              console.log("[Layout] handleFileTreeUpdate called successfully");
              // File tree update means command completed successfully
              setIsCreatingProject(false);
              console.log("[Layout] loading stopped via fileTreeUpdate");
              cleanup();
            } catch (e) {
              console.error("[Layout] === ERROR parsing fileTreeUpdate ===:", e);
            }
          }

          // Check for various completion signals from backend output
          if (msg.type === "output" || msg.type === "stdout") {
            const content = msg.content || msg.data || "";
            console.log("[Layout] output content:", content);
            if (content.includes("Command completed successfully") || content.includes("soroban-hello-world") || content.includes("Project created") || content.includes("✓") || content.includes("Initialized") || content.includes("Created")) {
              setIsCreatingProject(false);
              console.log("[Layout] loading stopped via output signal");
            }
          }

          // Check for done signal from backend
          if (msg.type === "done") {
            console.log("[Layout] === DONE SIGNAL RECEIVED ===");
            setIsCreatingProject(false);
            cleanup();
          }
        },
        onError: (error) => {
          console.error("[Layout] Hello World creation error:", error);
          setIsCreatingProject(false);
        },
        onDone: () => {
          console.log("[Layout] Hello World onDone callback triggered");
          setIsCreatingProject(false);
        },
        onClose: () => {
          console.log("[Layout] Hello World WebSocket closed - command finished");
          setIsCreatingProject(false);
        },
      });
    } catch (error) {
      console.error("Failed to create Hello World project:", error);
      setIsCreatingProject(false);
      // Fallback to frontend template if backend fails
      clearState();
      workspace.createProject("hello-world");
      tabManager.resetTabs();
      setShowCreateMenu(false);
    }
  }, [workspace, tabManager, handleFileTreeUpdate]);

  // ... (rest of the code remains the same)
  const handleCreateBlank = useCallback(() => {
    // Clear all existing state before creating blank project
    clearState();
    workspace.createProject("blank");
    tabManager.resetTabs();
    setShowCreateMenu(false);
  }, [workspace, tabManager]);

  const handleOpenGithubClone = useCallback(() => {
    setShowGithubClone(true);
    setShowCreateMenu(false);
    setGithubUrl("");
    setCloneStatus(null);
  }, []);

  const handleCloneGithub = useCallback(async () => {
    if (!githubUrl.trim()) return;
    setCloneStatus({ type: "loading", message: "Fetching repository from GitHub..." });

    try {
      await workspace.cloneFromGithub(githubUrl);
      tabManager.resetTabs();
      setCloneStatus({ type: "success", message: "Repository cloned successfully!" });
      setTimeout(() => {
        setShowGithubClone(false);
        setCloneStatus(null);
        setGithubUrl("");
      }, 1500);
    } catch (err) {
      setCloneStatus({ type: "error", message: err.message || "Failed to clone repository" });
    }
  }, [githubUrl, workspace, tabManager]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true";
      if (isInput) return;

      const key = event.key.toLowerCase();
      if (key === "s" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (tabManager.previewTabId && tabManager.previewTabId === tabManager.activeFileId) {
          tabManager.setPreviewTabId(null);
        }
      }
      if (key === "w" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        if (tabManager.activeFileId) tabManager.closeTab(tabManager.activeFileId);
        return false;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tabManager]);

  // Close create menu clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-shell">
      <div className="app-main">
        <Sidebar tree={workspace.treeData} expandedFolders={workspace.expandedFolders} onToggleFolder={workspace.toggleFolder} onFileSelect={tabManager.selectFile} onNewFile={(name, parentId) => handleNewItem("file", name, parentId)} onNewFolder={(name, parentId) => handleNewItem("folder", name, parentId)} onDeleteItem={handleDeleteItem} onRenameItem={workspace.renameItem} onMoveItem={workspace.moveItem} onUploadFiles={workspace.uploadFiles} onCopyItem={handleCopyItem} onCutItem={handleCutItem} onPasteItem={handlePasteItem} clipboard={clipboardState} onCollapseAll={workspace.collapseAll} activeFileId={tabManager.activeFileId} lastSessionId={lastSessionId} setTreeData={workspace.setTreeData} />

        {/* Project Creation Loading Overlay */}
        {isCreatingProject && (
          <div className="project-creation-overlay">
            <div className="project-creation-content">
              <div className="loading-spinner"></div>
              <div className="loading-text">Creating Soroban Project...</div>
              <div className="loading-subtext">Running: stellar contract init soroban-hello-world</div>
            </div>
          </div>
        )}

        <div className="workspace">
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border-color)", background: "var(--tab-bg)" }}>
            <Tabs tabs={tabManager.tabs} activeFileId={tabManager.activeFileId} previewTabId={tabManager.previewTabId} files={workspace.flattenedNodes} onTabSelect={tabManager.setActiveFileId} onTabClose={tabManager.closeTab} />

            <div className="create-new-container" ref={createMenuRef}>
              <button className="create-new-btn" onClick={() => setShowCreateMenu(!showCreateMenu)} title="Create New...">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="create-new-label">Create Project</span>
              </button>
              {showCreateMenu && (
                <div className="create-new-dropdown">
                  <div className="create-new-item" onClick={handleCreateHelloWorld}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Create Soroban Project
                  </div>
                  <div className="create-new-item" onClick={handleCreateBlank}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                      <polyline points="13 2 13 9 20 9" />
                    </svg>
                    Create Blank
                  </div>
                  <div className="create-new-item" onClick={handleOpenGithubClone}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    Clone from GitHub
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="editor-area">
            <Editor fileId={tabManager.activeFileId} filePath={activeFile?.path} content={activeContent} language={language} onChange={handleEditorChange} onCursorChange={handleCursorChange} />
          </div>

          {/* ─── File Tree Update Handler ─── */}
          <Terminal activeFileName={activeFile?.path} treeData={workspace.treeData} fileContents={workspace.fileContents} onFileTreeUpdate={handleFileTreeUpdate} />
        </div>
      </div>

      {/* Status bar - full width at bottom */}
      <div className="status-bar">
        <div className="status-bar-left">{/* Empty or can add other info here */}</div>
        <div className="status-bar-right">
          <span className="status-bar-cursor">
            Ln {cursorInfo.lineNumber}, Col {cursorInfo.column}
          </span>
          {cursorInfo.selectedChars > 0 && <span className="status-bar-selection">({cursorInfo.selectedChars} Selected)</span>}
          <span className="status-bar-encoding">UTF-8</span>
          <span className="status-bar-eol">LF</span>
          <span className="status-bar-language">{getLanguageDisplayName(language)}</span>
        </div>
      </div>

      {showGithubClone && (
        <div className="github-clone-overlay">
          <div className="github-clone-dialog">
            <h3>Clone GitHub Repository</h3>
            <input type="text" placeholder="https://github.com/username/repository.git" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCloneGithub()} autoFocus />
            {cloneStatus && <div className={`clone-status ${cloneStatus.type}`}>{cloneStatus.message}</div>}
            <div className="dialog-buttons">
              <button className="btn-cancel" onClick={() => setShowGithubClone(false)}>
                Cancel
              </button>
              <button className="btn-clone" onClick={handleCloneGithub} disabled={cloneStatus?.type === "loading"}>
                Clone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
