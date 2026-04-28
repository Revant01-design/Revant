/* Client-side PDF generation using jsPDF (replaces server ReportLab in static mode). */
import { jsPDF } from "jspdf";

const NAVY = [3, 20, 51];
const GOLD = [211, 161, 84];
const SLATE = [100, 116, 139];

function fmtMoney(n) {
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }); } catch { return iso; }
}

export function downloadContractPdf(c) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  let y = 60;

  // Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("REVANT · PROPTECH", 60, y);
  y += 28;

  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text("Contrato de Arrendamiento", 60, y);
  y += 18;

  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`FOLIO: ${c.contract_id}  ·  Conforme al Código Civil Federal`, 60, y);
  y += 24;

  // Info table
  const rows = [
    ["INMUEBLE", c.propiedad_nombre],
    ["ARRENDATARIO", c.inquilino_nombre],
    ["RENTA MENSUAL", fmtMoney(c.monto_renta)],
    ["VIGENCIA", `${fmtDate(c.fecha_inicio)} – ${fmtDate(c.fecha_vencimiento)}`],
    ["ESTATUS DE PAGO", (c.estatus || "").toUpperCase()],
  ];
  doc.setDrawColor(...SLATE);
  doc.setLineWidth(0.5);
  rows.forEach(([k, v]) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(60, y, 140, 26, "F");
    doc.rect(60, y, W - 120, 26, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(k, 70, y + 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(String(v), 210, y + 17);
    y += 26;
  });
  y += 16;

  // Clauses
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Cláusulas", 60, y);
  y += 18;

  const clauses = [
    ["PRIMERA.", `El ARRENDADOR otorga en arrendamiento al ARRENDATARIO el inmueble descrito (${c.propiedad_nombre}), destinándose única y exclusivamente para uso habitacional.`],
    ["SEGUNDA.", `El ARRENDATARIO se obliga a pagar mensualmente la renta de ${fmtMoney(c.monto_renta)} dentro de los primeros cinco días naturales de cada mes, mediante transferencia electrónica.`],
    ["TERCERA.", `La vigencia del presente contrato es del ${fmtDate(c.fecha_inicio)} al ${fmtDate(c.fecha_vencimiento)}, sujeta a renovación por mutuo acuerdo.`],
    ["CUARTA.", "El ARRENDATARIO entrega un mes de depósito en garantía, mismo que será reintegrado al término del contrato previa verificación del estado del inmueble."],
    ["QUINTA.", "El presente contrato se rige por la LFPDPPP. El aviso de privacidad está disponible en revant.mx/privacidad."],
    ["SEXTA.", "Para la interpretación y cumplimiento, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México."],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  clauses.forEach(([label, txt]) => {
    const lines = doc.splitTextToSize(`${label} ${txt}`, W - 120);
    if (y + lines.length * 14 > 720) { doc.addPage(); y = 60; }
    doc.text(lines, 60, y);
    y += lines.length * 14 + 6;
  });

  y += 16;
  if (y > 620) { doc.addPage(); y = 60; }

  // Signature
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("FIRMA DIGITAL DEL ARRENDATARIO", 60, y);
  y += 12;

  if (c.signature_image && c.firmado) {
    try {
      doc.addImage(c.signature_image, "PNG", 60, y, 180, 60);
      y += 70;
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(...NAVY);
      doc.text(c.inquilino_nombre, 60, y + 30);
      y += 40;
    }
  } else if (c.firmado) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(c.inquilino_nombre, 60, y + 30);
    y += 40;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("Pendiente de firma digital", 60, y + 16);
    y += 30;
  }

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(60, y, 260, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(c.inquilino_nombre, 60, y);
  y += 14;
  if (c.firmado_at) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(`Firmado el ${fmtDate(c.firmado_at)} · Validez conforme al art. 89 del Código de Comercio.`, 60, y);
  }

  doc.save(`contrato_${c.contract_id}.pdf`);
}
