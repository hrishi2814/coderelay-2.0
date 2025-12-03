"use client";

import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@/liveblocks.config";
import { Editor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { MonacoBinding } from "y-monaco";

export default function CollaborativeEditor() {
  const room = useRoom();
  const [editor, setEditor] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [binding, setBinding] = useState<any>(null);

  // 1. Get User Info (Will work once config uses authEndpoint)
  const userInfo = useSelf((me) => me.info);

  // 2. Output State
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!editor || !room) return;
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
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

  // 3. The Run Logic
  const handleRunCode = async () => {
    if (!editor) return;
    setIsRunning(true);
    setOutput("Running...");

    const code = editor.getValue();

    try {
      const response = await fetch("/api/submit/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            code, 
            problemId: "sum-2-nums",
        }),
      });

      const result = await response.json();
      console.log("Result 1: ",result.stdout);

      // SCENARIO 1: It's a Grader Response (Submission)
      if (result.details) {
        // If score is 100, show a big "PASSED"
        if (result.score === 100) {
          setOutput(`ALL TESTS PASSED! (Score: 100/100)\n\nTests Passed: ${result.passedTests}/${result.totalTests}`);
        } 
        // If failed, show the FIRST failed case
        else {
          const firstFail = result.details.find((r: any) => !r.passed);
          let msg = `Failed (${result.score}/100)\n`;
          if (firstFail) {
            msg += `\nFailed on Input:\n${firstFail.input}`;
            msg += `\n\nExpected:\n${firstFail.expected}`;
            msg += `\n\nActual:\n${firstFail.actual}`;
            if (firstFail.error) msg += `\n\nError Log:\n${firstFail.error}`;
          }
          setOutput(msg);
        }
      } 
      // SCENARIO 2: It's a Scratchpad Response (Simple Run)
      else if (result.stdout !== undefined) {
        if (result.stderr) {
          setOutput(`Runtime Error:\n${result.stderr}`);
        } else {
          setOutput(`> Output:\n${result.stdout}`);
        }
      }
      // SCENARIO 3: Something went wrong
      else {
        setOutput("Unknown response format from server.");
      }
    } catch (err) {
      setOutput("Failed to connect to server.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        {/* User Info Display */}
        <div className="flex items-center gap-2">
            <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: userInfo?.color || '#ccc' }}
            />
            <span>
                Editing as: <b>{userInfo?.name || "Anonymous"}</b>
            </span>
        </div>
        
        {/* RUN BUTTON */}
        <button
          onClick={handleRunCode}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-bold text-sm transition-colors ${
            isRunning 
              ? "bg-gray-600 cursor-not-allowed" 
              : "bg-green-600 hover:bg-green-500"
          }`}
        >
          {isRunning ? "Running..." : "▶ Run Code"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Editor */}
        <div className="flex-1 border-r border-gray-700">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            onMount={(editorInstance) => setEditor(editorInstance)}
            options={{ 
                minimap: { enabled: false }, 
                fontSize: 16,
                padding: { top: 20 }
            }}
          />
        </div>

        {/* Terminal */}
        <div className="h-1/3 md:h-auto md:w-1/3 bg-black p-4 font-mono text-sm overflow-auto border-t md:border-t-0 border-gray-700">
          <div className="text-gray-500 mb-2 uppercase tracking-wider text-xs border-b border-gray-800 pb-1">
            Terminal Output
          </div>
          <pre className="whitespace-pre-wrap text-green-400 font-mono">
            {output || "Ready to execute..."}
          </pre>
        </div>
      </div>
    </div>
  );
}