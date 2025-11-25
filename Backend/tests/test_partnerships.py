import pytest
from datetime import datetime
from bson import ObjectId


@pytest.mark.asyncio
async def test_send_invite_creates_pending_request(client, test_db, auth_headers, second_test_user):
    # Current user sends invite to second_test_user
    resp = await client.post(
        "/api/partnerships/invites",
        headers=auth_headers,
        json={"partner_username": second_test_user["username"], "message": "Let's partner"},
    )
    assert resp.status_code == 201
    body = resp.json()

    # Response shape
    assert body["sender_username"] == "testuser"
    assert body["status"] == "pending"

    # Verify in DB
    invites = await test_db.partner_requests.find().to_list(10)
    assert len(invites) == 1
    inv = invites[0]
    assert inv["status"] == "pending"


@pytest.mark.asyncio
async def test_send_invite_rejects_when_existing_pending_between_users(client, test_db, auth_headers, test_user, second_test_user):
    # Seed an existing pending request
    await test_db.partner_requests.insert_one(
        {
            "sender_id": ObjectId(test_user["_id"]),
            "receiver_id": ObjectId(second_test_user["_id"]),
            "status": "pending",
            "sent_at": datetime.utcnow(),
        }
    )

    resp = await client.post(
        "/api/partnerships/invites",
        headers=auth_headers,
        json={"partner_username": second_test_user["username"]},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_invites_returns_incoming_pending(client, test_db, auth_headers, test_user, second_test_user, second_auth_headers):
    # second user sends invite to first user
    await test_db.partner_requests.insert_one(
        {
            "sender_id": ObjectId(second_test_user["_id"]),
            "receiver_id": ObjectId(test_user["_id"]),
            "status": "pending",
            "message": "Hi!",
            "sent_at": datetime.utcnow(),
        }
    )

    resp = await client.get("/api/partnerships/invites", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["sender_username"] == second_test_user["username"]
    assert body[0]["status"] == "pending"


@pytest.mark.asyncio
async def test_accept_invite_creates_partnership_and_updates_status(client, test_db, test_user, second_test_user, auth_headers, second_auth_headers):
    # Create pending invite where second_user invited first_user
    invite = await test_db.partner_requests.insert_one(
        {
            "sender_id": ObjectId(second_test_user["_id"]),
            "receiver_id": ObjectId(test_user["_id"]),
            "status": "pending",
            "sent_at": datetime.utcnow(),
        }
    )

    # First user (receiver) accepts
    resp = await client.post(f"/api/partnerships/invites/{str(invite.inserted_id)}/accept", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    partnership_id = body["partnership_id"]
    assert ObjectId.is_valid(partnership_id)

    # Partnership exists
    partnership = await test_db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    assert partnership is not None
    assert partnership["status"] == "active"

    # Invite updated
    updated_invite = await test_db.partner_requests.find_one({"_id": invite.inserted_id})
    assert updated_invite["status"] == "accepted"
    assert updated_invite["responded_at"] is not None


@pytest.mark.asyncio
async def test_reject_invite_updates_status_only(client, test_db, test_user, second_test_user, auth_headers):
    invite = await test_db.partner_requests.insert_one(
        {
            "sender_id": ObjectId(second_test_user["_id"]),
            "receiver_id": ObjectId(test_user["_id"]),
            "status": "pending",
            "sent_at": datetime.utcnow(),
        }
    )

    resp = await client.post(f"/api/partnerships/invites/{str(invite.inserted_id)}/reject", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True

    updated_invite = await test_db.partner_requests.find_one({"_id": invite.inserted_id})
    assert updated_invite["status"] == "rejected"


