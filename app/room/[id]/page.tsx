"use client";

import { RoomProvider } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client"; // Import at the top!
import { use } from "react"; // Needed to unwrap params
import dynamic from "next/dynamic";

// FIX 1: Dynamic Import with SSR disabled
// This prevents the "window is not defined" error by ignoring this component on the server
const CollaborativeEditor = dynamic(
  () => import("@/app/components/CollaborativeEditor"),
  { 
    ssr: false,
    loading: () => <div className="text-white p-10">Loading Editor...</div>
  }
);

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  // FIX 2: Unwrap the params Promise using React.use()
  const { id } = use(params);

  return (
    <RoomProvider 
        id={id} 
        initialPresence={{ cursor: null, selection: null }} 
        initialStorage={{ 
            currentTurnUserId: null, 
            turnExpiresAt: 0,
            teamScore: 0,
            logs: new LiveList([]) // FIX 3: Pass empty array to be safe
        }}
    >
      <ClientSideSuspense fallback={<div className="text-white p-10">Connecting to Room...</div>}>
        {() => <CollaborativeEditor />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}