export function generateVCF(contactData: any): string {
  const { name, company, jobTitle, email, phone, website } = contactData;

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

  if (name) lines.push(`FN:${name}`);
  if (company) lines.push(`ORG:${company}`);
  if (jobTitle) lines.push(`TITLE:${jobTitle}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (phone) lines.push(`TEL:${phone}`);
  if (website) lines.push(`URL:${website}`);

  lines.push('END:VCARD');

  return lines.join('\n');
}

