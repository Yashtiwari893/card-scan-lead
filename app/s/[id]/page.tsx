import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db/mongodb';
import ShortLink from '@/lib/db/models/ShortLink';

export default async function ShortLinkRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dbConnect();
  const shortLink = await ShortLink.findOne({ id: id.toUpperCase() });

  if (!shortLink) {
    redirect('/dashboard');
  }

  // Determine where to redirect based on type
  // For now, redirect to integrations dashboard
  redirect('/dashboard/integrations');
}
