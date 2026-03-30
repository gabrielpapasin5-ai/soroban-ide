import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Tabs from "./Tabs";
import Editor from "./Editor";
import Terminal from "./Terminal";

const baseWorkspace = [
  {
    id: "root",
    name: "soroban-studio",
    type: "folder",
    children: [
      {
        id: "src",
        name: "src",
        type: "folder",
        children: [
          {
            id: "main_rs",
            name: "main.rs",
            type: "file",
            children: [],
          },
          {
            id: "lib_rs",
            name: "lib.rs",
            type: "file",
            children: [],
          },
        ],
      },
      {
        id: "tests",
        name: "tests",
        type: "folder",
        children: [
          {
            id: "test_main",
            name: "main_test.rs",
            type: "file",
            children: [],
          },
        ],
      },
      {
        id: "cargo",
        name: "Cargo.toml",
        type: "file",
        children: [],
      },
      {
        id: "readme",
        name: "README.md",
        type: "file",
        children: [],
      },
    ],
  },
];

const defaultFileTemplates = {
  "main.rs": `fn main() {
    println!("Hello, Soroban Studio!");
}
`,
  "lib.rs": `pub fn greet() -> &'static str {
    "Soroban Studio"
}
`,
  "main_test.rs": `#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        assert_eq!(greet(), "Soroban Studio");
    }
}
`,
  "Cargo.toml": `[package]
name = "soroban-studio"
version = "0.1.0"
edition = "2021"

[dependencies]
`,
  "README.md": `# Soroban Studio

VS Code inspired editor powered by Monaco.
`,
};

const cloneTree = (input) => JSON.parse(JSON.stringify(input));

const createWorkspace = () => {
  const tree = cloneTree(baseWorkspace);
  const contents = {};

  const createContents = (nodes) => {
    nodes.forEach((node) => {
      if (node.type === "file") {
        contents[node.id] = defaultFileTemplates[node.name] ?? `// ${node.name}\n`;
      }
      if (node.children?.length) {
        createContents(node.children);
      }
    });
  };

  createContents(tree);
  return { tree, contents };
};

const addNodeToTree = (nodes, parentId, newNode) => {
  return nodes.map((node) => {
    if (node.id === parentId && node.type === "folder") {
      return {
        ...node,
        children: [...node.children, newNode],
      };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: addNodeToTree(node.children, parentId, newNode),
      };
    }
    return node;
  });
};

const uniqueId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getLanguageFromName = (name) => {
  if (!name) return "rust";
  const ext = name.split(".").at(-1)?.toLowerCase();
  const map = {
    rs: "rust",
    toml: "toml",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    md: "markdown",
  };
  return map[ext] ?? "rust";
};

const Layout = () => {
  const workspaceSeed = useMemo(() => createWorkspace(), []);
  const rootId = workspaceSeed.tree[0]?.id ?? "root";

  const [treeData, setTreeData] = useState(workspaceSeed.tree);
  const [fileContents, setFileContents] = useState(workspaceSeed.contents);
  const [expandedFolders, setExpandedFolders] = useState(() => new Set([rootId]));
  const [tabs, setTabs] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  const flattenedNodes = useMemo(() => {
    const map = new Map();
    const traverse = (nodes, currentPath = "") => {
      nodes.forEach((node) => {
        const path = currentPath ? `${currentPath}/${node.name}` : node.name;
        map.set(node.id, { ...node, path });
        if (node.children?.length) {
          traverse(node.children, path);
        }
      });
    };
    traverse(treeData);
    return map;
  }, [treeData]);

  const activeFile = activeFileId ? flattenedNodes.get(activeFileId) : null;
  const activeContent = activeFileId ? fileContents[activeFileId] : "";
  const language = activeFile ? getLanguageFromName(activeFile.name) : "rust";

  const handleSelectFile = useCallback(
    (nodeId) => {
      const node = flattenedNodes.get(nodeId);
      if (!node || node.type !== "file") return;
      setActiveFileId(nodeId);
      setTabs((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
    },
    [flattenedNodes]
  );

  const handleCloseTab = useCallback(
    (nodeId) => {
      setTabs((prev) => {
        const filtered = prev.filter((id) => id !== nodeId);
        if (activeFileId === nodeId) {
          const nextActive = filtered[filtered.length - 1] ?? null;
          setActiveFileId(nextActive);
        }
        return filtered;
      });
    },
    [activeFileId]
  );

  const handleToggleFolder = useCallback((folderId) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const handleRefresh = useCallback(() => {
    const fresh = createWorkspace();
    setTreeData(fresh.tree);
    setFileContents(fresh.contents);
    setTabs([]);
    setActiveFileId(null);
    setExpandedFolders(new Set([fresh.tree[0]?.id ?? "root"]));
  }, []);

  const handleNewItem = useCallback(
    (type) => {
      const label = type === "folder" ? "folder" : "file";
      const defaultName = type === "folder" ? "NewFolder" : "NewFile.rs";
      const name = window.prompt(`Enter a ${label} name`, defaultName)?.trim();
      if (!name) return;
      const newId = uniqueId();
      const newNode = {
        id: newId,
        name,
        type,
        children: [],
      };

      setTreeData((prev) => addNodeToTree(prev, rootId, newNode));
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(rootId);
        if (type === "folder") {
          next.add(newId);
        }
        return next;
      });

      if (type === "file") {
        setFileContents((prev) => ({
          ...prev,
          [newId]: defaultFileTemplates[name] ?? `// ${name}\n`,
        }));
        setTabs((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
        setActiveFileId(newId);
      }
    },
    [rootId]
  );

  const handleEditorChange = useCallback(
    (value) => {
      if (!activeFileId) return;
      setFileContents((prev) => ({
        ...prev,
        [activeFileId]: value,
      }));
    },
    [activeFileId]
  );

  useEffect(() => {
    const handler = (event) => {
      const key = event.key.toLowerCase();
      if (key === "s" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        console.log("Simulated save:", activeFile?.path);
      }
      if (key === "w" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (activeFileId) {
          handleCloseTab(activeFileId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFile, activeFileId, handleCloseTab]);

  return (
    <div className="app-shell">
      <Sidebar
        tree={treeData}
        expandedFolders={expandedFolders}
        onToggleFolder={handleToggleFolder}
        onFileSelect={handleSelectFile}
        onNewFile={() => handleNewItem("file")}
        onNewFolder={() => handleNewItem("folder")}
        onRefresh={handleRefresh}
        onCollapseAll={handleCollapseAll}
        activeFileId={activeFileId}
      />
      <div className="workspace">
        <Tabs
          tabs={tabs}
          activeFileId={activeFileId}
          files={flattenedNodes}
          onTabSelect={setActiveFileId}
          onTabClose={handleCloseTab}
        />
        <div className="editor-area">
          <Editor
            fileId={activeFileId}
            filePath={activeFile?.path}
            content={activeContent}
            language={language}
            onChange={handleEditorChange}
          />
        </div>
        <Terminal activeFileName={activeFile?.path} />
      </div>
    </div>
  );
};

export default Layout;
