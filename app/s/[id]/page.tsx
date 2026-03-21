import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db/mongodb';
import ShortLink from '@/lib/db/models/ShortLink';

export default async function ShortLinkRedirect({ params }: { params: { id: string } }) {
  await dbConnect();
  const shortLink = await ShortLink.findOne({ id: params.id.toUpperCase() });

  if (!shortLink) {
    redirect('/dashboard');
  }

  // Determine where to redirect based on type
  // For now, redirect to integrations dashboard
  redirect('/dashboard/integrations');
}
