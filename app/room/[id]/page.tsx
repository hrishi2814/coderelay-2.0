"use client";

import { RoomProvider } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client"; 
import { use } from "react";
import dynamic from "next/dynamic";

// ⚠️ THIS IS THE CRITICAL PART
// We tell Next.js: "Load this component ONLY in the browser"
// We also give it a path string, NOT an import statement at the top
const CollaborativeEditor = dynamic(
  () => import("@/app/components/CollaborativeEditor"), 
  { ssr: false } // <--- Disables server-side rendering for this component
);

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RoomProvider 
        id={id} 
        initialPresence={{ cursor: null, selection: null }} 
        initialStorage={{ 
            currentTurnUserId: null, 
            turnExpiresAt: 0,
            teamScore: 0,
            logs: new LiveList([]) 
        }}
    >
      <ClientSideSuspense fallback={<div className="text-white p-10">Connecting...</div>}>
        {() => <CollaborativeEditor />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}