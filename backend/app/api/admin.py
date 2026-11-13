"""Teacher/admin tools: curate videos, add and approve questions."""
from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.ai_client import ai_enabled, complete
from app.database import get_session
from app.deps import require_admin
from app.models import LEVELS, Question, User, Video

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
