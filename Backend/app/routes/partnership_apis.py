from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.partnership_model import (
    PartnershipCreate,
    PartnershipStatus,
    PartnershipDetailResponse,
    PartnershipStatsResponse,
    PartnershipHistoryItem,
    PartnerInfo,
    HabitSummary,
    HabitStatsDetail,
    StreakHistoryDetail,
    PartnerRequestResponse,
    PartnerRequestDB,
)

from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/partnerships", tags=["Partnerships"])
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user ID from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload.get("sub")

#Retrieve user's current partnership details
@router.get("/current", response_model=PartnershipDetailResponse)
async def get_current_partnership(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    GET: Retrieve user's current partnership details
    
    Returns the user's single active partnership with full details including:
    - Partner information
    - Partnership age and status
    - Current and longest streaks
    - Associated active habits
    
    Returns:
        Current active partnership with habits and statistics
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find active partnership
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ],
        "status": PartnershipStatus.ACTIVE.value
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active partnership found"
        )

    # Get partner info
    partner_id = (
        partnership["user_id_2"] 
        if partnership["user_id_1"] == ObjectId(user_id) 
        else partnership["user_id_1"]
    )
    partner = await db.users.find_one({"_id": partner_id})

    # Get associated habits
    habits = await db.habits.find({
        "partnership_id": partnership["_id"],
        "is_active": True
    }).to_list(100)

    # Calculate partnership age
    partnership_age_days = (datetime.utcnow() - partnership["created_at"]).days

    # Get current streak from habits (minimum of both partners' streaks)
    current_streak = 0
    longest_streak = 0
    if habits:
        # For now, use the first habit's streak
        # TODO: Implement proper streak calculation across both partners
        current_streak = habits[0].get("current_streak", 0)
        longest_streak = habits[0].get("longest_streak", 0)

    return PartnershipDetailResponse(
        id=str(partnership["_id"]),
        partner=PartnerInfo(
            username=partner["username"],
            email=partner["email"],
            profile_picture=partner.get("profile_picture")
        ),
        status=partnership["status"],
        partnership_age_days=partnership_age_days,
        current_streak=current_streak,
        longest_streak=longest_streak,
        created_at=partnership["created_at"],
        habits=[
            HabitSummary(
                id=str(h["_id"]),
                name=h["habit_name"],
                type=h.get("habit_type"),
                frequency=h.get("frequency"),
                current_streak=h.get("current_streak", 0)
            )
            for h in habits
        ]
    )


@router.post("/invites", response_model=PartnerRequestResponse, status_code=status.HTTP_201_CREATED)
async def send_partnership_invite(
    partnership: PartnershipCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    POST: Send a partnership invite instead of instantly creating a partnership.

    Flow:
    - Current user (sender) looks up partner by username
    - Validates that neither user already has an active partnership
    - Ensures there is no existing pending request between the two users
    - Creates a `partner_requests` document with status `pending`
    """
    db = get_database()
    sender_id = await get_current_user_id(credentials)

    # Find the partner by username
    partner = await db.users.find_one({"username": partnership.partner_username})
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    receiver_id = str(partner["_id"])

    # Cannot invite yourself
    if sender_id == receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot partner with yourself",
        )

    # Check if either user already has an ACTIVE partnership
    for user in (sender_id, receiver_id):
        active_count = await db.partnerships.count_documents(
            {
                "$or": [
                    {"user_id_1": ObjectId(user)},
                    {"user_id_2": ObjectId(user)},
                ],
                "status": PartnershipStatus.ACTIVE.value,
            }
        )
        if active_count > 0:
            if user == sender_id:
                msg = "You already have an active partnership"
            else:
                msg = "Partner already has an active partnership"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )

    # Check if there is already a pending request between these two users
    existing_request = await db.partner_requests.find_one(
        {
            "$or": [
                {"sender_id": ObjectId(sender_id), "receiver_id": ObjectId(receiver_id)},
                {"sender_id": ObjectId(receiver_id), "receiver_id": ObjectId(sender_id)},
            ],
            "status": "pending",
        }
    )
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="There is already a pending partnership request between these users",
        )

    invite = PartnerRequestDB(
        sender_id=ObjectId(sender_id),
        receiver_id=ObjectId(receiver_id),
        status="pending",
        message=partnership.message,
    )
    # Insert into DB
    result = await db.partner_requests.insert_one(invite.model_dump(by_alias=True))

    # Fetch sender info once for response
    sender = await db.users.find_one({"_id": ObjectId(sender_id)})

    return PartnerRequestResponse(
        id=str(result.inserted_id),
        sender_username=sender["username"],
        sender_email=sender["email"],
        message=invite.message,
        sent_at=invite.sent_at,
        status=invite.status,
    )


@router.get("/invites", response_model=List[PartnerRequestResponse])
async def list_partnership_invites(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    GET: View partnership invites for the current user.

    Returns all **incoming** pending partner requests where the current user is the receiver.
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    invites = await db.partner_requests.find(
        {"receiver_id": ObjectId(user_id), "status": "pending"}
    ).sort("sent_at", -1).to_list(100)

    sender_ids = list({inv["sender_id"] for inv in invites})
    users = await db.users.find({"_id": {"$in": sender_ids}}).to_list(len(sender_ids))
    user_map = {u["_id"]: u for u in users}

    results: List[PartnerRequestResponse] = []
    for inv in invites:
        sender = user_map.get(inv["sender_id"])
        if not sender:
            # If sender was deleted, skip this invite
            continue
        results.append(
            PartnerRequestResponse(
                id=str(inv["_id"]),
                sender_username=sender["username"],
                sender_email=sender["email"],
                message=inv.get("message"),
                sent_at=inv.get("sent_at", datetime.utcnow()),
                status=inv.get("status", "pending"),
            )
        )

    return results


@router.post("/invites/{request_id}/accept")
async def accept_partnership_invite(
    request_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    POST: Accept a partnership invite.

    - Only the receiver of the invite can accept it
    - Marks the invite as `accepted`
    - Creates an ACTIVE partnership between the two users
    - Validates that neither user already has an active partnership
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    if not ObjectId.is_valid(request_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite ID format",
        )

    invite = await db.partner_requests.find_one({"_id": ObjectId(request_id)})
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    if invite["receiver_id"] != ObjectId(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to accept this invite",
        )

    if invite["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept an invite with status '{invite['status']}'",
        )

    sender_id = str(invite["sender_id"])
    receiver_id = str(invite["receiver_id"])

    # Ensure neither user has an active partnership at the moment of acceptance
    for uid in (sender_id, receiver_id):
        active_count = await db.partnerships.count_documents(
            {
                "$or": [
                    {"user_id_1": ObjectId(uid)},
                    {"user_id_2": ObjectId(uid)},
                ],
                "status": PartnershipStatus.ACTIVE.value,
            }
        )
        if active_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either you or your partner already has an active partnership",
            )

    # Create partnership (sender is user_id_1, receiver is user_id_2)
    partnership_doc = {
        "user_id_1": invite["sender_id"],
        "user_id_2": invite["receiver_id"],
        "status": PartnershipStatus.ACTIVE.value,
        "created_at": datetime.utcnow(),
    }
    partnership_result = await db.partnerships.insert_one(partnership_doc)

    # Update invite status
    await db.partner_requests.update_one(
        {"_id": invite["_id"]},
        {
            "$set": {
                "status": "accepted",
                "responded_at": datetime.utcnow(),
            }
        },
    )

    return {
        "success": True,
        "message": "Partnership invite accepted",
        "partnership_id": str(partnership_result.inserted_id),
    }


@router.post("/invites/{request_id}/reject")
async def reject_partnership_invite(
    request_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    POST: Reject a partnership invite.

    - Only the receiver of the invite can reject it
    - Marks the invite as `rejected`
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    if not ObjectId.is_valid(request_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite ID format",
        )

    invite = await db.partner_requests.find_one({"_id": ObjectId(request_id)})
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found",
        )

    if invite["receiver_id"] != ObjectId(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to reject this invite",
        )

    if invite["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject an invite with status '{invite['status']}'",
        )

    await db.partner_requests.update_one(
        {"_id": invite["_id"]},
        {
            "$set": {
                "status": "rejected",
                "responded_at": datetime.utcnow(),
            }
        },
    )

    return {
        "success": True,
        "message": "Partnership invite rejected",
    }

#Update partnership status (activate, pause, end)
@router.put("/{partnership_id}/status")
async def update_partnership_status(
        partnership_id: str,
        new_status: str = Query(..., description="New status: active, paused, broken"),
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    PUT: Update partnership status (activate, pause, end)
    
    Updates the status of a partnership. Supports:
    - active → paused: Temporarily pause the partnership
    - paused → active: Resume a paused partnership
    - active/paused → broken: End the partnership permanently
    
    When ending (broken), automatically:
    - Saves current streaks to history
    - Deactivates all associated habits
    
    Args:
        partnership_id: ID of the partnership
        new_status: New status (active, paused, broken)
        credentials: JWT Bearer token
        
    Returns:
        Success message with updated partnership info
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Validate ObjectId format
    if not ObjectId.is_valid(partnership_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid partnership ID format"
        )

    # Validate status
    valid_statuses = ["active", "paused", "broken"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Find partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    current_status = partnership["status"]

    # Validate status transitions
    if current_status == "broken":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a broken partnership"
        )

    if current_status == new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Partnership is already {new_status}"
        )

    # Handle status-specific logic
    update_data = {"status": new_status}

    if new_status == "paused":
        update_data["paused_at"] = datetime.utcnow()
    elif new_status == "active" and current_status == "paused":
        update_data["resumed_at"] = datetime.utcnow()
    elif new_status == "broken":
        # When ending partnership, save streak to history
        habits = await db.habits.find({
            "partnership_id": partnership["_id"],
            "is_active": True
        }).to_list(100)

        for habit in habits:
            # Create streak history record
            if habit.get("current_streak", 0) > 0:
                await db.streak_history.insert_one({
                    "partnership_id": partnership["_id"],
                    "habit_id": habit["_id"],
                    "streak_start_date": habit.get("created_at", partnership["created_at"]),
                    "streak_end_date": datetime.utcnow(),
                    "streak_length_days": habit.get("current_streak", 0),
                    "ended_reason": "partnership_ended",
                    "created_at": datetime.utcnow()
                })

            # Mark habit as inactive
            await db.habits.update_one(
                {"_id": habit["_id"]},
                {"$set": {"is_active": False}}
            )

        update_data["ended_at"] = datetime.utcnow()

    # Update partnership status
    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {"$set": update_data}
    )

    return {
        "success": True,
        "message": f"Partnership status updated to {new_status}",
        "partnership_id": partnership_id,
        "new_status": new_status
    }

#Retrieve partnership stats
@router.get("/{partnership_id}/stats", response_model=PartnershipStatsResponse)
async def get_partnership_stats(
        partnership_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    GET: Retrieve partnership statistics
    
    Returns detailed statistics for a specific partnership including:
    - Total check-ins across all habits
    - Milestones achieved
    - Per-habit breakdown (current/longest streaks, check-ins)
    - Historical streak records
    
    Args:
        partnership_id: ID of the partnership
        credentials: JWT Bearer token
        
    Returns:
        Detailed partnership statistics
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Validate ObjectId format
    if not ObjectId.is_valid(partnership_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid partnership ID format"
        )

    # Find partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    # Get habits
    habits = await db.habits.find({
        "partnership_id": partnership["_id"]
    }).to_list(100)

    # Calculate statistics
    total_checkins = 0
    habits_data = []
    
    for habit in habits:
        # Count check-ins for this habit
        checkin_count = await db.habit_logs.count_documents({
            "habit_id": habit["_id"],
            "completed": True
        })
        total_checkins += checkin_count

        habits_data.append(HabitStatsDetail(
            habit_name=habit["habit_name"],
            current_streak=habit.get("current_streak", 0),
            longest_streak=habit.get("longest_streak", 0),
            total_checkins=checkin_count,
            is_active=habit.get("is_active", False)
        ))

    # Get streak history
    streak_history = await db.streak_history.find({
        "partnership_id": partnership["_id"]
    }).to_list(100)

    # Calculate partnership age
    partnership_age_days = (datetime.utcnow() - partnership["created_at"]).days

    # Get milestones achieved
    milestones_achieved = 0
    for habit in habits:
        milestone_count = await db.milestones.count_documents({
            "habit_id": habit["_id"],
            "is_achieved": True
        })
        milestones_achieved += milestone_count

    return PartnershipStatsResponse(
        partnership_id=str(partnership["_id"]),
        status=partnership["status"],
        partnership_age_days=partnership_age_days,
        created_at=partnership["created_at"],
        total_checkins=total_checkins,
        milestones_achieved=milestones_achieved,
        habits=habits_data,
        streak_history=[
            StreakHistoryDetail(
                habit_id=str(sh["habit_id"]),
                streak_length_days=sh["streak_length_days"],
                start_date=sh["streak_start_date"],
                end_date=sh.get("streak_end_date"),
                ended_reason=sh.get("ended_reason")
            )
            for sh in streak_history
        ]
    )

#Retrieve partnership history
@router.get("/history", response_model=List[PartnershipHistoryItem])
async def get_partnership_history(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    GET: Retrieve partnership history
    
    Returns all partnerships (past and present) for the current user.
    Includes basic information about each partnership:
    - Partner username
    - Status (active, paused, broken, completed)
    - Duration
    - Number of habits
    
    Returns:
        List of all partnerships sorted by creation date (newest first)
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Get all partnerships
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    }).sort("created_at", -1).to_list(100)

    result = []
    for partnership in partnerships:
        # Get partner info
        partner_id = (
            partnership["user_id_2"] 
            if partnership["user_id_1"] == ObjectId(user_id) 
            else partnership["user_id_1"]
        )
        partner = await db.users.find_one({"_id": partner_id})

        if partner:
            # Get habits count
            habits_count = await db.habits.count_documents({
                "partnership_id": partnership["_id"]
            })

            # Calculate duration
            end_date = partnership.get("ended_at", datetime.utcnow())
            duration_days = (end_date - partnership["created_at"]).days

            result.append(PartnershipHistoryItem(
                id=str(partnership["_id"]),
                partner_username=partner["username"],
                status=partnership["status"],
                created_at=partnership["created_at"],
                ended_at=partnership.get("ended_at"),
                duration_days=duration_days,
                habits_count=habits_count
            ))

    return result

#End partnership (soft delete by changing status)
@router.delete("/{partnership_id}")
async def end_partnership(
        partnership_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    DELETE: End partnership (soft delete by changing status)
    
    Ends an active or paused partnership by changing its status to "broken".
    This is a soft delete - the partnership data is preserved for history.
    
    Automatically:
    - Saves all current streaks to streak_history
    - Deactivates all associated habits
    - Records the end timestamp
    
    Args:
        partnership_id: ID of the partnership to end
        credentials: JWT Bearer token
        
    Returns:
        Success message with partnership summary (duration, saved streaks, habits deactivated)
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Validate ObjectId format
    if not ObjectId.is_valid(partnership_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid partnership ID format"
        )

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    if partnership["status"] == "broken":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership is already ended"
        )

    # Get habits to save streak history
    habits = await db.habits.find({
        "partnership_id": partnership["_id"],
        "is_active": True
    }).to_list(100)

    saved_streaks = []
    for habit in habits:
        # Save current streak to history
        if habit.get("current_streak", 0) > 0:
            streak_record = {
                "partnership_id": partnership["_id"],
                "habit_id": habit["_id"],
                "streak_start_date": habit.get("created_at", partnership["created_at"]),
                "streak_end_date": datetime.utcnow(),
                "streak_length_days": habit.get("current_streak", 0),
                "ended_reason": "partnership_ended",
                "created_at": datetime.utcnow()
            }
            await db.streak_history.insert_one(streak_record)
            saved_streaks.append({
                "habit_name": habit["habit_name"],
                "streak_length": habit.get("current_streak", 0)
            })

        # Mark habit as inactive
        await db.habits.update_one(
            {"_id": habit["_id"]},
            {"$set": {"is_active": False}}
        )

    # Update partnership status to broken
    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {
            "$set": {
                "status": PartnershipStatus.BROKEN.value,
                "ended_at": datetime.utcnow()
            }
        }
    )

    # Calculate partnership duration
    duration_days = (datetime.utcnow() - partnership["created_at"]).days

    return {
        "success": True,
        "message": "Partnership ended",
        "summary": {
            "partnership_id": partnership_id,
            "duration_days": duration_days,
            "saved_streaks": saved_streaks,
            "habits_deactivated": len(habits)
        }
    }