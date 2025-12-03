import { runSubmission } from "@/app/lib/executor";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, problemId } = body;

        if (!code || !problemId) {
            return NextResponse.json({ error: "Missing code or problemId" }, { status: 400 });
        }

        const result = await runSubmission(problemId, code);
        return NextResponse.json(result);

    } catch (error) {
        console.error("Submission Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}