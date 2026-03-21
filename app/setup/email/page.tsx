import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db/mongodb';
import SetupToken from '@/lib/db/models/SetupToken';
import User from '@/lib/db/models/User';
import { getOAuthClient } from '@/lib/google/oauth';

export default async function EmailSetupPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  if (!token) return <SetupError message="Invalid setup token provided." />;

  await dbConnect();
  const setupToken = await SetupToken.findOne({ token: token.toUpperCase(), used: false });
  if (!setupToken || setupToken.expiresAt < new Date()) {
    return <SetupError message="This link is expired. Please request a new one from the bot." />;
  }

  const user = await User.findOne({ whatsappNumber: setupToken.phone });
  if (!user) return <SetupError message="We could not find your user account." />;

  const oauth2Client = getOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    state: user._id.toString(),
  });

  redirect(authUrl);
}

function SetupError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Setup Error</h1>
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}
