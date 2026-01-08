import { LiveList, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

declare global {
  interface Liveblocks {
    // 1. Where are other users looking?
    Presence: {
      cursor: { x: number; y: number } | null;
      selection: string | null; // e.g. currently selected code text
    };

    // 2. The Game State (Whose turn is it?)
    Storage: {
      currentTurnUserId: string | null; // The ID of the active typer
      turnExpiresAt: number;            // Timestamp (ms) when turn ends
      teamScore: number;                // Current score for the team

      // We can also store a log of events if we want
      logs: LiveList<string>;
    };

    // 3. Who is this person?
    UserMeta: {
      id: string; // "user-alice"
      info: {
        name: string;   // "Alice"
        color: string;  // "#FF0000" (Each user gets a cursor color)
        avatar: string; // URL to image
      };
    };

    // 4. One-off signals
    RoomEvent:
    | { type: "TURN_CHANGE"; nextUser: string }
    | { type: "SUBMISSION_RESULT"; passed: boolean };
  }
}

export const {
  RoomProvider,
  useRoom,
  useOthers,
  useUpdateMyPresence,
  useStorage,
  useSelf,
  useMutation,
} = createRoomContext<any, Storage>(createClient({
    authEndpoint: "/api/liveblocks-auth",
}));