"""Stripe payments service using emergentintegrations."""
import os
import logging
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest
)

logger = logging.getLogger(__name__)


def get_checkout(host_url: str) -> StripeCheckout:
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise RuntimeError("STRIPE_API_KEY missing in .env")
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


async def create_contract_checkout(
    *, host_url: str, amount: float, currency: str, success_url: str, cancel_url: str, metadata: dict
):
    sc = get_checkout(host_url)
    req = CheckoutSessionRequest(
        amount=float(amount),
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    return await sc.create_checkout_session(req)


async def get_status(host_url: str, session_id: str):
    sc = get_checkout(host_url)
    return await sc.get_checkout_status(session_id)


async def handle_webhook(host_url: str, body: bytes, signature: str):
    sc = get_checkout(host_url)
    return await sc.handle_webhook(body, signature)
