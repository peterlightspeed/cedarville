import uuid
from datetime import date, timedelta

import pytest
from tests.conftest import signup
from tests.test_app import admin, answer_all, make_child  # noqa: F401  (fixtures + helpers)


def new_teacher(client, admin, approve=True):
    email = f"t{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/signup", json={"email": email, "password": "correct-horse-1", "display_name": "Mrs Okoro", "as_teacher": True})
    assert r.status_code == 201 and r.json()["user"]["teacher_status"] == "pending"
    h = {"Authorization": "Bearer " + r.json()["token"]}
    if approve:
        uid = r.json()["user"]["id"]
        assert client.post(f"/api/admin/teachers/{uid}/approve", headers=admin).json()["status"] == "approved"
    return h


def new_class(client, t, level="lower", name="Primary 2 Gold"):
    r = client.post("/api/teacher/classes", headers=t, json={"name": name, "level": level})
    assert r.status_code == 201, r.text
    return r.json()


def bank_ids(client, t, level="lower", subject="maths", count=3):
    return [q["id"] for q in client.get(f"/api/teacher/bank/pick?level={level}&subject={subject}&count={count}", headers=t).json()["questions"]]


def join(client, parent, child, code, board=True):
    return client.post("/api/classes/join", headers=parent, json={"child_id": child["id"], "code": code, "show_on_board": board})


# ---------- teacher accounts ----------
def test_teacher_must_be_approved(client, admin):
    t = new_teacher(client, admin, approve=False)
    assert client.post("/api/teacher/classes", headers=t, json={"name": "Class A", "level": "lower"}).status_code == 403
    pend = client.get("/api/admin/teachers", headers=admin).json()["pending"]
    assert any(p["name"] == "Mrs Okoro" for p in pend)
    me = client.get("/api/auth/me", headers=t).json()
    assert client.post(f"/api/admin/teachers/{me['id']}/approve", headers=admin).status_code == 200
    assert client.post("/api/teacher/classes", headers=t, json={"name": "Class A", "level": "lower"}).status_code == 201


def test_rejected_and_parents_cannot_teach(client, admin, auth):
    assert client.post("/api/teacher/classes", headers=auth, json={"name": "Nope", "level": "lower"}).status_code == 403
    t = new_teacher(client, admin, approve=False)
    uid = client.get("/api/auth/me", headers=t).json()["id"]
    client.post(f"/api/admin/teachers/{uid}/reject", headers=admin)
    assert client.post("/api/teacher/classes", headers=t, json={"name": "Nope", "level": "lower"}).status_code == 403
    assert client.get("/api/admin/teachers", headers=auth).status_code == 403  # admins only


def test_allow_listed_teacher_is_approved_immediately(client):
    r = client.post("/api/auth/signup", json={"email": "autoteach@example.com", "password": "correct-horse-1", "display_name": "Auto"})
    assert r.json()["user"]["teacher_status"] == "approved"


def test_existing_parent_can_request_teacher_access(client, auth, admin):
    assert client.post("/api/auth/request-teacher", headers=auth).json()["teacher_status"] == "pending"
    uid = client.get("/api/auth/me", headers=auth).json()["id"]
    client.post(f"/api/admin/teachers/{uid}/approve", headers=admin)
    assert client.post("/api/teacher/classes", headers=auth, json={"name": "Also a parent", "level": "upper"}).status_code == 201


# ---------- classes and joining ----------
def test_class_codes_and_ownership(client, admin):
    t1, t2 = new_teacher(client, admin), new_teacher(client, admin)
    c = new_class(client, t1)
    assert len(c["code"]) == 6 and not set(c["code"]) & set("0O1I")
    assert client.post("/api/teacher/classes", headers=t1, json={"name": "Bad", "level": "nope"}).status_code == 400
    assert client.post("/api/teacher/classes", headers=t1, json={"name": "<b>x</b>", "level": "lower"}).status_code == 422
    assert client.get(f"/api/teacher/classes/{c['id']}", headers=t2).status_code == 404  # someone else's class
    assert client.delete(f"/api/teacher/classes/{c['id']}", headers=t2).status_code == 404
    assert client.delete(f"/api/teacher/classes/{c['id']}", headers=t1).status_code == 204
    assert client.get("/api/teacher/classes", headers=t1).json()["classes"] == []


def test_parent_joins_with_code_only(client, admin, auth):
    t = new_teacher(client, admin); c = new_class(client, t)
    kid = make_child(client, auth, age=7)
    assert join(client, auth, kid, "ZZZZZZ").status_code == 404
    assert join(client, auth, kid, c["code"].lower()).status_code == 201  # case-insensitive
    assert join(client, auth, kid, c["code"]).status_code == 409
    other = signup(client, f"o{uuid.uuid4().hex[:6]}@example.com")
    assert join(client, other, kid, c["code"]).status_code == 404  # not their child
    assert client.get(f"/api/children/{kid['id']}/classes", headers=auth).json()["classes"][0]["teacher"] == "Mrs Okoro"
    d = client.get(f"/api/teacher/classes/{c['id']}", headers=t).json()
    assert d["students"][0]["name"] == "Ada" and "email" not in str(d)  # no parent details for the teacher
    assert client.delete(f"/api/classes/{c['id']}/children/{kid['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/teacher/classes/{c['id']}", headers=t).json()["students"] == []


# ---------- assignments ----------
def setup_homework(client, admin, auth, due=None):
    t = new_teacher(client, admin); c = new_class(client, t)
    kid = make_child(client, auth, age=7); join(client, auth, kid, c["code"])
    ids = bank_ids(client, t, count=2)
    r = client.post(f"/api/teacher/classes/{c['id']}/assignments", headers=t, json={
        "title": "Week 3 homework", "kind": "homework", "instructions": "Do your best!", "due_date": due, "question_ids": ids,
        "custom": [{"prompt": "What is the name of our school?", "options": ["Cedarville", "Greenfield"], "answer": "Cedarville", "explanation": "Cedarville Private Schools"}]})
    assert r.status_code == 201, r.text
    return t, c, kid, r.json()["id"]


def test_assignment_validation(client, admin):
    t = new_teacher(client, admin); c = new_class(client, t)
    url = f"/api/teacher/classes/{c['id']}/assignments"
    assert client.post(url, headers=t, json={"title": "Empty"}).status_code == 400
    bad = {"prompt": "Pick one", "options": ["a", "b"], "answer": "c"}
    assert client.post(url, headers=t, json={"title": "Bad answer", "custom": [bad]}).status_code == 400
    assert client.post(url, headers=t, json={"title": "Bad id", "question_ids": [999999]}).status_code == 400
    assert client.post(url, headers=t, json={"title": "Bad type", "kind": "party", "question_ids": bank_ids(client, t)}).status_code == 400
    # a teacher cannot borrow another teacher's private question
    t2 = new_teacher(client, admin); c2 = new_class(client, t2)
    own = client.post(f"/api/teacher/classes/{c2['id']}/assignments", headers=t2, json={"title": "Mine", "custom": [{"prompt": "Private?", "options": ["yes", "no"], "answer": "yes"}]}).json()
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Assignment
    with Session(engine) as s:
        qid = s.get(Assignment, own["id"]).question_ids[0]
    assert client.post(url, headers=t, json={"title": "Steal", "question_ids": [qid]}).status_code == 400


def test_child_does_homework_end_to_end(client, admin, auth):
    t, c, kid, aid = setup_homework(client, admin, auth, due=(date.today() + timedelta(days=3)).isoformat())
    lst = client.get(f"/api/learn/assignments?child_id={kid['id']}", headers=auth).json()
    assert lst["todo"] == 1 and lst["assignments"][0]["title"] == "Week 3 homework" and lst["assignments"][0]["questions"] == 3
    hw = client.get(f"/api/learn/assignments/{aid}?child_id={kid['id']}", headers=auth).json()
    assert len(hw["questions"]) == 3 and "answer" not in hw["questions"][0]  # answers never sent
    # instant feedback uses the assignment, even for a teacher's private question
    custom = next(q for q in hw["questions"] if "school" in q["prompt"])
    chk = client.post("/api/learn/check", headers=auth, json={"child_id": kid["id"], "question_id": custom["id"], "answer": "Greenfield", "assignment_id": aid}).json()
    assert chk["correct"] is False and chk["answer"] == "Cedarville"
    # without the assignment the private question is invisible
    assert client.post("/api/learn/check", headers=auth, json={"child_id": kid["id"], "question_id": custom["id"], "answer": "x"}).status_code == 404
    answers = answer_all(client, auth, hw["questions"])
    r = client.post("/api/learn/submit", headers=auth, json={"child_id": kid["id"], "kind": "assignment", "assignment_id": aid, "answers": answers})
    assert r.status_code == 200 and r.json()["correct"] == 3 and r.json()["stars_earned"] == 3 + 2
    assert client.post("/api/learn/submit", headers=auth, json={"child_id": kid["id"], "kind": "assignment", "assignment_id": aid, "answers": answers}).status_code == 409
    assert client.get(f"/api/learn/assignments/{aid}?child_id={kid['id']}", headers=auth).status_code == 409
    assert client.get(f"/api/learn/assignments?child_id={kid['id']}", headers=auth).json()["assignments"][0]["score"] == {"correct": 3, "total": 3}


def test_homework_wrong_set_or_outsider_rejected(client, admin, auth):
    t, c, kid, aid = setup_homework(client, admin, auth)
    hw = client.get(f"/api/learn/assignments/{aid}?child_id={kid['id']}", headers=auth).json()
    partial = answer_all(client, auth, hw["questions"][:2])
    assert client.post("/api/learn/submit", headers=auth, json={"child_id": kid["id"], "kind": "assignment", "assignment_id": aid, "answers": partial}).status_code == 400
    outsider = signup(client, f"x{uuid.uuid4().hex[:6]}@example.com"); k2 = make_child(client, outsider, age=7)
    assert client.get(f"/api/learn/assignments/{aid}?child_id={k2['id']}", headers=outsider).status_code == 404
    assert client.post("/api/learn/submit", headers=outsider, json={"child_id": k2["id"], "kind": "assignment", "assignment_id": aid, "answers": answer_all(client, auth, hw["questions"])}).status_code == 404


def test_late_flag_and_teacher_results(client, admin, auth):
    t, c, kid, aid = setup_homework(client, admin, auth, due=(date.today() - timedelta(days=1)).isoformat())
    assert client.get(f"/api/learn/assignments?child_id={kid['id']}", headers=auth).json()["assignments"][0]["overdue"] is True
    hw = client.get(f"/api/learn/assignments/{aid}?child_id={kid['id']}", headers=auth).json()
    ans = answer_all(client, auth, hw["questions"]); ans[0]["answer"] = "zzz"  # get one wrong
    client.post("/api/learn/submit", headers=auth, json={"child_id": kid["id"], "kind": "assignment", "assignment_id": aid, "answers": ans})
    res = client.get(f"/api/teacher/assignments/{aid}", headers=t).json()
    assert res["summary"] == {"students": 1, "done": 1, "average_pct": 67}
    st = res["students"][0]
    assert st["done"] and st["correct"] == 2 and st["total"] == 3 and st["late"] is True
    assert sorted(q["pct"] for q in res["questions"]) == [0, 100, 100]  # one question everyone missed
    t2 = new_teacher(client, admin)
    assert client.get(f"/api/teacher/assignments/{aid}", headers=t2).status_code == 404
    assert client.delete(f"/api/teacher/assignments/{aid}", headers=t2).status_code == 404
    assert client.delete(f"/api/teacher/assignments/{aid}", headers=t).status_code == 204
    assert client.get(f"/api/learn/assignments?child_id={kid['id']}", headers=auth).json()["assignments"] == []


def test_private_class_questions_never_reach_the_public_bank(client, admin, auth):
    t, c, kid, aid = setup_homework(client, admin, auth)
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Question
    with Session(engine) as s:
        mine = s.exec(select(Question).where(Question.owner_id.is_not(None))).all()
    assert mine and all(q.subject == "class" for q in mine)
    pool = set()
    for _ in range(6):
        pool |= {q["id"] for q in client.get(f"/api/learn/practice?child_id={kid['id']}&subject=maths&count=10", headers=auth).json()["questions"]}
    assert not pool & {q.id for q in mine}


# ---------- leaderboard ----------
def make_family(client, name, age=7):
    h = signup(client, f"{name.lower()}{uuid.uuid4().hex[:5]}@example.com")
    k = client.post("/api/children", json={"name": name, "age": age, "avatar": "🦁"}, headers=h).json()
    return h, k


def give_stars(stars, child_id):
    from sqlmodel import Session
    from app.database import engine
    from app.models import Attempt
    with Session(engine) as s:
        s.add(Attempt(child_id=child_id, kind="practice", subject="maths", day=date.today(), total=5, correct=5, stars_earned=stars)); s.commit()


def test_class_leaderboard_ranks_ties_and_respects_opt_out(client, admin):
    t = new_teacher(client, admin); c = new_class(client, t)
    fams = {n: make_family(client, n) for n in ("Amaka", "Bayo", "Chidi", "Dara")}
    join(client, fams["Amaka"][0], fams["Amaka"][1], c["code"]); join(client, fams["Bayo"][0], fams["Bayo"][1], c["code"])
    join(client, fams["Chidi"][0], fams["Chidi"][1], c["code"]); join(client, fams["Dara"][0], fams["Dara"][1], c["code"], board=False)
    for n, s in (("Amaka", 10), ("Bayo", 10), ("Chidi", 4), ("Dara", 99)):
        give_stars(s, fams[n][1]["id"])
    b = client.get(f"/api/learn/leaderboard?child_id={fams['Chidi'][1]['id']}", headers=fams["Chidi"][0]).json()
    names = [(r["name"], r["rank"]) for r in b["board"]]
    assert names == [("Amaka", 1), ("Bayo", 1), ("Chidi", 3)]  # ties share a rank; opted-out Dara is not shown to others
    assert b["me"]["rank"] == 3 and b["hidden"] is False and b["class"]["teacher"] == "Mrs Okoro"
    d = client.get(f"/api/learn/leaderboard?child_id={fams['Dara'][1]['id']}", headers=fams["Dara"][0]).json()
    assert d["hidden"] is True and d["me"] is None
    tb = client.get(f"/api/teacher/classes/{c['id']}/leaderboard", headers=t).json()["board"]
    assert tb[0]["name"] == "Dara"  # the teacher sees everyone
    assert set(b["board"][0]) == {"child_id", "name", "avatar", "stars", "streak", "rank"}  # nothing more personal than this


def test_leaderboard_needs_a_class_and_stays_inside_it(client, admin):
    h, k = make_family(client, "Solo")
    assert client.get(f"/api/learn/leaderboard?child_id={k['id']}", headers=h).status_code == 404
    t = new_teacher(client, admin); c1, c2 = new_class(client, t, name="One"), new_class(client, t, name="Two")
    (h1, k1), (h2, k2) = make_family(client, "Eze"), make_family(client, "Femi")
    join(client, h1, k1, c1["code"]); join(client, h2, k2, c2["code"])
    give_stars(5, k1["id"]); give_stars(7, k2["id"])
    b = client.get(f"/api/learn/leaderboard?child_id={k1['id']}", headers=h1).json()
    assert [r["name"] for r in b["board"]] == ["Eze"]  # Femi is in a different class: never visible
    assert client.get(f"/api/learn/leaderboard?child_id={k1['id']}&class_id={c2['id']}", headers=h1).json()["class"]["id"] == c1["id"]
    assert client.patch(f"/api/classes/{c1['id']}/children/{k1['id']}?show_on_board=false", headers=h1).json()["show_on_board"] is False
    assert client.get(f"/api/learn/leaderboard?child_id={k1['id']}", headers=h1).json()["hidden"] is True


def test_deleting_child_or_teacher_cleans_up(client, admin):
    t = new_teacher(client, admin); c = new_class(client, t)
    h, k = make_family(client, "Gift"); join(client, h, k, c["code"])
    client.delete(f"/api/children/{k['id']}", headers=h)
    assert client.get(f"/api/teacher/classes/{c['id']}", headers=t).json()["students"] == []
    h2, k2 = make_family(client, "Hope"); join(client, h2, k2, c["code"])
    assert client.post("/api/auth/delete-account", headers=t, json={"password": "correct-horse-1"}).json()["deleted"]
    assert client.get(f"/api/children/{k2['id']}/classes", headers=h2).json()["classes"] == []


def test_admin_is_not_a_teacher_unless_they_ask(client):
    r = client.post("/api/auth/signup", json={"email": "boss@example.com", "password": "correct-horse-1", "display_name": "Boss"}) \
        if client.post("/api/auth/login", json={"email": "boss@example.com", "password": "correct-horse-1"}).status_code != 200 else None
    login = client.post("/api/auth/login", json={"email": "boss@example.com", "password": "correct-horse-1"}).json()
    assert login["user"]["teacher_status"] is None  # lands on the normal parent screens
    h = {"Authorization": "Bearer " + login["token"]}
    assert client.post("/api/auth/request-teacher", headers=h).json()["teacher_status"] == "approved"  # but can opt in at once
