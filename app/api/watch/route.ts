import { NextResponse } from "next/server";
import { z } from "zod";
import { withSession } from "@/lib/auth";
import { sourceError } from "@/lib/source-api";
import { watchSnapshot, queueWatch, setWatchPaused, followWatch } from "@/db/similarity";
export const runtime = "nodejs";
export const GET = withSession(async () => NextResponse.json(await watchSnapshot()));
const action = z.discriminatedUnion("action", [z.object({ action: z.literal("review"), id: z.string().min(1).max(30).optional() }), z.object({ action: z.literal("pause"), id: z.string().min(1).max(30), paused: z.boolean() }), z.object({ action: z.literal("follow"), id: z.string().min(1).max(30) })]);
export const POST = withSession(async request => {
  try {
    const input = action.parse(await request.json());
    if (input.action === "review") await queueWatch(input.id);
    else if (input.action === "pause") await setWatchPaused(input.id, input.paused);
    else await followWatch(input.id);
    return NextResponse.json(await watchSnapshot());
  } catch (error) { return sourceError(error); }
});
