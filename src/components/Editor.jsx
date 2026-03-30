import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

const Editor = ({ fileId, filePath, content = "", language = "rust", onChange }) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!editorRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: content,
        language,
        theme: "vs-dark",
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace",
        fontSize: 14,
        minimap: { enabled: false },
        scrollbar: { alwaysConsumeMouseWheel: false },
      });

      const changeDisposable = editorRef.current.onDidChangeModelContent(() => {
        if (isUpdatingRef.current) return;
        onChange?.(editorRef.current.getValue());
      });

      return () => {
        changeDisposable.dispose();
        editorRef.current.dispose();
        editorRef.current = null;
      };
    }
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;
    const path = filePath ? `file://${filePath}` : `untitled://${fileId ?? "scratch"}`;
    const uri = monaco.Uri.parse(path);
    let model = monaco.editor.getModel(uri);

    isUpdatingRef.current = true;
    if (!model) {
      model = monaco.editor.createModel(content, language, uri);
    } else if (content !== undefined && model.getValue() !== content) {
      model.setValue(content);
    }
    monaco.editor.setModelLanguage(model, language);
    editorRef.current.setModel(model);
    isUpdatingRef.current = false;
  }, [fileId, filePath, content, language]);

  return <div className="editor-container" ref={containerRef} />;
};

export default Editor;
