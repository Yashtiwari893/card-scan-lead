import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db/mongodb';
import SetupToken from '@/lib/db/models/SetupToken';
import User from '@/lib/db/models/User';
import { getOAuthClient } from '@/lib/google/oauth';

export default async function SetupRedirectPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Access Link</h1>
          <p className="text-slate-400">This setup link appears to be invalid or broken. Please request a new link from the bot.</p>
        </div>
      </div>
    );
  }

  await dbConnect();
  const setupToken = await SetupToken.findOne({ token: token.toUpperCase(), used: false });

  if (!setupToken || setupToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full scale-in-center">
          <div className="text-amber-500 text-6xl mb-4">⌛</div>
          <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
          <p className="text-slate-400">Security tokens expire after 30 minutes. Please go back to WhatsApp and type "Sheet Setup" again.</p>
        </div>
      </div>
    );
  }

  const user = await User.findOne({ whatsappNumber: setupToken.phone });
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full">
          <div className="text-red-500 text-6xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
          <p className="text-slate-400">We couldn't find a user associated with this token.</p>
        </div>
      </div>
    );
  }

  // Determine Scopes based on setupToken.type
  let scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  if (setupToken.type === 'sheets') scopes.push('https://www.googleapis.com/auth/spreadsheets');
  if (setupToken.type === 'calendar') scopes.push('https://www.googleapis.com/auth/calendar');
  if (setupToken.type === 'email') scopes.push('https://www.googleapis.com/auth/gmail.send');

  const oauth2Client = getOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: user._id.toString(),
  });

  redirect(authUrl);
}
