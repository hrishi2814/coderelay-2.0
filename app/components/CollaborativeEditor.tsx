"use client";

import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf, useStorage } from "@/liveblocks.config";
import { Editor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { MonacoBinding } from "y-monaco";

export default function CollaborativeEditor() {
  const room = useRoom();
  const [editor, setEditor] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [binding, setBinding] = useState<any>(null);

  // Get current user info (from the Fake Auth step!)
  const userInfo = useSelf((me) => me.info);

  // Setup Yjs + Monaco Binding
  useEffect(() => {
    if (!editor || !room) return;

    // 1. Create the shared document
    const yDoc = new Y.Doc();

    // 2. Connect it to the room
    const yProvider = new LiveblocksYjsProvider(room, yDoc);

    // 3. Bind it to the editor
    const yText = yDoc.getText("monaco");
    const monacoBinding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      yProvider.awareness
    );

    setProvider(yProvider);
    setBinding(monacoBinding);

    return () => {
      yDoc.destroy();
      yProvider.destroy();
      monacoBinding.destroy();
    };
  }, [editor, room]);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between">
        <span>Editing as: <b style={{ color: userInfo?.color }}>{userInfo?.name}</b></span>
        <span className="text-gray-400">Room Connected</span>
      </div>

      {/* The Editor */}
      <Editor
        height="90vh"
        defaultLanguage="python"
        theme="vs-dark"
        onMount={(editorInstance) => setEditor(editorInstance)}
        options={{
          minimap: { enabled: false },
          fontSize: 16,
        }}
      />
    </div>
  );
}