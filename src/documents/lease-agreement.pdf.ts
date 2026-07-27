import PDFDocument from 'pdfkit';
import { Lease } from '../leases/entities/lease.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../units/entities/unit.entity';

export interface LeaseAgreementData {
  lease: Lease;
  tenant: Tenant;
  unit: Unit;
  property: Property;
}

const money = (n: number): string => `TZS ${Number(n).toLocaleString('en-US')}`;
const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Renders a one-page lease agreement from the lease's own terms — the
 * "auto-generated document based on lease terms provided" the user asked for.
 * Plain pdfkit layout (no template engine): a title, a labeled two-column
 * fact table, then the free-text terms as paragraphs where present.
 */
export function renderLeaseAgreementPdf(data: LeaseAgreementData): Promise<Buffer> {
  const { lease, tenant, unit, property } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  doc.fontSize(20).font('Helvetica-Bold').text('Lease Agreement', { align: 'center' });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text(`Reference ${lease.code} · Generated ${formatDate(new Date().toISOString().slice(0, 10))}`, {
      align: 'center',
    });
  doc.fillColor('#000').moveDown(1.5);

  const row = (label: string, value: string) => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).text(label, 50, y, { width: 160 });
    doc.font('Helvetica').fontSize(10).text(value, 220, y, { width: 320 });
    doc.moveDown(0.6);
  };

  doc.font('Helvetica-Bold').fontSize(13).text('Parties & Premises');
  doc.moveDown(0.4);
  row('Tenant', tenant.name);
  row('Contact', `${tenant.phone}${tenant.email ? ' · ' + tenant.email : ''}`);
  if (tenant.idType && tenant.idNumber) {
    row('Identification', `${tenant.idType} ${tenant.idNumber}`);
  }
  row('Property', `${property.name} (${property.code})`);
  row('Address', `${property.area}, ${property.city}`);
  row('Unit', `${unit.no} — ${unit.type}, Floor ${unit.floor}`);

  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(13).text('Term & Rent');
  doc.moveDown(0.4);
  row('Lease term', `${formatDate(lease.start)} to ${formatDate(lease.end)}`);
  row('Rent', `${money(lease.rent)} (${lease.frequency})`);
  row('Security deposit', money(lease.deposit));

  const hasFineText = lease.billing || lease.grace || lease.penalty || lease.renewal || lease.notes;
  if (hasFineText) {
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(13).text('Terms & Conditions');
    doc.moveDown(0.4);
    if (lease.billing) row('Billing', lease.billing);
    if (lease.grace) row('Grace period', lease.grace);
    if (lease.penalty) row('Late penalty', lease.penalty);
    if (lease.renewal) row('Renewal', lease.renewal);
    if (lease.notes) {
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(10).text('Notes');
      doc.font('Helvetica').fontSize(10).text(lease.notes, { width: 490 });
    }
  }

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#999').text(
    'This document was generated automatically from the lease record and is not a substitute ' +
      'for independent legal review.',
    { width: 490 },
  );

  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  doc.end();
  return done;
}
