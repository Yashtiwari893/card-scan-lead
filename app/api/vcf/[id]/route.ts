import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Contact from '@/lib/db/models/Contact';
import { generateVCF } from '@/lib/whatsapp/vcf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await dbConnect();
    const contact = await Contact.findById(id);

    if (!contact) {
      return new NextResponse("Contact not found", { status: 404 });
    }

    const vcfContent = generateVCF(contact);

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'text/vcard');
    headers.set('Content-Disposition', `attachment; filename="${contact.name || 'contact'}.vcf"`);

    return new NextResponse(vcfContent, { headers });
  } catch (error: any) {
    console.error("VCF generation error:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}
