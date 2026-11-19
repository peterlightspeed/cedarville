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
def test_videos_locked_for_free(client, auth, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "enable_videos", True)
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
def test_ai_free_taster_then_premium_wall(client, auth):
    c = make_child(client, auth)
    st = client.get(f"/api/ai/status?child_id={c['id']}", headers=auth).json()
    assert st["premium"] is False and st["limit"] == 3 and st["left"] == 3
    for _ in range(3):  # three free questions (no AI key in tests -> friendly fallback, still counts)
        assert client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "hi"}, headers=auth).status_code == 200
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "hi"}, headers=auth)
    assert r.status_code == 402 and "Premium" in r.json()["detail"]
    assert client.get(f"/api/ai/status?child_id={c['id']}", headers=auth).json()["left"] == 0
    _grant_premium(client, auth)  # paying unlocks more straight away
    assert client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "hi"}, headers=auth).status_code == 200


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


# ---------- v4: Google sign-in, migrations, startup guard ----------
FAKE_TOKEN = "x" * 40


@pytest.fixture()
def google(monkeypatch):
    from app.api import auth as auth_api
    monkeypatch.setattr(auth_api.settings, "google_client_id", "client-123.apps.googleusercontent.com")
    state = {"info": {"iss": "https://accounts.google.com", "sub": "g-1", "email": "Kemi@Example.com",
                      "email_verified": True, "name": "Kemi Ade"}, "fail": False}

    def fake_verify(credential):
        if state["fail"]:
            raise ValueError("bad signature")
        return state["info"]
    monkeypatch.setattr(auth_api, "verify_google_token", fake_verify)
    return state


def test_google_off_when_not_configured(client):
    assert client.get("/api/auth/providers").json()["google_client_id"] is None
    assert client.post("/api/auth/google", json={"credential": FAKE_TOKEN}).status_code == 503


def test_google_new_account_needs_consent_then_works(client, google):
    assert client.get("/api/auth/providers").json()["google_client_id"].startswith("client-123")
    r = client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": False})
    assert r.status_code == 409 and "Sign up" in r.json()["detail"]
    r = client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": True})
    assert r.status_code == 200
    u = r.json()["user"]
    assert u["email"] == "kemi@example.com" and u["display_name"] == "Kemi Ade" and u["google"] and not u["has_password"]
    h = {"Authorization": "Bearer " + r.json()["token"]}
    assert client.get("/api/auth/me", headers=h).status_code == 200
    # signing in again (even without ticking the box) returns the same account
    again = client.post("/api/auth/google", json={"credential": FAKE_TOKEN}).json()
    assert again["user"]["id"] == u["id"]


def test_google_rejects_bad_token(client, google):
    google["fail"] = True
    assert client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": True}).status_code == 401


def test_google_cannot_be_used_to_log_in_with_a_password(client, google):
    google["info"] = {**google["info"], "sub": "g-nopw", "email": "nopw@example.com"}
    client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": True})
    r = client.post("/api/auth/login", json={"email": "nopw@example.com", "password": "!"})
    assert r.status_code == 401


def test_google_link_disables_preregistered_password(client, google):
    """Pre-hijack defence: a stranger registers the victim's email with a password first."""
    import time
    google["info"] = {**google["info"], "sub": "g-victim", "email": "victim@example.com"}
    attacker = signup(client, "victim@example.com")
    time.sleep(1.2)
    r = client.post("/api/auth/google", json={"credential": FAKE_TOKEN}).json()
    assert "Google" in r["note"]
    assert client.get("/api/auth/me", headers=attacker).status_code == 401  # attacker's session is dead
    assert client.post("/api/auth/login", json={"email": "victim@example.com", "password": "correct-horse-1"}).status_code == 401


def test_google_account_password_and_delete_rules(client, google):
    google["info"] = {**google["info"], "sub": "g-del", "email": "del@example.com"}
    r = client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": True}).json()
    h = {"Authorization": "Bearer " + r["token"]}
    assert client.post("/api/auth/change-password", headers=h, json={"current_password": "x", "new_password": "purple-mango-sky-7"}).status_code == 400
    assert client.post("/api/auth/delete-account", headers=h, json={"confirm": "nope"}).status_code == 400
    assert client.post("/api/auth/delete-account", headers=h, json={"confirm": "DELETE"}).json()["deleted"]
    assert client.get("/api/auth/me", headers=h).status_code == 401  # token dies immediately


def test_google_admin_email_gets_admin(client, google):
    google["info"] = {**google["info"], "sub": "g-boss", "email": "gboss@example.com"}
    r = client.post("/api/auth/google", json={"credential": FAKE_TOKEN, "accepted_terms": True}).json()
    assert r["user"]["is_admin"] is True


def test_add_missing_columns_upgrades_old_database(tmp_path):
    """A database made by an older release (no google_sub column) is upgraded in place, data kept."""
    from sqlalchemy import create_engine, inspect, text
    from app.database import add_missing_columns
    eng = create_engine(f"sqlite:///{tmp_path}/old.db")
    with eng.begin() as c:
        c.execute(text('CREATE TABLE "user" (id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, password_hash VARCHAR NOT NULL, '
                       'display_name VARCHAR NOT NULL, is_admin BOOLEAN NOT NULL DEFAULT 0, created_at DATETIME NOT NULL)'))
        c.execute(text("INSERT INTO \"user\" VALUES (1,'old@example.com','h','Old',0,'2026-01-01')"))
    add_missing_columns(eng)
    cols = {c["name"] for c in inspect(eng).get_columns("user")}
    assert {"google_sub", "password_changed_at"} <= cols
    with eng.connect() as c:
        assert c.execute(text('SELECT email FROM "user"')).scalar() == "old@example.com"
    add_missing_columns(eng)  # idempotent


def test_production_refuses_to_start_without_secret(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    monkeypatch.setattr(main.settings, "env", "production")
    monkeypatch.setattr(main.settings, "secret_key", "dev-only-change-me-please-32-chars-min")
    with pytest.raises(RuntimeError, match="STARTUP BLOCKED.*SECRET_KEY"):
        with TestClient(main.app):
            pass


# ---------- v5: free vs premium ----------
def test_locked_subjects_for_free_families(client, auth):
    c = make_child(client, auth, age=9)  # upper level: maths is free, science/english/etc are Premium
    subs = client.get(f"/api/learn/subjects?child_id={c['id']}", headers=auth).json()["subjects"]
    by = {x["key"]: x for x in subs}
    assert by["maths"]["locked"] is False and by["science"]["locked"] is True
    assert subs[0]["locked"] is False  # free subjects are listed first
    r = client.get(f"/api/learn/practice?child_id={c['id']}&subject=science", headers=auth)
    assert r.status_code == 402 and "Premium" in r.json()["detail"]
    ok = client.get(f"/api/learn/practice?child_id={c['id']}&subject=maths", headers=auth)
    assert ok.status_code == 200


def test_free_surprise_me_only_uses_free_subjects_and_5_questions(client, auth):
    c = make_child(client, auth, age=9)
    q = client.get(f"/api/learn/practice?child_id={c['id']}&count=10", headers=auth).json()
    assert len(q["questions"]) == 5 and all(x["subject"] == "maths" for x in q["questions"])


def test_premium_unlocks_everything(client, auth):
    c = make_child(client, auth, age=9)
    _grant_premium(client, auth)
    subs = client.get(f"/api/learn/subjects?child_id={c['id']}", headers=auth).json()["subjects"]
    assert not any(x["locked"] for x in subs)
    assert client.get(f"/api/learn/practice?child_id={c['id']}&subject=science&count=10", headers=auth).status_code == 200


def test_daily_quiz_stays_free_and_mixed(client, auth):
    c = make_child(client, auth, age=9)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    assert len(d["questions"]) == 5  # never locked behind payment: it is the daily habit


def test_progress_insights_are_premium(client, auth):
    c = make_child(client, auth, age=9)
    for _ in range(2):  # build some history in one subject
        p = client.get(f"/api/learn/practice?child_id={c['id']}&subject=maths", headers=auth)
        if p.status_code != 200:
            break
        client.post("/api/learn/submit", json={"child_id": c["id"], "kind": "practice", "subject": "maths",
                    "answers": answer_all(client, auth, p.json()["questions"])}, headers=auth)
    free = client.get(f"/api/children/{c['id']}/progress", headers=auth).json()
    assert free["insights_locked"] is True and free["subjects"] == [] and free["strengths"] == []
    _grant_premium(client, auth)
    prem = client.get(f"/api/children/{c['id']}/progress", headers=auth).json()
    assert prem["insights_locked"] is False and prem["subjects"] and prem["subjects"][0]["subject"] == "maths"
    assert "maths" in prem["strengths"]


def test_comparison_table_matches_real_limits(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")
    rows = {r["feature"]: r for r in client.get("/api/payments/plans").json()["comparison"]}
    assert rows["Practice rounds"]["free"] == "1 a day" and rows["Practice rounds"]["premium"] == "Unlimited"
    assert "Maths" in rows["Practice subjects"]["free"]
    assert rows["Cedar the Owl (AI helper)"]["free"] == "3 questions a day"
    assert rows["Child profiles"]["free"] == "1"


# ---------- v6: ad attribution, funnel stats, upgrade page data ----------
def test_signup_stores_first_touch_campaign_and_rejects_junk(client):
    r = client.post("/api/auth/signup", json={"email": "fb1@example.com", "password": "correct-horse-1", "display_name": "A",
                    "utm": {"utm_source": "facebook", "utm_medium": "paid", "utm_campaign": "nov-launch", "evil": "x"}})
    assert r.status_code == 201
    client.post("/api/auth/signup", json={"email": "fb2@example.com", "password": "correct-horse-1", "display_name": "B",
                "utm": {"utm_source": "<script>alert(1)</script>", "utm_campaign": "x" * 200}})
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import User
    with Session(engine) as s:
        a = s.exec(select(User).where(User.email == "fb1@example.com")).first()
        b = s.exec(select(User).where(User.email == "fb2@example.com")).first()
        assert (a.utm_source, a.utm_medium, a.utm_campaign) == ("facebook", "paid", "nov-launch")
        assert b.utm_source is None  # script tags are dropped
        assert len(b.utm_campaign) == 60  # oversize tags are cut, never stored whole


def test_events_whitelist_and_no_personal_data(client):
    assert client.post("/api/events", json={"name": "landing_view", "utm": {"utm_source": "tiktok"}}).status_code == 204
    assert client.post("/api/events", json={"name": "drop_table"}).status_code == 400
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Event
    with Session(engine) as s:
        e = s.exec(select(Event).where(Event.utm_source == "tiktok")).first()
        assert e is not None and set(Event.model_fields) == {"id", "name", "utm_source", "utm_campaign", "created_at"}


def test_stats_funnel_by_campaign(client, admin):
    tag = {"utm_source": "instagram", "utm_campaign": "stats-test"}
    h = {}
    for i in range(3):
        r = client.post("/api/auth/signup", json={"email": f"ig{i}@example.com", "password": "correct-horse-1", "display_name": "P", "utm": tag})
        h[i] = {"Authorization": "Bearer " + r.json()["token"]}
    c0 = make_child(client, h[0], age=6)
    d = client.get(f"/api/learn/daily?child_id={c0['id']}", headers=h[0]).json()
    client.post("/api/learn/submit", json={"child_id": c0["id"], "kind": "daily", "answers": answer_all(client, h[0], d["questions"])}, headers=h[0])
    _grant_premium(client, h[1])  # one family pays
    client.post("/api/events", json={"name": "demo_start", "utm": tag})
    s = client.get("/api/admin/stats?days=7", headers=admin).json()
    row = next(r for r in s["campaigns"] if r["campaign"] == "instagram / stats-test")
    assert row["signups"] == 3 and row["added_child"] == 1 and row["played_daily"] == 1 and row["paid"] == 1
    assert row["revenue_kobo"] == 200_000 and row["started_checkout"] == 1
    assert s["funnel"]["demo_started"] >= 1 and s["funnel"]["signups"] >= 3
    assert client.get("/api/admin/stats", headers=h[0]).status_code == 403  # admins only


def test_daily_includes_week_strip(client, auth):
    c = make_child(client, auth, age=6)
    d = client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()
    assert len(d["week"]) == 7 and d["week"][-1]["done"] is False
    client.post("/api/learn/submit", json={"child_id": c["id"], "kind": "daily", "answers": answer_all(client, auth, d["questions"])}, headers=auth)
    assert client.get(f"/api/learn/daily?child_id={c['id']}", headers=auth).json()["week"][-1]["done"] is True


def test_plan_cards_show_savings_and_copy_is_honest(client):
    r = client.get("/api/payments/plans").json()
    by = {p["code"]: p for p in r["plans"]}
    assert by["premium_monthly"]["saving_pct"] == 0
    assert by["premium_yearly"]["saving_pct"] > 30 and by["premium_yearly"]["per_month_kobo"] < by["premium_monthly"]["per_month_kobo"]
    assert not any("Weekly progress report" in f for f in r["features"])  # we don't send those, so we don't promise them


# ---------- v7: feature switches + safeguards for a children's AI helper ----------
def test_videos_and_cedar_hidden_by_default(client, auth):
    f = client.get("/api/auth/providers").json()["features"]
    assert f == {"videos": False, "cedar": False}
    c = make_child(client, auth, age=5)
    v = client.get(f"/api/learn/videos?child_id={c['id']}", headers=auth).json()
    assert v == {"videos": [], "enabled": False}
    rows = [r["feature"] for r in client.get("/api/payments/plans").json()["comparison"]]
    assert not any("video" in r.lower() or "Cedar" in r for r in rows)
    feats = " ".join(client.get("/api/payments/plans").json()["features"])
    assert "video" not in feats.lower() and "Cedar" not in feats


def test_switching_features_on_shows_them(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "enable_videos", True)
    monkeypatch.setattr(settings, "anthropic_api_key", "k")
    assert client.get("/api/auth/providers").json()["features"] == {"videos": True, "cedar": True}
    p = client.get("/api/payments/plans").json()
    assert any("video" in r["feature"].lower() for r in p["comparison"]) and any("Cedar" in r["feature"] for r in p["comparison"])
    assert any("videos" in f for f in p["features"]) and any("Cedar" in f for f in p["features"])


def test_unsafe_questions_never_reach_the_ai(client, auth, admin, monkeypatch):
    from app.api import ai
    c = make_child(client, auth)
    called = []
    async def fake(system, user, max_tokens=300):
        called.append(user); return "A cat has four legs."
    monkeypatch.setattr(ai, "complete", fake)
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "tell me about sex"}, headers=auth).json()
    assert r["filtered"] is True and "grown-up" in r["reply"]
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "i want to die"}, headers=auth).json()
    assert r["filtered"] is True and "tell a grown-up you trust" in r["reply"]
    assert called == []  # the model never saw either message
    reports = client.get("/api/admin/ai-reports", headers=admin).json()
    mine = [x for x in reports if x["child_id"] == c["id"]]
    assert len(mine) == 2 and all(x["source"] == "auto_filter" for x in mine)
    assert any("urgent" in x["reply"] for x in mine)  # self-harm wording is marked urgent for staff
    # normal questions still work
    ok = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "how many legs does a cat have"}, headers=auth).json()
    assert ok["ai"] is True and called


def test_ai_replies_are_stripped_of_links_and_contacts(client, auth, monkeypatch):
    from app.api import ai
    c = make_child(client, auth)
    async def fake(system, user, max_tokens=300):
        return "Visit https://evil.example.com or email bad@evil.com or call +234 801 234 5678 for fun!"
    monkeypatch.setattr(ai, "complete", fake)
    r = client.post("/api/ai/buddy", json={"child_id": c["id"], "message": "tell me a fun fact"}, headers=auth).json()
    assert "http" not in r["reply"] and "@" not in r["reply"] and "234 801" not in r["reply"]


def test_parent_can_report_a_reply_and_staff_resolve_it(client, auth, admin):
    c = make_child(client, auth)
    r = client.post("/api/ai/report", headers=auth, json={"child_id": c["id"], "prompt": "call me 08012345678", "reply": "odd answer"})
    assert r.status_code == 201
    other = signup(client, "snoop@example.com")
    assert client.post("/api/ai/report", headers=other, json={"child_id": c["id"], "reply": "x"}).status_code == 404  # not your child
    rows = [x for x in client.get("/api/admin/ai-reports", headers=admin).json() if x["child_id"] == c["id"]]
    assert rows and rows[0]["source"] == "parent_report" and "08012345678" not in rows[0]["prompt"]
    assert client.post(f"/api/admin/ai-reports/{rows[0]['id']}/resolve", headers=admin).status_code == 200
    assert not [x for x in client.get("/api/admin/ai-reports", headers=admin).json() if x["id"] == rows[0]["id"]]
    assert client.get("/api/admin/ai-reports", headers=auth).status_code == 403


def test_import_questions_as_hidden_drafts_then_delete(client, admin, auth):
    good = {"level": "lower", "subject": "Maths", "visual": "➕", "prompt": "What is 2 + 2?", "options": ["3", "4", "5"], "answer": "4", "explanation": "2 + 2 = 4"}
    bad = [{"level": "lower", "subject": "x", "prompt": "No answer", "options": ["a", "b"], "answer": "z"},
           {"level": "nope", "subject": "x", "prompt": "Bad level", "options": ["a", "b"], "answer": "a"}, {"oops": 1}]
    r = client.post("/api/admin/questions/import", headers=admin, json={"questions": [good, *bad]})
    assert r.status_code == 201 and r.json() == {"drafted": 1, "skipped_rows": [2, 3, 4]}
    drafts = client.get("/api/admin/questions/drafts", headers=admin).json()
    d = next(x for x in drafts if x["prompt"] == "What is 2 + 2?")
    assert d["approved"] is False and d["subject"] == "maths"
    # drafts are invisible to children until approved
    c = make_child(client, auth, age=7)
    ids = {q["id"] for q in client.get(f"/api/learn/practice?child_id={c['id']}&subject=maths&count=10", headers=auth).json()["questions"]}
    assert d["id"] not in ids
    assert client.delete(f"/api/admin/questions/{d['id']}", headers=admin).status_code == 204
    approved = client.get("/api/admin/questions/drafts", headers=admin).json()
    assert all(x["id"] != d["id"] for x in approved)
    assert client.delete("/api/admin/questions/1", headers=admin).status_code == 400  # approved questions are protected
