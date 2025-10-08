from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.partnership import (
    PartnershipCreate,
    PartnershipResponse,
    PartnershipStatus,
    PartnerRequest
)
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter(prefix="/partnerships", tags=["Partnerships"])
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload.get("sub")


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def send_partnership_invite(
        invite: PartnershipCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    sender_id = await get_current_user_id(credentials)

    # Find the recipient by username
    recipient = await db.users.find_one({"username": invite.partner_username})

    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    recipient_id = str(recipient["_id"])

    if sender_id == recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot partner with yourself"
        )

    # Check if partnership already exists
    existing_partnership = await db.partnerships.find_one({
        "$or": [
            {"user_id_1": sender_id, "user_id_2": recipient_id},
            {"user_id_1": recipient_id, "user_id_2": sender_id}
        ]
    })

    if existing_partnership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership already exists"
        )

    # Check if invite already sent
    existing_request = await db.partner_requests.find_one({
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "status": "pending"
    })

    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership request already sent"
        )

    # Create partner request
    request_data = {
        "sender_id": sender_id,
        "recipient_id": recipient_id,
        "recipient_username": recipient["username"],
        "recipient_email": recipient["email"],
        "status": "pending",
        "created_at": datetime.utcnow()
    }

    result = await db.partner_requests.insert_one(request_data)

    return {
        "message": "Partnership invite sent",
        "request_id": str(result.inserted_id)
    }


@router.get("/requests", response_model=List[dict])
async def get_partnership_requests(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Get pending requests where user is recipient
    requests = await db.partner_requests.find({
        "recipient_id": user_id,
        "status": "pending"
    }).to_list(100)

    # Get sender info for each request
    result = []
    for req in requests:
        sender = await db.users.find_one({"_id": ObjectId(req["sender_id"])})
        result.append({
            "id": str(req["_id"]),
            "sender_username": sender["username"],
            "sender_email": sender["email"],
            "created_at": req["created_at"]
        })

    return result


@router.post("/requests/{request_id}/accept")
async def accept_partnership_request(
        request_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find the request
    request = await db.partner_requests.find_one({
        "_id": ObjectId(request_id),
        "recipient_id": user_id,
        "status": "pending"
    })

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership request not found"
        )

    # Create partnership
    partnership_data = {
        "user_id_1": request["sender_id"],
        "user_id_2": user_id,
        "status": PartnershipStatus.ACTIVE.value,
        "current_streak": 0,
        "total_points": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.partnerships.insert_one(partnership_data)

    # Update request status
    await db.partner_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "accepted"}}
    )

    return {
        "message": "Partnership created",
        "partnership_id": str(result.inserted_id)
    }


@router.post("/requests/{request_id}/reject")
async def reject_partnership_request(
        request_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find and update the request
    result = await db.partner_requests.update_one(
        {
            "_id": ObjectId(request_id),
            "recipient_id": user_id,
            "status": "pending"
        },
        {"$set": {"status": "rejected"}}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership request not found"
        )

    return {"message": "Partnership request rejected"}


@router.get("/my-partnerships", response_model=List[PartnershipResponse])
async def get_my_partnerships(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find all partnerships where user is involved
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ],
        "status": PartnershipStatus.ACTIVE.value
    }).to_list(100)

    result = []
    for partnership in partnerships:
        # Get partner info
        partner_id = partnership["user_id_2"] if partnership["user_id_1"] == user_id else partnership["user_id_1"]
        partner = await db.users.find_one({"_id": ObjectId(partner_id)})

        result.append(PartnershipResponse(
            id=str(partnership["_id"]),
            partner_username=partner["username"],
            partner_email=partner["email"],
            status=partnership["status"],
            current_streak=partnership["current_streak"],
            total_points=partnership["total_points"],
            created_at=partnership["created_at"]
        ))

    return result


@router.delete("/{partnership_id}")
async def end_partnership(
        partnership_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    # Update status to ended
    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {
            "$set": {
                "status": PartnershipStatus.ENDED.value,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Partnership ended"}