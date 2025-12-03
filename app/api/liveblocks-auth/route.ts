import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: "sk_dev_Iu8K6CAOnj4yOoG5uKcXse9P4AUFJOuo0lYq5cdX3s7W60uZU4Kz7QhFajfAap3j", 
});

export async function POST(request: NextRequest) {
  // 1. Generate a random user identity
  const userIndex = Math.floor(Math.random() * 1000);
  
  const user = {
    id: `user-${userIndex}`,
    info: {
        name: `Hacker #${userIndex}`,
        color: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color
        avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(Math.random() * 30)}.png`,
    }
  };

  // 2. Create the session
  const session = liveblocks.prepareSession(
    user.id,
    { userInfo: user.info } // This data becomes 'UserMeta'
  );

  // 3. Allow access to the room
  session.allow("*", session.FULL_ACCESS);

  // 4. Return the authorized token
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}