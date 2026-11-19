import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SECRET_KEY"] = "test-secret-key-test-secret-key-123"
os.environ["PAYSTACK_SECRET_KEY"] = "sk_test_dummy"
os.environ["ADMIN_EMAILS"] = "boss@example.com,gboss@example.com"
os.environ["TEACHER_EMAILS"] = "autoteach@example.com"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["RATE_LIMIT_PER_MINUTE"] = "1000"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import deps


@pytest.fixture()
def client():
    deps._buckets.clear()
    with TestClient(app) as c:
        yield c


def signup(client, email="mum@example.com", name="Mum"):
    r = client.post("/api/auth/signup", json={"email": email, "password": "correct-horse-1", "display_name": name})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture()
def auth(client):
    import uuid
    return signup(client, f"{uuid.uuid4().hex[:8]}@example.com")
