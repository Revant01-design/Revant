"""Audit log helper."""
import uuid
from datetime import datetime, timezone


async def log_audit(db, *, user, action: str, target_type: str = "", target_id: str = "", details: dict | None = None):
    doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": getattr(user, "user_id", None),
        "user_email": getattr(user, "email", None),
        "user_role": getattr(user, "role", None),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.audit_logs.insert_one(doc)
    return doc
