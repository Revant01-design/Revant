"""PDF generator for digital contracts using ReportLab."""
import io
import base64
from datetime import datetime
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER

NAVY = HexColor("#031433")
GOLD = HexColor("#D3A154")
SLATE = HexColor("#64748b")
LIGHT = HexColor("#f1f5f9")


def _styles():
    base = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, leading=26, spaceAfter=8),
        "overline": ParagraphStyle("ov", fontName="Helvetica-Bold", fontSize=8, textColor=GOLD, leading=12, spaceAfter=4),
        "body": ParagraphStyle("b", fontName="Helvetica", fontSize=10, textColor=NAVY, leading=15, alignment=TA_JUSTIFY, spaceAfter=8),
        "label": ParagraphStyle("l", fontName="Helvetica-Bold", fontSize=8, textColor=SLATE, leading=12),
        "value": ParagraphStyle("v", fontName="Helvetica-Bold", fontSize=11, textColor=NAVY, leading=14),
        "small": ParagraphStyle("s", fontName="Helvetica", fontSize=8, textColor=SLATE, leading=11),
        "centered": ParagraphStyle("c", fontName="Helvetica", fontSize=9, textColor=SLATE, leading=12, alignment=TA_CENTER),
    }


def _fmt_money(v): return f"${v:,.2f} MXN"


def _fmt_date(iso):
    if not iso:
        return "—"
    try:
        return datetime.fromisoformat(iso).strftime("%d/%m/%Y")
    except Exception:
        return iso


def generate_contract_pdf(contract: dict) -> bytes:
    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.8 * inch, rightMargin=0.8 * inch,
        topMargin=0.8 * inch, bottomMargin=0.8 * inch,
        title=f"Contrato {contract['contract_id']}"
    )
    story = []

    # Header
    story.append(Paragraph("REVANT · PROPTECH", ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=10, textColor=GOLD, alignment=TA_LEFT)))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Contrato de Arrendamiento", s["h1"]))
    story.append(Paragraph(f"FOLIO: {contract['contract_id']} · Conforme al Código Civil Federal", s["overline"]))
    story.append(Spacer(1, 16))

    # Parties table
    data = [
        [Paragraph("INMUEBLE", s["label"]), Paragraph(contract["propiedad_nombre"], s["value"])],
        [Paragraph("ARRENDATARIO", s["label"]), Paragraph(contract["inquilino_nombre"], s["value"])],
        [Paragraph("RENTA MENSUAL", s["label"]), Paragraph(_fmt_money(contract["monto_renta"]), s["value"])],
        [Paragraph("VIGENCIA", s["label"]), Paragraph(f"{_fmt_date(contract['fecha_inicio'])} – {_fmt_date(contract['fecha_vencimiento'])}", s["value"])],
        [Paragraph("ESTATUS DE PAGO", s["label"]), Paragraph(contract["estatus"].capitalize(), s["value"])],
    ]
    t = Table(data, colWidths=[1.6 * inch, 4.4 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, NAVY),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, SLATE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 18))

    # Clauses
    story.append(Paragraph("Cláusulas", ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, spaceAfter=10)))
    clauses = [
        ("PRIMERA.", f"El ARRENDADOR otorga en arrendamiento al ARRENDATARIO el inmueble descrito ({contract['propiedad_nombre']}), destinándose única y exclusivamente para uso habitacional."),
        ("SEGUNDA.", f"El ARRENDATARIO se obliga a pagar mensualmente la renta de {_fmt_money(contract['monto_renta'])} dentro de los primeros cinco días naturales de cada mes, mediante transferencia electrónica a la cuenta que designe el ARRENDADOR."),
        ("TERCERA.", f"La vigencia del presente contrato es del {_fmt_date(contract['fecha_inicio'])} al {_fmt_date(contract['fecha_vencimiento'])}, sujeta a renovación por mutuo acuerdo."),
        ("CUARTA.", "El ARRENDATARIO entrega en este acto un mes de depósito en garantía, mismo que será reintegrado al término del contrato previa verificación del estado del inmueble."),
        ("QUINTA.", "Las partes consienten el tratamiento de datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). El aviso de privacidad está disponible en revant.mx/privacidad."),
        ("SEXTA.", "Para la interpretación y cumplimiento del presente contrato las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otra que pudiera corresponderles."),
    ]
    for label, txt in clauses:
        story.append(Paragraph(f"<b>{label}</b> {txt}", s["body"]))

    story.append(Spacer(1, 24))

    # Signature block
    story.append(Paragraph("FIRMA DIGITAL DEL ARRENDATARIO", s["overline"]))
    sig_img_b64 = contract.get("signature_image")
    if sig_img_b64 and contract.get("firmado"):
        try:
            data = sig_img_b64.split(",", 1)[-1]
            img_bytes = base64.b64decode(data)
            sig_img = Image(io.BytesIO(img_bytes), width=2.6 * inch, height=1.0 * inch)
            sig_img.hAlign = "LEFT"
            story.append(sig_img)
        except Exception:
            story.append(Paragraph(f"<i>{contract['inquilino_nombre']}</i>", s["value"]))
    elif contract.get("firmado"):
        story.append(Paragraph(f"<i>{contract['inquilino_nombre']}</i>", s["value"]))
    else:
        story.append(Paragraph("<i>Pendiente de firma digital</i>", s["small"]))

    story.append(Spacer(1, 6))
    line = Table([[""]], colWidths=[3.0 * inch])
    line.setStyle(TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.6, NAVY)]))
    story.append(line)
    story.append(Paragraph(contract["inquilino_nombre"], s["value"]))
    if contract.get("firmado_at"):
        story.append(Paragraph(f"Firmado el {_fmt_date(contract['firmado_at'])} · Validez conforme al art. 89 del Código de Comercio.", s["small"]))

    story.append(Spacer(1, 36))
    story.append(Paragraph("Documento generado electrónicamente por Revant · Este PDF no requiere sello físico.", s["centered"]))

    doc.build(story)
    return buf.getvalue()
