import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import dbConnect from "@/lib/db/mongodb";
import Contact from "@/lib/db/models/Contact";
import User from "@/lib/db/models/User";
import Integration from "@/lib/db/models/Integration";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub && !token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = token.id || token.sub;

  await dbConnect();
  
  const contacts = await Contact.find({ userId }).sort({ createdAt: -1 });
  const user = await User.findById(userId);
  const integration = await Integration.findOne({ userId, provider: 'google' });
  
  return NextResponse.json({ 
    contacts, 
    user,
    googleConnected: !!integration 
  });
}
