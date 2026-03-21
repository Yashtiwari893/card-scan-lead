import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';
import Contact from '@/lib/db/models/Contact';
import aiRouter from '@/lib/ai/aiRouter';
import axios from 'axios';
import { generateVCF } from '@/lib/whatsapp/vcf';

export async function POST(req: NextRequest) {
  try {
    const { phone, imageUrl } = await req.json();

    if (!phone || !imageUrl) {
      return NextResponse.json({ success: false, error: 'phone and imageUrl are required' }, { status: 400 });
    }

    await dbConnect();

    const cleanPhone = phone.replace('+', '').trim();
    const user = await User.findOne({ whatsappNumber: cleanPhone });

    if (!user) {
      return NextResponse.json({ success: false, reason: 'user_not_found' });
    }

    if (user.scanCredits <= 0) {
      return NextResponse.json({ success: false, reason: 'no_credits', scanCreditsLeft: 0 });
    }

    // Download image from URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    if (response.status !== 200) {
      return NextResponse.json({ success: false, reason: 'failed_to_download_image' });
    }

    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');

    // AI Parsing
    const { data: contactData, provider } = await aiRouter.parseBusinessCard(base64);

    // Save to MongoDB
    const newContact = await Contact.create({
      userId: user._id,
      ...contactData,
      rawText: JSON.stringify(contactData),
      aiProvider: provider,
      syncedTo: [],
    });

    // Deduct credits
    const isFirstScan = user.isFirstScan;
    user.scanCredits -= 1;
    user.scansUsed += 1;
    user.isFirstScan = false;
    await user.save();

    // Generate VCF
    const vcfString = generateVCF(contactData);

    return NextResponse.json({
      success: true,
      contactId: newContact._id,
      name: contactData.name || "",
      company: contactData.company || "",
      jobTitle: contactData.jobTitle || "",
      email: contactData.email || "",
      phone: contactData.phone || "",
      website: contactData.website || "",
      address: contactData.address || "",
      linkedin: contactData.linkedin || "",
      aiProvider: provider,
      scanCreditsLeft: user.scanCredits,
      isFirstScan: isFirstScan,
      vcfString: vcfString,
      vcfBase64: Buffer.from(vcfString).toString('base64'),
    });

  } catch (error: any) {
    console.error("Scan error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
