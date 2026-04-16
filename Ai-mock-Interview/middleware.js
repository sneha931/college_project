import { NextResponse } from "next/server";

// No authentication required - handled by the main platform
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};