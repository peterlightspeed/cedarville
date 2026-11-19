"""Teachers, classes, assignments and class leaderboards.

Privacy rules built in:
  * A child only joins a class when their PARENT enters the class code (that is the consent).
  * Teachers see a child's first name, avatar and results for the class, never parent details.
  * The leaderboard is per class only (never school-wide), first names only, and a parent can opt out.
"""
from __future__ import annotations

import random
import secrets
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, delete, select

from app.database import get_session
from app.deps import get_current_user, get_own_child, rate_limit, require_teacher
from app.models import (LEVELS, Assignment, AssignmentResult, Attempt, Child, ClassMember, Classroom, Question, User)

router = APIRouter(tags=["classroom"])
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I so codes are easy to read out loud
KINDS = ("homework", "exercise", "quiz")


# ----------------------------------------------------------------- helpers
def _week_start() -> date:
    t = date.today()
    return t - timedelta(days=t.weekday())


def _stars(session: Session, child_ids: list[int], since: date | None) -> dict[int, int]:
    out = {c: 0 for c in child_ids}
    if not child_ids:
        return out
    stmt = select(Attempt).where(Attempt.child_id.in_(child_ids))
    if since:
        stmt = stmt.where(Attempt.day >= since)
    for a in session.exec(stmt).all():
        out[a.child_id] += a.stars_earned
    return out


def own_class(session: Session, class_id: int, teacher: User) -> Classroom:
    c = session.get(Classroom, class_id)
    if c is None or c.teacher_id != teacher.id or c.archived:
        raise HTTPException(404, "Class not found.")
    return c


def assignment_for_child(session: Session, child: Child, assignment_id: int) -> Assignment:
    """The assignment, only if this child really is in its class."""
    a = session.get(Assignment, assignment_id)
    if a is None or not session.exec(select(ClassMember).where(ClassMember.class_id == a.class_id,
                                                                ClassMember.child_id == child.id)).first():
        raise HTTPException(404, "Homework not found.")
    return a


def build_board(session: Session, cls: Classroom, period: str, only_opted_in: bool) -> list[dict]:
    members = session.exec(select(ClassMember).where(ClassMember.class_id == cls.id)).all()
    if only_opted_in:
        members = [m for m in members if m.show_on_board]
    kids = {c.id: c for c in session.exec(select(Child).where(Child.id.in_([m.child_id for m in members]))).all()} if members else {}
    stars = _stars(session, list(kids), _week_start() if period == "week" else None)
    rows = sorted(({"child_id": k, "name": c.name, "avatar": c.avatar, "stars": stars[k], "streak": c.streak} for k, c in kids.items()),
                  key=lambda r: (-r["stars"], r["name"].lower()))
    rank, prev = 0, None
    for i, r in enumerate(rows, 1):
        if r["stars"] != prev:
            rank, prev = i, r["stars"]
        r["rank"] = rank  # equal stars share a rank
    return rows


# ----------------------------------------------------------------- teacher: classes
class ClassIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    level: str

    @field_validator("name")
    @classmethod
    def tidy(cls, v: str) -> str:
        v = " ".join(v.split())
        if any(ch in v for ch in "<>&\"'`"):
            raise ValueError("Please use letters, numbers and spaces only.")
        return v


def _new_code(session: Session) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not session.exec(select(Classroom).where(Classroom.code == code)).first():
            return code
    raise HTTPException(500, "Could not make a class code. Please try again.")


def _class_out(session: Session, c: Classroom) -> dict:
    n = len(session.exec(select(ClassMember).where(ClassMember.class_id == c.id)).all())
    a = len(session.exec(select(Assignment).where(Assignment.class_id == c.id)).all())
    return {"id": c.id, "name": c.name, "level": c.level, "code": c.code, "students": n, "assignments": a}


@router.get("/teacher/classes")
def list_classes(t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    rows = session.exec(select(Classroom).where(Classroom.teacher_id == t.id, Classroom.archived == False)  # noqa: E712
                        .order_by(Classroom.id)).all()
    return {"classes": [_class_out(session, c) for c in rows]}


@router.post("/teacher/classes", status_code=201)
def create_class(body: ClassIn, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    if body.level not in LEVELS:
        raise HTTPException(400, f"Level must be one of {LEVELS}")
    if len(session.exec(select(Classroom).where(Classroom.teacher_id == t.id, Classroom.archived == False)).all()) >= 20:  # noqa: E712
        raise HTTPException(400, "You already have 20 classes.")
    c = Classroom(teacher_id=t.id, name=body.name, level=body.level, code=_new_code(session))
    session.add(c)
    session.commit()
    session.refresh(c)
    return _class_out(session, c)


@router.delete("/teacher/classes/{class_id}", status_code=204, response_class=Response, response_model=None)
def archive_class(class_id: int, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> None:
    c = own_class(session, class_id, t)
    c.archived = True
    session.add(c)
    session.commit()


@router.get("/teacher/classes/{class_id}")
def class_detail(class_id: int, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    c = own_class(session, class_id, t)
    members = session.exec(select(ClassMember).where(ClassMember.class_id == c.id)).all()
    kids = {k.id: k for k in session.exec(select(Child).where(Child.id.in_([m.child_id for m in members]))).all()} if members else {}
    week, total = _stars(session, list(kids), _week_start()), _stars(session, list(kids), None)
    assigns = session.exec(select(Assignment).where(Assignment.class_id == c.id).order_by(Assignment.id.desc())).all()
    results = session.exec(select(AssignmentResult).where(AssignmentResult.assignment_id.in_([a.id for a in assigns]))).all() if assigns else []
    done_by_kid: dict[int, int] = {}
    done_by_assign: dict[int, int] = {}
    for r in results:
        done_by_kid[r.child_id] = done_by_kid.get(r.child_id, 0) + 1
        done_by_assign[r.assignment_id] = done_by_assign.get(r.assignment_id, 0) + 1
    return {
        "class": _class_out(session, c),
        "students": sorted(({"child_id": k, "name": kids[k].name, "avatar": kids[k].avatar, "age": kids[k].age,
                             "stars_week": week[k], "stars_total": total[k], "streak": kids[k].streak,
                             "homework_done": done_by_kid.get(k, 0), "homework_total": len(assigns),
                             "on_board": next(m.show_on_board for m in members if m.child_id == k)} for k in kids),
                           key=lambda r: r["name"].lower()),
        "assignments": [{"id": a.id, "title": a.title, "kind": a.kind, "due_date": a.due_date.isoformat() if a.due_date else None,
                         "questions": len(a.question_ids), "done": done_by_assign.get(a.id, 0), "of": len(members)} for a in assigns],
    }


@router.delete("/teacher/classes/{class_id}/students/{child_id}", status_code=204, response_class=Response, response_model=None)
def remove_student(class_id: int, child_id: int, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> None:
    c = own_class(session, class_id, t)
    session.exec(delete(ClassMember).where(ClassMember.class_id == c.id, ClassMember.child_id == child_id))
    session.commit()


@router.get("/teacher/classes/{class_id}/leaderboard")
def teacher_board(class_id: int, period: str = Query("week", pattern="^(week|all)$"),
                  t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    c = own_class(session, class_id, t)
    return {"period": period, "board": build_board(session, c, period, only_opted_in=False)}


# ----------------------------------------------------------------- teacher: question bank + assignments
@router.get("/teacher/bank/subjects")
def bank_subjects(level: str, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    counts: dict[str, int] = {}
    for q in session.exec(select(Question).where(Question.level == level, Question.approved == True,  # noqa: E712
                                                 Question.owner_id == None)).all():  # noqa: E711
        counts[q.subject] = counts.get(q.subject, 0) + 1
    return {"subjects": [{"subject": k, "count": v} for k, v in sorted(counts.items())]}


@router.get("/teacher/bank/pick")
def bank_pick(level: str, subject: str, count: int = Query(5, ge=1, le=15), exclude: str = "",
              t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    skip = {int(x) for x in exclude.split(",") if x.strip().isdigit()}
    pool = [q for q in session.exec(select(Question).where(Question.level == level, Question.subject == subject,
                                                           Question.approved == True, Question.owner_id == None)).all()  # noqa: E712,E711
            if q.id not in skip]
    pick = random.sample(pool, min(count, len(pool)))
    return {"questions": [{"id": q.id, "subject": q.subject, "visual": q.visual, "prompt": q.prompt,
                           "options": q.options, "answer": q.answer} for q in pick]}


class CustomQ(BaseModel):
    prompt: str = Field(min_length=3, max_length=300)
    options: list[str] = Field(min_length=2, max_length=4)
    answer: str
    explanation: str = Field(default="", max_length=300)
    visual: str = Field(default="", max_length=8)


class AssignmentIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    instructions: str = Field(default="", max_length=500)
    kind: str = "homework"
    due_date: date | None = None
    question_ids: list[int] = Field(default_factory=list, max_length=30)
    custom: list[CustomQ] = Field(default_factory=list, max_length=30)


@router.post("/teacher/classes/{class_id}/assignments", status_code=201)
def create_assignment(class_id: int, body: AssignmentIn, t: User = Depends(require_teacher),
                      session: Session = Depends(get_session)) -> dict:
    c = own_class(session, class_id, t)
    if body.kind not in KINDS:
        raise HTTPException(400, f"Type must be one of {KINDS}")
    if not 1 <= len(body.question_ids) + len(body.custom) <= 30:
        raise HTTPException(400, "Add between 1 and 30 questions.")
    ids = list(dict.fromkeys(body.question_ids))
    found = {q.id: q for q in session.exec(select(Question).where(Question.id.in_(ids))).all()} if ids else {}
    for i in ids:
        q = found.get(i)
        if q is None or not q.approved or (q.owner_id is not None and q.owner_id != t.id):
            raise HTTPException(400, "One of the chosen questions is not available.")
    new_ids: list[int] = []
    for cq in body.custom:
        opts = [o.strip() for o in cq.options]
        if cq.answer.strip() not in opts or len(set(opts)) != len(opts) or any(not o for o in opts):
            raise HTTPException(400, f"For '{cq.prompt[:30]}', the answer must be one of the options and options must differ.")
        q = Question(level=c.level, subject="class", visual=cq.visual, prompt=cq.prompt.strip(), options=opts,
                     answer=cq.answer.strip(), explanation=cq.explanation, approved=True, owner_id=t.id)
        session.add(q)
        session.flush()
        new_ids.append(q.id)
    a = Assignment(class_id=c.id, teacher_id=t.id, title=body.title.strip(), instructions=body.instructions.strip(), kind=body.kind,
                   due_date=body.due_date, question_ids=ids + new_ids)
    session.add(a)
    session.commit()
    session.refresh(a)
    return {"id": a.id, "questions": len(a.question_ids)}


@router.get("/teacher/assignments/{assignment_id}")
def assignment_results(assignment_id: int, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> dict:
    a = session.get(Assignment, assignment_id)
    if a is None or a.teacher_id != t.id:
        raise HTTPException(404, "Assignment not found.")
    members = session.exec(select(ClassMember).where(ClassMember.class_id == a.class_id)).all()
    kids = {k.id: k for k in session.exec(select(Child).where(Child.id.in_([m.child_id for m in members]))).all()} if members else {}
    results = {r.child_id: r for r in session.exec(select(AssignmentResult).where(AssignmentResult.assignment_id == a.id)).all()}
    students = []
    for k, ch in sorted(kids.items(), key=lambda kv: kv[1].name.lower()):
        r = results.get(k)
        students.append({"child_id": k, "name": ch.name, "avatar": ch.avatar, "done": r is not None,
                         "correct": r.correct if r else None, "total": r.total if r else len(a.question_ids),
                         "late": bool(r and r.late), "submitted_at": r.submitted_at.isoformat() if r else None})
    qs = {q.id: q for q in session.exec(select(Question).where(Question.id.in_(a.question_ids))).all()}
    per_q = []
    for qid in a.question_ids:
        answered = [x for r in results.values() for x in r.answers if x["question_id"] == qid]
        right = sum(1 for x in answered if x["correct"])
        q = qs.get(qid)
        per_q.append({"question_id": qid, "prompt": q.prompt if q else "(removed)", "answer": q.answer if q else "",
                      "answered": len(answered), "correct": right, "pct": round(100 * right / len(answered)) if answered else None})
    done = [r for r in results.values()]
    return {
        "assignment": {"id": a.id, "title": a.title, "kind": a.kind, "instructions": a.instructions,
                       "due_date": a.due_date.isoformat() if a.due_date else None, "class_id": a.class_id},
        "summary": {"students": len(members), "done": len(done),
                    "average_pct": round(100 * sum(r.correct for r in done) / max(1, sum(r.total for r in done))) if done else None},
        "students": students, "questions": per_q,
    }


@router.delete("/teacher/assignments/{assignment_id}", status_code=204, response_class=Response, response_model=None)
def delete_assignment(assignment_id: int, t: User = Depends(require_teacher), session: Session = Depends(get_session)) -> None:
    a = session.get(Assignment, assignment_id)
    if a is None or a.teacher_id != t.id:
        raise HTTPException(404, "Assignment not found.")
    session.exec(delete(AssignmentResult).where(AssignmentResult.assignment_id == a.id))
    session.exec(delete(Question).where(Question.id.in_(a.question_ids), Question.owner_id == t.id))
    session.delete(a)
    session.commit()


# ----------------------------------------------------------------- parent: join / leave
class JoinIn(BaseModel):
    child_id: int
    code: str = Field(min_length=4, max_length=10)
    show_on_board: bool = True


@router.post("/classes/join", status_code=201, dependencies=[Depends(rate_limit("joinclass", 15))])
def join_class(body: JoinIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(body.child_id, user, session)
    c = session.exec(select(Classroom).where(Classroom.code == body.code.strip().upper(), Classroom.archived == False)).first()  # noqa: E712
    if c is None:
        raise HTTPException(404, "We couldn't find a class with that code. Please check it with the teacher.")
    if session.exec(select(ClassMember).where(ClassMember.class_id == c.id, ClassMember.child_id == child.id)).first():
        raise HTTPException(409, f"{child.name} is already in {c.name}.")
    session.add(ClassMember(class_id=c.id, child_id=child.id, show_on_board=body.show_on_board))
    session.commit()
    return {"class_id": c.id, "name": c.name}


@router.get("/children/{child_id}/classes")
def child_classes(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    out = []
    for m in session.exec(select(ClassMember).where(ClassMember.child_id == child.id)).all():
        c = session.get(Classroom, m.class_id)
        if c and not c.archived:
            t = session.get(User, c.teacher_id)
            out.append({"class_id": c.id, "name": c.name, "teacher": t.display_name if t else "", "show_on_board": m.show_on_board})
    return {"classes": out}


@router.patch("/classes/{class_id}/children/{child_id}")
def set_board_choice(class_id: int, child_id: int, show_on_board: bool, user: User = Depends(get_current_user),
                     session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    m = session.exec(select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.child_id == child.id)).first()
    if m is None:
        raise HTTPException(404, "Not in this class.")
    m.show_on_board = show_on_board
    session.add(m)
    session.commit()
    return {"show_on_board": m.show_on_board}


@router.delete("/classes/{class_id}/children/{child_id}", status_code=204, response_class=Response, response_model=None)
def leave_class(class_id: int, child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> None:
    child = get_own_child(child_id, user, session)
    session.exec(delete(ClassMember).where(ClassMember.class_id == class_id, ClassMember.child_id == child.id))
    session.commit()


# ----------------------------------------------------------------- child (through the parent's login)
def _assign_row(a: Assignment, cname: str, res: AssignmentResult | None) -> dict:
    return {"id": a.id, "title": a.title, "kind": a.kind, "instructions": a.instructions, "class_id": a.class_id, "class_name": cname,
            "due_date": a.due_date.isoformat() if a.due_date else None, "questions": len(a.question_ids), "done": res is not None,
            "score": {"correct": res.correct, "total": res.total} if res else None,
            "overdue": bool(a.due_date and not res and date.today() > a.due_date)}


@router.get("/learn/assignments")
def my_assignments(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    members = session.exec(select(ClassMember).where(ClassMember.child_id == child.id)).all()
    classes, rows = [], []
    for m in members:
        c = session.get(Classroom, m.class_id)
        if c is None or c.archived:
            continue
        t = session.get(User, c.teacher_id)
        classes.append({"id": c.id, "name": c.name, "teacher": t.display_name if t else "", "show_on_board": m.show_on_board})
        for a in session.exec(select(Assignment).where(Assignment.class_id == c.id)).all():
            res = session.exec(select(AssignmentResult).where(AssignmentResult.assignment_id == a.id, AssignmentResult.child_id == child.id)).first()
            rows.append(_assign_row(a, c.name, res))
    rows.sort(key=lambda r: (r["done"], r["due_date"] or "9999", -r["id"]))
    return {"classes": classes, "assignments": rows, "todo": sum(1 for r in rows if not r["done"])}


@router.get("/learn/assignments/{assignment_id}")
def start_assignment(assignment_id: int, child_id: int, user: User = Depends(get_current_user),
                     session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    a = assignment_for_child(session, child, assignment_id)
    if session.exec(select(AssignmentResult).where(AssignmentResult.assignment_id == a.id, AssignmentResult.child_id == child.id)).first():
        raise HTTPException(409, "This homework is already handed in. Well done!")
    rng = random.Random(f"hw:{a.id}:{child.id}")
    qs = {q.id: q for q in session.exec(select(Question).where(Question.id.in_(a.question_ids))).all()}
    out = []
    for qid in a.question_ids:
        q = qs.get(qid)
        if q:
            opts = list(q.options)
            rng.shuffle(opts)
            out.append({"id": q.id, "subject": q.subject, "visual": q.visual, "prompt": q.prompt, "options": opts})
    return {"assignment": {"id": a.id, "title": a.title, "instructions": a.instructions, "kind": a.kind}, "questions": out}


@router.get("/learn/leaderboard")
def child_board(child_id: int, class_id: int | None = None, period: str = Query("week", pattern="^(week|all)$"),
                user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    members = {m.class_id: m for m in session.exec(select(ClassMember).where(ClassMember.child_id == child.id)).all()}
    classes = [c for c in (session.get(Classroom, cid) for cid in members) if c and not c.archived]
    if not classes:
        raise HTTPException(404, "Not in a class yet.")
    cls = next((c for c in classes if c.id == class_id), classes[0])
    board = build_board(session, cls, period, only_opted_in=True)
    mine = next((r for r in board if r["child_id"] == child.id), None)
    t = session.get(User, cls.teacher_id)
    return {"classes": [{"id": c.id, "name": c.name} for c in classes], "class": {"id": cls.id, "name": cls.name, "teacher": t.display_name if t else ""},
            "period": period, "board": board[:10], "me": mine, "hidden": not members[cls.id].show_on_board, "members": len(board)}
