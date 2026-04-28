"""Email service using Gmail SMTP with App Password.
Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env to enable sending.
If credentials are missing, email is logged as 'simulated' and not sent.
"""
import os
import logging
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)

GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465


def _send_sync(to: str, subject: str, html: str, attachments: list | None = None) -> dict:
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.warning("[EMAIL SIMULATED] to=%s subject=%s", to, subject)
        return {"sent": False, "simulated": True, "reason": "missing_credentials"}

    msg = MIMEMultipart("mixed")
    msg["From"] = f"Revant <{GMAIL_USER}>"
    msg["To"] = to
    msg["Subject"] = subject

    body = MIMEMultipart("alternative")
    body.attach(MIMEText(html, "html", "utf-8"))
    msg.attach(body)

    for att in attachments or []:
        part = MIMEApplication(att["content"], Name=att["filename"])
        part["Content-Disposition"] = f'attachment; filename="{att["filename"]}"'
        msg.attach(part)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.send_message(msg)
    return {"sent": True, "simulated": False}


async def send_email(to: str, subject: str, html: str, attachments: list | None = None) -> dict:
    return await asyncio.to_thread(_send_sync, to, subject, html, attachments)


def render_reminder_html(name: str, property_name: str, monto: str, fecha: str, days: int, payment_link: str | None = None) -> str:
    urgency = "vence hoy" if days == 0 else (f"vence en {days} día{'s' if days != 1 else ''}" if days > 0 else f"venció hace {abs(days)} día{'s' if abs(days) != 1 else ''}")
    color = "#DC2626" if days <= 0 else ("#D3A154" if days <= 7 else "#031433")
    cta = ""
    if payment_link:
        cta = f"""
        <div style="text-align:center;margin:24px 0 8px;">
          <a href="{payment_link}" style="display:inline-block;background:#D3A154;color:#031433;padding:14px 28px;font-weight:700;text-decoration:none;border-radius:6px;font-size:14px;letter-spacing:0.5px;">PAGAR AHORA</a>
        </div>
        <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">Pago seguro vía Stripe · Acepta tarjetas de crédito y débito</p>
        """
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #031433;">
      <div style="background: #031433; padding: 24px; text-align: center;">
        <h1 style="color: #D3A154; margin: 0; font-size: 24px; letter-spacing: 2px;">REVANT</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0;">
        <p style="font-size: 12px; letter-spacing: 2px; color: #D3A154; text-transform: uppercase; margin: 0 0 8px;">Recordatorio de pago</p>
        <h2 style="margin: 0 0 16px; font-size: 22px;">Hola {name},</h2>
        <p style="font-size: 15px; line-height: 1.6;">Te recordamos que tu renta del inmueble <strong>{property_name}</strong> {urgency}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e2e8f0;">
          <tr><td style="padding: 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Monto</td><td style="padding: 12px; font-weight: 600; font-size: 16px;">{monto}</td></tr>
          <tr><td style="padding: 12px; background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-top: 1px solid #e2e8f0;">Fecha de vencimiento</td><td style="padding: 12px; font-weight: 600; color: {color}; border-top: 1px solid #e2e8f0;">{fecha}</td></tr>
        </table>
        {cta}
        <p style="font-size: 13px; color: #64748b; line-height: 1.6;">Si ya realizaste el pago, ignora este mensaje.</p>
      </div>
      <div style="padding: 16px 24px; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Revant · Plataforma de administración inmobiliaria · LFPDPPP</p>
      </div>
    </div>
    """


def render_arco_received_html(name: str, request_id: str, tipo: str) -> str:
    return f"""
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto; color: #031433;">
      <div style="background: #031433; padding: 24px; text-align: center;">
        <h1 style="color: #D3A154; margin: 0; font-size: 24px; letter-spacing: 2px;">REVANT</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0;">
        <p style="font-size: 12px; letter-spacing: 2px; color: #D3A154; text-transform: uppercase;">Solicitud ARCO recibida</p>
        <h2>Hola {name},</h2>
        <p>Hemos recibido tu solicitud de <strong>{tipo}</strong> conforme a la LFPDPPP.</p>
        <p>Folio: <strong>{request_id}</strong></p>
        <p style="font-size: 13px; color: #64748b;">Daremos respuesta en un plazo máximo de 20 días hábiles, conforme al artículo 32 de la Ley.</p>
      </div>
    </div>
    """
