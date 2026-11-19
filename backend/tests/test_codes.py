import uuid
from datetime import date, timedelta

import pytest
from tests.conftest import signup
from tests.test_app import admin, make_child, send_webhook  # noqa: F401


def me(client, h):
    return client.get("/api/auth/me", headers=h).json()


def make(client, who, **kw):
    body = {"days": 30, "count": 1, **kw}
    r = client.post("/api/admin/codes", headers=who, json=body)
    assert r.status_code == 201, r.text
    return r.json()["codes"]


@pytest.fixture()
def staffer(client, admin):
    email = f"s{uuid.uuid4().hex[:6]}@example.com"
    h = signup(client, email)
    assert client.post("/api/admin/staff", headers=admin, json={"email": email}).status_code == 201
    return h


def test_only_admin_and_staff_can_make_codes(client, auth, admin, staffer):
    assert client.post("/api/admin/codes", headers=auth, json={"days": 30}).status_code == 403
    assert client.get("/api/admin/codes", headers=auth).status_code == 403
    assert make(client, admin, label="Scholarship")[0]["code"].startswith("CED-")
    assert make(client, staffer)[0]["status"] == "active"
    # staff are limited; only the admin can go bigger
    assert client.post("/api/admin/codes", headers=staffer, json={"days": 400}).status_code == 403
    assert client.post("/api/admin/codes", headers=staffer, json={"days": 30, "count": 51}).status_code == 403
    assert client.post("/api/admin/codes", headers=admin, json={"days": 400, "count": 60}).status_code == 201
    assert client.post("/api/admin/codes", headers=admin, json={"days": 30, "redeem_by": "2001-01-01"}).status_code == 400
    # only the admin manages who is staff
    assert client.post("/api/admin/staff", headers=staffer, json={"email": "x@example.com"}).status_code == 403
    assert client.post("/api/admin/staff", headers=admin, json={"email": "nobody-here@example.com"}).status_code == 404


def test_parent_redeems_code_and_gets_premium(client, auth, admin):
    code = make(client, admin, days=60, label="Gift")[0]["code"]
    assert me(client, auth)["premium"] is False
    r = client.post("/api/premium/redeem", headers=auth, json={"code": code.lower().replace("-", " ")})  # forgiving format
    assert r.status_code == 200 and r.json()["days"] == 60
    assert me(client, auth)["premium"] is True
    assert client.get("/api/payments/status", headers=auth).json()["valid_until"]
    assert client.post("/api/premium/redeem", headers=auth, json={"code": code}).status_code == 400  # once per family


def test_codes_stack_with_payment_and_each_other(client, auth, admin):
    from datetime import datetime
    a, b = make(client, admin, days=30)[0]["code"], make(client, admin, days=30)[0]["code"]
    client.post("/api/premium/redeem", headers=auth, json={"code": a})
    first = datetime.fromisoformat(client.post("/api/premium/redeem", headers=auth, json={"code": b}).json()["premium_until"])
    # two 30-day codes = ~60 days, not 30 (nothing is wasted)
    assert 58 <= (first.replace(tzinfo=None) - datetime.utcnow()).days <= 60


def test_code_limits_expiry_revoke_and_single_message(client, admin):
    # max_uses
    code = make(client, admin, max_uses=2)[0]["code"]
    outs = []
    for _ in range(3):
        h = signup(client, f"u{uuid.uuid4().hex[:6]}@example.com")
        outs.append(client.post("/api/premium/redeem", headers=h, json={"code": code}).status_code)
    assert outs == [200, 200, 400]
    # revoked
    c = make(client, admin)[0]
    assert client.post(f"/api/admin/codes/{c['id']}/revoke", headers=admin).json()["status"] == "revoked"
    h = signup(client, f"u{uuid.uuid4().hex[:6]}@example.com")
    bad = client.post("/api/premium/redeem", headers=h, json={"code": c["code"]})
    # expired
    from sqlmodel import Session
    from app.database import engine
    from app.models import PremiumCode
    exp = make(client, admin)[0]
    with Session(engine) as s:
        row = s.get(PremiumCode, exp["id"]); row.redeem_by = date.today() - timedelta(days=1); s.add(row); s.commit()
    gone = client.post("/api/premium/redeem", headers=h, json={"code": exp["code"]})
    wrong = client.post("/api/premium/redeem", headers=h, json={"code": "CED-ZZZZ-ZZZZ"})
    # revoked, expired and made-up codes all give the SAME answer, so nobody can probe for real codes
    assert bad.status_code == gone.status_code == wrong.status_code == 400 and bad.json() == gone.json() == wrong.json()


def test_staff_only_see_their_own_codes(client, admin, staffer):
    mine = make(client, staffer, label="Mine")[0]["code"]
    other = make(client, admin, label="Admins")[0]["code"]
    seen = {c["code"] for c in client.get("/api/admin/codes", headers=staffer).json()["codes"]}
    assert mine in seen and other not in seen
    everything = {c["code"] for c in client.get("/api/admin/codes", headers=admin).json()["codes"]}
    assert {mine, other} <= everything
    oc = next(c for c in client.get("/api/admin/codes", headers=admin).json()["codes"] if c["code"] == other)
    assert client.post(f"/api/admin/codes/{oc['id']}/revoke", headers=staffer).status_code == 404


def test_removing_staff_removes_access(client, admin, staffer):
    uid = me(client, staffer)["id"]
    assert client.get("/api/admin/staff", headers=admin).json()["staff"]
    client.delete(f"/api/admin/staff/{uid}", headers=admin)
    assert client.post("/api/admin/codes", headers=staffer, json={"days": 30}).status_code == 403


def test_redeem_is_rate_limited(client, auth):
    codes = [client.post("/api/premium/redeem", headers=auth, json={"code": f"CED-AAAA-{i:04d}".replace("0", "B")}).status_code for i in range(12)]
    assert 429 in codes  # guessing is throttled


# ---------- seeding and avatars ----------
def test_seed_tops_up_existing_database_without_touching_edits(client):
    from sqlmodel import Session, select
    from app.database import engine
    from app.models import Question
    from app.seed import seed_if_empty
    with Session(engine) as s:
        total = len(s.exec(select(Question)).all())
        assert total >= 780  # expanded starter bank
        q = s.exec(select(Question).where(Question.level == "tiny")).first()
        q.explanation = "EDITED BY A TEACHER"; s.add(q)
        gone = s.exec(select(Question).where(Question.level == "upper")).first(); gid = gone.id; s.delete(gone); s.commit()
        seed_if_empty(s)  # a restart / new release
        s2 = len(s.exec(select(Question)).all())
        assert s2 == total  # the deleted starter question came back, nothing was duplicated
        assert s.get(Question, q.id).explanation == "EDITED BY A TEACHER"


def test_avatars_are_earned_with_stars(client, auth):
    c = make_child(client, auth, age=6)
    r = client.patch(f"/api/children/{c['id']}/avatar", headers=auth, json={"avatar": "🦖"})
    assert r.status_code == 403 and "40 stars" in r.json()["detail"]
    from sqlmodel import Session
    from app.database import engine
    from app.models import Child
    with Session(engine) as s:
        ch = s.get(Child, c["id"]); ch.stars = 45; s.add(ch); s.commit()
    assert client.patch(f"/api/children/{c['id']}/avatar", headers=auth, json={"avatar": "🦖"}).json()["avatar"] == "🦖"
    assert client.patch(f"/api/children/{c['id']}/avatar", headers=auth, json={"avatar": "💩"}).status_code == 400
    assert client.post("/api/children", json={"name": "New", "age": 5, "avatar": "🚀"}, headers=signup(client, f"a{uuid.uuid4().hex[:6]}@example.com")).json()["avatar"] == "🦁"
