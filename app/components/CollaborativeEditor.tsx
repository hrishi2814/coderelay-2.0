"use client";

import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf, useStorage, useMutation, useOthers } from "@/liveblocks.config";
import { Editor } from "@monaco-editor/react";
import { useEffect, useState, useCallback } from "react";
import { MonacoBinding } from "y-monaco";

type ProblemSummary = { id: string; title: string; difficulty: string };

export default function CollaborativeEditor() {
  const room = useRoom();
  const userInfo = useSelf((me) => me.info);
  const myId = useSelf((me) => me.id);
  const others = useOthers();

  // --- GAME STATE FROM LIVEBLOCKS ---
  const currentTurnUserId = useStorage((root) => root.currentTurnUserId);
  const turnExpiresAt = useStorage((root) => root.turnExpiresAt);
  
  // Local UI State
  const [editor, setEditor] = useState<any>(null);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [activeDescription, setActiveDescription] = useState<string>("");

  // 1. Derived State: Is it my turn?
  // If game hasn't started (currentTurnUserId is null), allow typing for testing
  const isGameActive = currentTurnUserId !== null;
  const isMyTurn = isGameActive ? currentTurnUserId === myId : true;

  // 2. Fetch Problems
  useEffect(() => {
    fetch("/api/problems").then(res => res.json()).then(json => setProblems(json.data || []));
  }, []);

  // 3. Yjs Binding (Sync)
  useEffect(() => {
    if (!editor || !room) return;
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    const yText = yDoc.getText("monaco");
    import("y-monaco").then(({ MonacoBinding }) => {
        const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]), yProvider.awareness);
    });
    return () => { yDoc.destroy(); yProvider.destroy(); };
  }, [editor, room]);

  // --- GAME LOGIC ---

  // A. Start Game Mutation
  const startGame = useMutation(({ storage, self }) => {
    const now = Date.now();
    storage.set("currentTurnUserId", self.id); // I start first
    storage.set("turnExpiresAt", now + 30000); // 30 second turns
  }, []);

  // B. Pass Baton (Rotate Turn)
  const rotateTurn = useMutation(({ storage, self, others }) => {
    // 1. Get all users in the room (Me + Others)
    // We sort them by ID so the order is consistent for everyone
    const allUsers = [self, ...others].sort((a, b) => a.id.localeCompare(b.id));
    
    // 2. Find current index
    const currentIndex = allUsers.findIndex(u => u.id === storage.get("currentTurnUserId"));
    
    // 3. Calculate next index (Loop back to 0)
    const nextIndex = (currentIndex + 1) % allUsers.length;
    const nextUser = allUsers[nextIndex];

    // 4. Update Storage
    const now = Date.now();
    storage.set("currentTurnUserId", nextUser.id);
    storage.set("turnExpiresAt", now + 30000); // Reset timer to 30s
  }, [others]);

  // C. Timer Effect (Countdown)
  useEffect(() => {
    if (!turnExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((turnExpiresAt - now) / 1000));
      setTimeLeft(remaining);

      // If time runs out AND it's MY turn, I must trigger the rotation
      // (We only want one person to trigger the write, otherwise we get race conditions)
      if (remaining === 0 && isMyTurn) {
        rotateTurn();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turnExpiresAt, isMyTurn, rotateTurn]);


  // --- RUN LOGIC (Your /submit/text version) ---
  const handleRunCode = async () => {
    if (!editor) return;
    setIsRunning(true);
    setOutput("Running...");
    const code = editor.getValue();

    try {
      const response = await fetch("/api/submit/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, input: "10\n20" }),
      });
      const result = await response.json();
      if (result.stderr) setOutput(`⚠️ Error:\n${result.stderr}`);
      else setOutput(`> Output:\n${result.stdout}`);
    } catch (err) {
      setOutput(`❌ Connection Failed: ${err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectProblem = async (id: string) => {
    const res = await fetch(`/api/problems/${id}`);
    const json = await res.json();
    if (json.success && editor) {
        setActiveDescription(json.data.description);
        const code = json.data.starter_code || json.data.starterCode || "";
        editor.setValue(code);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-white">
      {/* --- TOP BAR (HUD) --- */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center shadow-md z-10">
        
        {/* User Badge */}
        <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tight text-gray-100">CodeRelay</span>
            <div className="h-6 w-px bg-gray-600 mx-2"></div>
            <div className="flex items-center gap-2 text-sm bg-gray-700 py-1 px-3 rounded-full">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ backgroundColor: userInfo?.color || '#ccc' }}/>
                <span className="font-medium">{userInfo?.name || "Anonymous"}</span>
            </div>
        </div>

        {/* CENTER: GAME STATUS */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            {!isGameActive ? (
                <button 
                    onClick={startGame}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-1.5 rounded-full font-bold shadow-lg transition-transform hover:scale-105 animate-pulse"
                >
                    START RELAY
                </button>
            ) : (
                <div className={`flex items-center gap-3 px-6 py-1.5 rounded-full border ${
                    isMyTurn 
                    ? "bg-green-900/30 border-green-500 text-green-400" 
                    : "bg-red-900/30 border-red-500 text-red-400"
                }`}>
                    <span className="font-bold text-lg w-8 text-center">{timeLeft}s</span>
                    <span className="text-xs uppercase font-bold tracking-wider">
                        {isMyTurn ? "🟢 YOUR TURN" : "🔒 LOCKED"}
                    </span>
                    {/* Manual Pass Button */}
                    {isMyTurn && (
                        <button 
                            onClick={rotateTurn}
                            className="ml-2 text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded"
                        >
                            PASS
                        </button>
                    )}
                </div>
            )}
        </div>
        
        {/* Run Button */}
        <button
          onClick={handleRunCode}
          disabled={isRunning} // Removed !isMyTurn check so they can run code even if locked (optional)
          className={`px-6 py-1.5 rounded-full font-bold text-sm transition-all ${
            isRunning ? "bg-gray-600 opacity-50" : "bg-green-600 hover:bg-green-500 shadow-lg hover:shadow-green-500/20"
          }`}
        >
          {isRunning ? "Running..." : "▶ Run Code"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 font-bold text-gray-400 text-xs uppercase">Problems</div>
            <div className="flex-1 overflow-auto">
                {problems.map((p) => (
                    <button key={p.id} onClick={() => handleSelectProblem(p.id)} className="w-full text-left p-3 text-sm text-gray-400 hover:bg-gray-700 hover:text-white border-l-2 border-transparent hover:border-blue-500 transition-all">
                        {p.title}
                    </button>
                ))}
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
            {activeDescription && (
                <div className="bg-gray-800 p-4 border-b border-gray-700 text-sm text-gray-300 max-h-32 overflow-auto shadow-inner">
                    <p>{activeDescription}</p>
                </div>
            )}
            
            <div className="flex-1 relative">
                {/* READ ONLY OVERLAY (Optional Visual Cue) */}
                {!isMyTurn && isGameActive && (
                    <div className="absolute inset-0 z-10 pointer-events-none bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-bold shadow-2xl border border-gray-600">
                            WAITING FOR TURN...
                        </div>
                    </div>
                )}
                
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    onMount={(editorInstance) => setEditor(editorInstance)}
                    options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 16,
                        padding: { top: 20 },
                        readOnly: !isMyTurn && isGameActive, // <--- THE LOCK
                        domReadOnly: !isMyTurn && isGameActive // Disables cursor too
                    }}
                />
            </div>
        </div>

        {/* Output */}
        <div className="w-80 bg-black border-l border-gray-700 flex flex-col">
            <div className="p-2 bg-gray-900 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">Console</div>
            <div className="p-4 font-mono text-sm overflow-auto flex-1">
                <pre className="whitespace-pre-wrap text-green-400">{output || "Ready..."}</pre>
            </div>
        </div>
      </div>
    </div>
  );
}