import hashlib
import hmac
import json
from datetime import date, timedelta

import pytest
from tests.conftest import signup


def make_child(client, auth, age=5, name="Ada"):
    r = client.post("/api/children", json={"name": name, "age": age, "avatar": "🦁"}, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


def answer_all(client, auth, qs, correct=True):
    """Look answers up through the admin-free route: grade by brute force using DB."""
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Question
    out = []
    with Session(engine) as s:
        for q in qs:
            row = s.get(Question, q["id"])
            out.append({"question_id": q["id"], "answer": row.answer if correct else "zzz"})
    return out


# ---------- auth ----------
def test_signup_login_me(client):
    h = signup(client, "a@example.com")
    assert client.get("/api/auth/me", headers=h).json()["email"] == "a@example.com"
    r = client.post("/api/auth/login", json={"email": "A@Example.com", "password": "correct-horse-1"})
    assert r.status_code == 200 and r.json()["token"]


def test_duplicate_and_bad_login(client):
    signup(client, "dup@example.com")
    r = client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "correct-horse-1", "display_name": "x"})
    assert r.status_code == 409
    assert client.post("/api/auth/login", json={"email": "dup@example.com", "password": "wrong-password"}).status_code == 401


def test_short_password_rejected(client):
    r = client.post("/api/auth/signup", json={"email": "s@example.com", "password": "short", "display_name": "x"})
    assert r.status_code == 422


def test_requires_login(client):
    assert client.get("/api/children").status_code == 401
    assert client.get("/api/learn/daily?child_id=1").status_code == 401


def test_password_not_stored_plain(client):
    signup(client, "hash@example.com")
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import User
    with Session(engine) as s:
        u = s.exec(select(User).where(User.email == "hash@example.com")).first()
        assert u.password_hash.startswith("$argon2")


# ---------- children ----------
def test_child_levels_and_free_limit(client, auth):
    c = make_child(client, auth, age=3)
    assert c["level"] == "tiny"
    r = client.post("/api/children", json={"name": "Bo", "age": 7}, headers=auth)
    assert r.status_code == 402  # free plan = 1 child


def test_children_are_private(client, auth):
    c = make_child(client, auth)
    other = signup(client, "other@example.com")
    assert client.get(f"/api/learn/daily?child_id={c['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/children/{c['id']}", headers=other).status_code == 404


# ---------- quizzes ----------
def test_daily_quiz_flow_and_streak(client, auth):
    c = make_child(client, auth, age=7)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    assert len(d["questions"]) == 5 and not d["already_done"]
    assert "answer" not in d["questions"][0]  # answers never leak to the browser
    # same questions on a second fetch
    d2 = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    assert [q["id"] for q in d["questions"]] == [q["id"] for q in d2["questions"]]

    body = {"child_id": c["id"], "kind": "daily", "answers": answer_all(client, auth, d["questions"])}
    r = client.post("/api/learn/submit", json=body, headers=auth)
    assert r.status_code == 200
    res = r.json()
    assert res["correct"] == 5 and res["stars_earned"] == 5 + 2 + 3 and res["streak"] == 1

    assert client.post("/api/learn/submit", json=body, headers=auth).status_code == 409  # only once a day
    assert client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()["already_done"]


def test_check_gives_instant_feedback(client, auth):
    c = make_child(client, auth, age=7)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    q = d["questions"][0]
    bad = client.post("/api/learn/check", json={"child_id": c["id"], "question_id": q["id"], "answer": "zzz"}, headers=auth).json()
    assert bad["correct"] is False and bad["answer"] in q["options"]
    good = client.post("/api/learn/check", json={"child_id": c["id"], "question_id": q["id"], "answer": bad["answer"]}, headers=auth).json()
    assert good["correct"] is True
    # a 4-year-old can't peek at a 7-year-old's questions
    other = signup(client, "peek@example.com")
    k = client.post("/api/children", json={"name": "Z", "age": 4}, headers=other).json()
    assert client.post("/api/learn/check", json={"child_id": k["id"], "question_id": q["id"], "answer": "x"}, headers=other).status_code == 404


def test_cannot_submit_other_questions_as_daily(client, auth):
    c = make_child(client, auth, age=7)
    p = client.get(f"/api/learn/practice?child_id={c['id']}", headers=auth).json()
    body = {"child_id": c["id"], "kind": "daily", "answers": answer_all(client, auth, p["questions"])}
    assert client.post("/api/learn/submit", json=body, headers=auth).status_code in (400,)


def test_wrong_answers_score_zero(client, auth):
    c = make_child(client, auth, age=9)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    body = {"child_id": c["id"], "kind": "daily", "answers": answer_all(client, auth, d["questions"], correct=False)}
    res = client.post("/api/learn/submit", json=body, headers=auth).json()
    assert res["correct"] == 0 and res["stars_earned"] == 3  # participation stars for the daily
    assert all(not r["correct"] and r["explanation"] for r in res["review"])


def test_streak_continues_and_resets(client, auth):
    from sqlmodel import Session
    from app.database import engine
    from app.models import Child
    c = make_child(client, auth, age=6)
    with Session(engine) as s:
        ch = s.get(Child, c["id"]); ch.last_daily = date.today() - timedelta(days=1); ch.streak = 4
        s.add(ch); s.commit()
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    r = client.post("/api/learn/submit", json={"child_id": c["id"], "kind": "daily",
                    "answers": answer_all(client, auth, d["questions"])}, headers=auth).json()
    assert r["streak"] == 5


def test_free_practice_limit_then_premium_unlocks(client, auth):
    c = make_child(client, auth, age=5)
    p = client.get(f"/api/learn/practice?child_id={c['id']}&subject=letters", headers=auth).json()
    assert client.post("/api/learn/submit", json={"child_id": c["id"], "kind": "practice", "subject": "letters",
                       "answers": answer_all(client, auth, p["questions"])}, headers=auth).status_code == 200
    assert client.get(f"/api/learn/practice?child_id={c['id']}", headers=auth).status_code == 402

    _grant_premium(client, auth)
    assert client.get(f"/api/learn/practice?child_id={c['id']}", headers=auth).status_code == 200


def test_progress(client, auth):
    c = make_child(client, auth, age=5)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    client.post("/api/learn/submit", json={"child_id": c["id"], "kind": "daily",
                "answers": answer_all(client, auth, d["questions"])}, headers=auth)
    p = client.get(f"/api/children/{c['id']}/progress", headers=auth).json()
    assert len(p["days"]) == 7 and p["total_rounds"] == 1 and p["accuracy"] == 100


# ---------- videos ----------
def test_videos_locked_for_free(client, auth):
    c = make_child(client, auth, age=5)
    admin = {"Authorization": "Bearer " + (client.post("/api/auth/login", json={"email": "boss@example.com", "password": "correct-horse-1"}).json().get("token") or client.post("/api/auth/signup", json={"email": "boss@example.com", "password": "correct-horse-1", "display_name": "B"}).json()["token"])}
    assert client.post("/api/admin/videos", headers=admin, json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Premium song", "premium": True}).status_code in (201, 409)
    vids = client.get(f"/api/learn/videos?child_id={c['id']}", headers=auth).json()["videos"]
    locked = [v for v in vids if v["premium"]]
    assert locked and all(v["locked"] and v["youtube_id"] is None for v in locked)


# ---------- admin ----------
@pytest.fixture()
def admin(client):
    r = client.post("/api/auth/login", json={"email": "boss@example.com", "password": "correct-horse-1"})
    if r.status_code != 200:
        r = client.post("/api/auth/signup", json={"email": "boss@example.com", "password": "correct-horse-1", "display_name": "Boss"})
    assert r.json()["user"]["is_admin"] is True  # ADMIN_EMAILS grants admin
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_admin_only(client, auth):
    assert client.get("/api/admin/videos", headers=auth).status_code == 403
    assert client.post("/api/admin/questions", headers=auth, json={}).status_code == 403


def test_admin_can_add_video_and_question(client, admin):
    r = client.post("/api/admin/videos", headers=admin, json={"url": "https://youtu.be/abcdefghijk", "title": "Test video"})
    assert r.status_code in (201, 409) and (r.status_code == 409 or r.json()["youtube_id"] == "abcdefghijk")
    assert client.post("/api/admin/videos", headers=admin, json={"url": "not a link", "title": "Bad"}).status_code == 400
    q = client.post("/api/admin/questions", headers=admin, json={"level": "nursery", "subject": "animals", "prompt": "Which says moo?",
                    "options": ["Cow", "Cat"], "answer": "Cow"})
    assert q.status_code == 201
    bad = client.post("/api/admin/questions", headers=admin, json={"level": "nursery", "subject": "x", "prompt": "Bad one",
                      "options": ["A", "B"], "answer": "C"})
    assert bad.status_code == 400


def test_ai_drafts_stay_hidden_until_approved(client, admin, monkeypatch):
    from app.api import admin as admin_api
    from app import ai_client
    monkeypatch.setattr(ai_client.settings, "anthropic_api_key", "x")
    async def fake(system, user, max_tokens=300):
        return '```json\n[{"prompt":"What is 1+1?","visual":"2","options":["2","3","4"],"answer":"2","explanation":"1+1=2"},{"prompt":"Broken","options":["a","b"],"answer":"z"}]\n```'
    monkeypatch.setattr(admin_api, "complete", fake)
    r = client.post("/api/admin/questions/generate", headers=admin, json={"level": "lower", "subject": "maths", "count": 2})
    assert r.status_code == 201 and r.json()["drafted"] == 1  # the malformed one is dropped
    drafts = client.get("/api/admin/questions/drafts", headers=admin).json()
    assert any(d["prompt"] == "What is 1+1?" and d["approved"] is False for d in drafts)


# ---------- payments ----------
def _grant_premium(client, auth):
    me = client.get("/api/auth/me", headers=auth).json()
    from sqlmodel import Session
    from app.database import engine
    from app.models import Transaction
    ref = f"ref_{me['id']}_{len(str(auth))}"
    with Session(engine) as s:
        s.add(Transaction(reference=ref, user_id=me["id"], plan_code="premium_monthly", amount_kobo=200_000)); s.commit()
    send_webhook(client, ref, 200_000)
    assert client.get("/api/auth/me", headers=auth).json()["premium"]
    return ref


def send_webhook(client, ref, amount, secret="sk_test_dummy", signature=None):
    body = json.dumps({"event": "charge.success", "data": {"reference": ref, "amount": amount, "currency": "NGN"}}).encode()
    sig = signature or hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()
    return client.post("/api/payments/webhook", content=body, headers={"x-paystack-signature": sig, "content-type": "application/json"})


def test_webhook_rejects_bad_signature(client, auth):
    assert send_webhook(client, "x", 1, signature="deadbeef").status_code == 401
    assert send_webhook(client, "x", 1, secret="wrong").status_code == 401


def test_webhook_idempotent_and_extends_once(client, auth):
    me = client.get("/api/auth/me", headers=auth).json()
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Subscription, Transaction
    with Session(engine) as s:
        s.add(Transaction(reference="idem_1", user_id=me["id"], plan_code="premium_monthly", amount_kobo=200_000)); s.commit()
    assert send_webhook(client, "idem_1", 200_000).status_code == 200
    assert send_webhook(client, "idem_1", 200_000).status_code == 200  # Paystack retry
    with Session(engine) as s:
        assert len(s.exec(select(Subscription).where(Subscription.user_id == me["id"])).all()) == 1


def test_webhook_wrong_amount_does_not_grant(client, auth):
    me = client.get("/api/auth/me", headers=auth).json()
    from sqlmodel import Session
    from app.database import engine
    from app.models import Transaction
    with Session(engine) as s:
        s.add(Transaction(reference="cheat_1", user_id=me["id"], plan_code="premium_yearly", amount_kobo=1_500_000)); s.commit()
    send_webhook(client, "cheat_1", 100)
    assert not client.get("/api/auth/me", headers=auth).json()["premium"]


def test_checkout_uses_paystack(client, auth, monkeypatch):
    import httpx
    from app.api import payments

    class FakeResp:
        def raise_for_status(self): pass
        def json(self): return {"data": {"authorization_url": "https://checkout.paystack.com/abc"}}

    class FakeClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, headers=None, json=None):
            assert json["amount"] == 200_000 and json["currency"] == "NGN"
            return FakeResp()

    monkeypatch.setattr(payments.httpx, "AsyncClient", FakeClient)
    r = client.post("/api/payments/checkout", json={"plan_code": "premium_monthly"}, headers=auth)
    assert r.status_code == 200 and r.json()["authorization_url"].startswith("https://checkout.paystack.com")
    assert client.post("/api/payments/checkout", json={"plan_code": "nope"}, headers=auth).status_code == 404


# ---------- AI ----------
def test_ai_requires_premium(client, auth):
    c = make_child(client, auth)
    assert client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "hi"}, headers=auth).status_code == 402


def test_ai_fallback_and_privacy(client, auth, monkeypatch):
    from app.api import ai
    c = make_child(client, auth)
    _grant_premium(client, auth)
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "hi"}, headers=auth).json()
    assert r["ai"] is False and r["reply"]  # no key -> friendly fallback

    seen = {}
    async def fake(system, user, max_tokens=300):
        seen["user"] = user
        return "Hoo-hoo! A cat has four legs. 🐱"
    monkeypatch.setattr(ai, "complete", fake)
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "call me on 08012345678 or mail a@b.com about cats"}, headers=auth).json()
    assert r["ai"] is True
    assert "08012345678" not in seen["user"] and "a@b.com" not in seen["user"] and "Ada" not in seen["user"]


# ---------- misc ----------
def test_health_and_legacy_content(client):
    h = client.get("/api/health").json()
    assert h["checks"]["database"] is True
    assert client.get("/api/faq.json").status_code == 200
    assert client.get("/api/plans").status_code in (200, 404)
    assert client.get("/api/payments/plans").json()["plans"]


# ---------- v2 security ----------
def test_weak_passwords_rejected(client):
    for pw in ("password123", "aaaaaaaa", "12345678"):
        r = client.post("/api/auth/signup", json={"email": "weak@example.com", "password": pw, "display_name": "x"})
        assert r.status_code == 422, pw
        assert "easy to guess" in r.json()["detail"]


def test_login_lockout_after_five_failures(client):
    signup(client, "lock@example.com")
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "lock@example.com", "password": "nope-nope-1"}).status_code == 401
    # even the right password is refused while locked
    r = client.post("/api/auth/login", json={"email": "lock@example.com", "password": "correct-horse-1"})
    assert r.status_code == 429
    from app import deps
    deps.clear_login_failures("lock@example.com")
    assert client.post("/api/auth/login", json={"email": "lock@example.com", "password": "correct-horse-1"}).status_code == 200


def test_change_password_kills_old_tokens(client):
    import time
    h = signup(client, "chg@example.com")
    time.sleep(1.2)
    r = client.post("/api/auth/change-password", headers=h, json={"current_password": "wrong-one-123", "new_password": "brand-new-pass-9"})
    assert r.status_code == 401
    r = client.post("/api/auth/change-password", headers=h, json={"current_password": "correct-horse-1", "new_password": "brand-new-pass-9"})
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401  # old token dead
    new = {"Authorization": "Bearer " + r.json()["token"]}
    assert client.get("/api/auth/me", headers=new).status_code == 200
    assert client.post("/api/auth/login", json={"email": "chg@example.com", "password": "brand-new-pass-9"}).status_code == 200


def test_delete_account_erases_family_data(client):
    h = signup(client, "bye@example.com")
    c = make_child(client, h, age=6)
    assert client.post("/api/auth/delete-account", headers=h, json={"password": "wrong"}).status_code == 401
    assert client.post("/api/auth/delete-account", headers=h, json={"password": "correct-horse-1"}).json()["deleted"]
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Child, User
    with Session(engine) as s:
        assert s.exec(select(Child).where(Child.id == c["id"])).first() is None
        assert s.exec(select(User).where(User.email == "bye@example.com")).first() is None
    assert client.post("/api/auth/login", json={"email": "bye@example.com", "password": "correct-horse-1"}).status_code == 401
    # the email can be used again for a fresh account
    signup(client, "bye@example.com")


def test_avatar_and_name_validated(client, auth):
    assert client.post("/api/children", json={"name": "Ada", "age": 5, "avatar": "<script>"}, headers=auth).status_code == 422
    assert client.post("/api/children", json={"name": "<b>Ada</b>", "age": 5, "avatar": "🦁"}, headers=auth).status_code == 422


def test_security_headers_and_no_store(client, auth):
    r = client.get("/api/children", headers=auth)
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["cache-control"] == "no-store"
    assert "permissions-policy" in r.headers


def test_tampered_token_rejected(client):
    h = signup(client, "tamper@example.com")
    bad = {"Authorization": h["Authorization"][:-3] + "abc"}
    assert client.get("/api/auth/me", headers=bad).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}).status_code == 401


def test_diagnostics_admin_only_and_honest(client, auth, admin, monkeypatch):
    assert client.get("/api/admin/diagnostics", headers=auth).status_code == 403
    r = client.get("/api/admin/diagnostics", headers=admin).json()
    by = {c["name"]: c for c in r["checks"]}
    assert r["all_ok"] is False
    assert by["Database (Neon / Postgres)"]["ok"] is False and "local file" in by["Database (Neon / Postgres)"]["detail"]  # SQLite in tests
    assert by["AI helper (Cedar)"]["ok"] is False
    assert by["SECRET_KEY"]["ok"] is True
    blob = json.dumps(r)
    assert "sk_test_dummy" not in blob and "test-secret-key" not in blob  # secrets never leak

    # Paystack key accepted / rejected
    from app.api import admin as admin_api
    class Resp:
        def __init__(self, code): self.status_code = code
    class FakeClient:
        code = 200
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def get(self, url, headers=None): return Resp(FakeClient.code)
    monkeypatch.setattr(admin_api.httpx, "AsyncClient", FakeClient)
    ok = {c["name"]: c for c in client.get("/api/admin/diagnostics", headers=admin).json()["checks"]}["Paystack payments"]
    assert ok["ok"] is True and "test mode" in ok["detail"]
    FakeClient.code = 401
    bad = {c["name"]: c for c in client.get("/api/admin/diagnostics", headers=admin).json()["checks"]}["Paystack payments"]
    assert bad["ok"] is False and "401" in bad["detail"]
