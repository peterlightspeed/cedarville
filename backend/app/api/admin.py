"""Teacher/admin tools: curate videos, add and approve questions."""
from __future__ import annotations

import json
import re

import httpx
from sqlalchemy import text

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.ai_client import ai_enabled, complete
from app.config import settings
from app.database import engine, get_session
from app.deps import require_admin
from app.models import LEVELS, AIReport, Question, User, Video

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

YT_ID = re.compile(r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})")


def parse_youtube_id(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value
    m = YT_ID.search(value)
    if not m:
        raise HTTPException(400, "That doesn't look like a YouTube link or video ID.")
    return m.group(1)


class VideoIn(BaseModel):
    url: str = Field(description="YouTube link or 11-character video ID")
    title: str = Field(min_length=2, max_length=150)
    category: str = "songs"
    levels: list[str] = Field(default_factory=lambda: list(LEVELS))
    emoji: str = "🎬"
    premium: bool = False


@router.get("/videos")
def list_videos(session: Session = Depends(get_session)) -> list[Video]:
    return list(session.exec(select(Video).order_by(Video.id)).all())


@router.post("/videos", status_code=201)
def add_video(body: VideoIn, session: Session = Depends(get_session)) -> Video:
    if any(l not in LEVELS for l in body.levels):
        raise HTTPException(400, f"Levels must be from {LEVELS}")
    yt = parse_youtube_id(body.url)
    if session.exec(select(Video).where(Video.youtube_id == yt)).first():
        raise HTTPException(409, "That video is already in the list.")
    v = Video(youtube_id=yt, title=body.title.strip(), category=body.category, levels=body.levels,
              emoji=body.emoji, premium=body.premium)
    session.add(v)
    session.commit()
    session.refresh(v)
    return v


@router.delete("/videos/{video_id}", status_code=204, response_class=Response, response_model=None)
def delete_video(video_id: int, session: Session = Depends(get_session)) -> None:
    v = session.get(Video, video_id)
    if v is None:
        raise HTTPException(404, "Not found.")
    session.delete(v)
    session.commit()


class QuestionIn(BaseModel):
    level: str
    subject: str
    visual: str = ""
    prompt: str = Field(min_length=3, max_length=300)
    options: list[str] = Field(min_length=2, max_length=4)
    answer: str
    explanation: str = ""


@router.post("/questions", status_code=201)
def add_question(body: QuestionIn, session: Session = Depends(get_session)) -> Question:
    if body.level not in LEVELS:
        raise HTTPException(400, f"Level must be one of {LEVELS}")
    if body.answer not in body.options or len(set(body.options)) != len(body.options):
        raise HTTPException(400, "The answer must be one of the options, and options must be different.")
    q = Question(**body.model_dump(), approved=True)
    session.add(q)
    session.commit()
    session.refresh(q)
    return q


@router.get("/questions/drafts")
def drafts(session: Session = Depends(get_session)) -> list[Question]:
    return list(session.exec(select(Question).where(Question.approved == False)).all())  # noqa: E712


@router.post("/questions/{question_id}/approve")
def approve(question_id: int, session: Session = Depends(get_session)) -> Question:
    q = session.get(Question, question_id)
    if q is None:
        raise HTTPException(404, "Not found.")
    q.approved = True
    session.add(q)
    session.commit()
    return q


class GenerateIn(BaseModel):
    level: str
    subject: str = Field(max_length=40)
    count: int = Field(default=5, ge=1, le=10)


@router.post("/questions/generate", status_code=201)
async def generate(body: GenerateIn, session: Session = Depends(get_session)) -> dict:
    """Ask the AI to DRAFT questions. They stay hidden until a teacher approves them."""
    if body.level not in LEVELS:
        raise HTTPException(400, f"Level must be one of {LEVELS}")
    if not ai_enabled():
        raise HTTPException(503, "AI is not configured (set ANTHROPIC_API_KEY).")
    raw = await complete(
        "You write quiz questions for young children in Nigeria. Reply with JSON only, no prose.",
        f"Write {body.count} multiple-choice questions about '{body.subject}' for level '{body.level}' "
        "(tiny=ages 2-3, nursery=4-5, lower=6-8, upper=9-11). Return a JSON array of objects with keys: "
        "prompt, visual (one emoji), options (3 short strings), answer (must equal one option), explanation "
        "(one friendly sentence). Facts must be correct and simple.",
        max_tokens=1500,
    )
    if raw is None:
        raise HTTPException(502, "The AI didn't answer. Please try again.")
    try:
        items = json.loads(re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip())
    except json.JSONDecodeError:
        raise HTTPException(502, "The AI's answer wasn't valid. Please try again.")
    saved = 0
    for it in items if isinstance(items, list) else []:
        try:
            opts = [str(o) for o in it["options"]][:4]
            ans = str(it["answer"])
            if ans not in opts or len(set(opts)) != len(opts) or len(opts) < 2:
                continue
            session.add(Question(level=body.level, subject=body.subject, visual=str(it.get("visual", ""))[:8],
                                 prompt=str(it["prompt"])[:300], options=opts, answer=ans,
                                 explanation=str(it.get("explanation", ""))[:300], approved=False))
            saved += 1
        except (KeyError, TypeError):
            continue
    session.commit()
    return {"drafted": saved, "note": "Review under /api/admin/questions/drafts and approve the good ones."}


@router.get("/diagnostics")
async def diagnostics(session: Session = Depends(get_session)) -> dict:
    """Admin-only 'is everything connected?' report. Never returns a secret."""
    checks: list[dict] = []

    def add(name: str, ok: bool, detail: str, fix: str = "") -> None:
        checks.append({"name": name, "ok": ok, "detail": detail, "fix": fix})

    # Database
    kind = engine.dialect.name
    try:
        session.exec(text("SELECT 1"))
        counts = {
            "questions": len(session.exec(select(Question)).all()),
            "videos": len(session.exec(select(Video)).all()),
            "families": len(session.exec(select(User)).all()),
        }
        if kind == "postgresql":
            add("Database (Neon / Postgres)", True, f"Connected. {counts['questions']} questions, {counts['videos']} videos, {counts['families']} accounts.")
        else:
            add("Database (Neon / Postgres)", False, f"Using {kind} (a local file), not Neon. Data would be lost on Render.",
                "Set DATABASE_URL in Render to your Neon connection string.")
    except Exception as exc:  # noqa: BLE001
        add("Database (Neon / Postgres)", False, f"Cannot query the database ({type(exc).__name__}).", "Check DATABASE_URL.")

    # Secrets and web addresses
    add("SECRET_KEY", not settings.secret_key.startswith("dev-only"),
        "Set." if not settings.secret_key.startswith("dev-only") else "Still the development default.",
        "Set SECRET_KEY in Render (openssl rand -hex 32).")
    add("Admin emails", bool(settings.admin_emails), f"{len(settings.admin_emails)} configured.", "Set ADMIN_EMAILS in Render.")
    site_origins = [o for o in settings.cors_origins if "localhost" not in o and "127.0.0.1" not in o]
    add("CORS (website allowed to call the API)", bool(site_origins),
        ", ".join(site_origins) if site_origins else "Only localhost is allowed.",
        "Set CORS_ORIGINS to your website addresses, e.g. https://www.cedarvilleprivateschool.com")
    add("APP_URL (where Paystack sends parents back)", not settings.app_url.startswith("http://localhost"),
        settings.app_url, "Set APP_URL to https://<your-site>/app/")

    add("Google sign-in", bool(settings.google_client_id),
        "Client ID set." if settings.google_client_id else "Not set. The Google button is hidden.",
        "Set GOOGLE_CLIENT_ID in Render (Google Cloud Console > Credentials > Web client).")

    add("Videos (Watch & Learn)", True,
        "ON" if settings.enable_videos else "OFF, so the Watch tab is hidden. Recommended until you own or have permission for every video.")

    # Paystack — a harmless authenticated call
    if not settings.paystack_secret_key:
        add("Paystack payments", False, "No key set. Payments show 'coming soon'.", "Set PAYSTACK_SECRET_KEY in Render.")
    else:
        mode = "test" if settings.paystack_secret_key.startswith("sk_test_") else "live"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get("https://api.paystack.co/bank?perPage=1",
                                     headers={"Authorization": f"Bearer {settings.paystack_secret_key}"})
            add("Paystack payments", r.status_code == 200, f"Key accepted ({mode} mode)." if r.status_code == 200
                else f"Paystack rejected the key (HTTP {r.status_code}).", "" if r.status_code == 200 else "Copy the secret key again from Paystack > Settings > API Keys.")
        except Exception as exc:  # noqa: BLE001
            add("Paystack payments", False, f"Could not reach Paystack ({type(exc).__name__}).", "Try again in a minute.")

    # AI — one tiny request
    if not ai_enabled():
        add("AI helper (Cedar)", False, "No key set, so Cedar is hidden from children (nothing is broken).", "When you are ready: add ANTHROPIC_API_KEY in Render. See the guide's AI section.")
    else:
        reply = await complete("Reply with the single word OK.", "ping", max_tokens=5)
        add("AI helper (Cedar)", reply is not None, f"Working (model {settings.ai_model})." if reply is not None
            else "The key or model name was rejected.", "" if reply is not None else "Check ANTHROPIC_API_KEY and AI_MODEL.")

    return {"all_ok": all(c["ok"] for c in checks), "checks": checks,
            "webhook_reminder": "In Paystack > Settings > API Keys & Webhooks, set the webhook URL to https://<your-api>/api/payments/webhook"}


# ---------------------------------------------------------------- Cedar safety reports
@router.get("/ai-reports")
def ai_reports(session: Session = Depends(get_session)) -> list[AIReport]:
    return list(session.exec(select(AIReport).where(AIReport.resolved == False)  # noqa: E712
                             .order_by(AIReport.id.desc()).limit(50)).all())


@router.post("/ai-reports/{report_id}/resolve")
def resolve_report(report_id: int, session: Session = Depends(get_session)) -> dict:
    r = session.get(AIReport, report_id)
    if r is None:
        raise HTTPException(404, "Not found.")
    r.resolved = True
    session.add(r)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------- bring-your-own questions
class ImportIn(BaseModel):
    questions: list[dict] = Field(max_length=100)


@router.post("/questions/import", status_code=201)
def import_questions(body: ImportIn, session: Session = Depends(get_session)) -> dict:
    """Paste questions drafted anywhere (a teacher, a spreadsheet, any AI chat). They land as HIDDEN drafts."""
    saved, skipped = 0, []
    for i, it in enumerate(body.questions, 1):
        try:
            level, subject = str(it["level"]).strip(), str(it["subject"]).strip().lower()[:40]
            opts = [str(o).strip() for o in it["options"]][:4]
            ans = str(it["answer"]).strip()
            prompt = str(it["prompt"]).strip()[:300]
            if level not in LEVELS or not subject or len(prompt) < 3 or ans not in opts or len(set(opts)) != len(opts) or len(opts) < 2:
                raise ValueError
            session.add(Question(level=level, subject=subject, visual=str(it.get("visual", ""))[:8], prompt=prompt,
                                 options=opts, answer=ans, explanation=str(it.get("explanation", ""))[:300], approved=False))
            saved += 1
        except (KeyError, TypeError, ValueError):
            skipped.append(i)
    session.commit()
    return {"drafted": saved, "skipped_rows": skipped}


@router.delete("/questions/{question_id}", status_code=204, response_class=Response, response_model=None)
def delete_draft(question_id: int, session: Session = Depends(get_session)) -> None:
    q = session.get(Question, question_id)
    if q is None:
        raise HTTPException(404, "Not found.")
    if q.approved:
        raise HTTPException(400, "Only draft questions can be deleted here.")
    session.delete(q)
    session.commit()


# ---------------------------------------------------------------- teacher approvals
@router.get("/teachers")
def teachers(session: Session = Depends(get_session)) -> dict:
    rows = session.exec(select(User).where(User.teacher_status.in_(["pending", "approved"]))).all()
    f = lambda u: {"id": u.id, "name": u.display_name, "email": u.email, "status": u.teacher_status}
    return {"pending": [f(u) for u in rows if u.teacher_status == "pending"], "approved": [f(u) for u in rows if u.teacher_status == "approved"]}


@router.post("/teachers/{user_id}/{decision}")
def decide_teacher(user_id: int, decision: str, session: Session = Depends(get_session)) -> dict:
    if decision not in ("approve", "reject"):
        raise HTTPException(404, "Not found.")
    u = session.get(User, user_id)
    if u is None or u.teacher_status is None:
        raise HTTPException(404, "Not found.")
    u.teacher_status = "approved" if decision == "approve" else "rejected"
    session.add(u)
    session.commit()
    return {"status": u.teacher_status}
