// app/api/submit/text/route.ts
import { executeCode } from "@/app/lib/executor";
import { NextRequest, NextResponse } from "next/server"; // Import NextResponse

export async function POST(req: NextRequest) {
  try {
      const body = await req.json();
      const { code, input } = body; 

      // validation: Only fail if code is genuinely missing (null/undefined)
      // Allow empty string "" (user might want to run empty code)
      if (typeof code !== 'string') {
          return NextResponse.json({ error: "Code is required" }, { status: 400 });
      }

      const result = await executeCode(code, 'python', input || ""); 
      
      return NextResponse.json(result);
  } catch (err) {
      return NextResponse.json({ error: "Server Parse Error" }, { status: 400 });
  }
}