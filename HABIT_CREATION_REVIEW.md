# Habit Creation & Draft Saving - Flow Review & Issues

## Overview
This document reviews the complete flow of creating a new habit or saving it as a draft, from backend to frontend, and identifies the issues preventing it from working.

---

## Flow Walkthrough

### 1. Frontend: User Initiates Creation
**File:** `Frontend/app/screens/dashboard/createHabit.tsx`

- User fills out the habit form (name, type, description, frequency, partner, goal)
- Two actions available:
  - **CREATE**: Creates an active habit (requires partner)
  - **SAVE**: Saves as draft (no partner required)

### 2. Frontend: Save as Draft Flow
**Function:** `handleSave()` (lines 274-355)

**Steps:**
1. Validates habit name is present
2. Gets auth token from AsyncStorage
3. Prepares draft data:
   ```typescript
   {
     habit_name: string,
     habit_type: 'build' | 'break',
     category: 'productivity',
     description?: string,
     frequency: 'daily' | 'weekly' | 'monthly'
   }
   ```
4. Determines if updating existing draft or creating new:
   - If `isEditingDraft && draftId` → PUT to `/api/habits/drafts/{draftId}`
   - Otherwise → POST to `/api/habits/drafts`
5. Sends request with Bearer token

### 3. Backend: Draft Creation Endpoint
**File:** `Backend/app/routes/habits.py`  
**Route:** `POST /api/habits/drafts` (lines 392-409)

**Steps:**
1. Receives `HabitCreate` model (extends `HabitBase`)
2. Uses `get_current_user` dependency to get authenticated user
3. Converts to dict: `habit_data.model_dump(exclude_none=True)`
4. Sets additional fields:
   - `created_by = current_user.id`
   - `status = "draft"`
   - `partnership_id = None`
   - `created_at` and `updated_at` timestamps
5. Inserts into MongoDB `habits` collection
6. Returns formatted `HabitResponse`

### 4. Backend: Draft Update Endpoint
**Route:** `PUT /api/habits/drafts/{draft_id}` (lines 454-489)

**Steps:**
1. Validates draft_id format
2. Finds existing draft (must belong to current user, status = "draft")
3. Updates with new data from `HabitUpdate` model
4. Returns updated draft

### 5. Frontend: Create Active Habit Flow
**Function:** `handleCreate()` (lines 133-272)

**Steps:**
1. Validates habit name and partner selection
2. Fetches all partnerships to find partnership_id for selected partner
3. Creates habit data with `partnership_id`
4. POSTs to `/api/habits` (not `/drafts`)
5. If created from draft, deletes the draft after successful creation

### 6. Backend: Active Habit Creation
**Route:** `POST /api/habits` (lines 67-124)

**Steps:**
1. Validates `partnership_id` is provided (required for active habits)
2. Verifies partnership exists and user is part of it
3. Creates habit with `status = "pending_approval"`
4. Partner must approve before habit becomes active

---

## Issues Identified

### 🐛 Issue #1: Missing `frequency` Field in HabitBase Model
**Location:** `Backend/app/models/habit.py`

**Problem:**
- `HabitBase` (lines 40-59) does NOT have a `frequency` field
- `HabitCreate` extends `HabitBase`, so it also lacks `frequency`
- Frontend sends `frequency: 'daily' | 'weekly' | 'monthly'` in draft data
- Backend will either:
  - Ignore the `frequency` field (if using `exclude_none=True` with extra fields)
  - Or raise a validation error if Pydantic strict mode is enabled

**Evidence:**
- `HabitBase` has: `habit_name`, `habit_type`, `category`, `description`, `streak`, `goals`
- `HabitUpdate` (line 71) HAS `frequency: Optional[HabitFrequency]`
- `HabitResponse` (line 106) expects `frequency: str`
- Frontend sends `frequency` in both create and draft requests

**Impact:** 
- Frequency data is lost when creating drafts
- Frequency may not be saved to database
- Response may have incorrect/null frequency values

---

### 🐛 Issue #2: Incorrect User ID Access in Draft Routes
**Location:** `Backend/app/routes/habits.py` (lines 400, 419, 441, 470, 507)

**Problem:**
- Draft routes import `get_current_user` from `app.routes.auth` (line 18)
- This function returns a `UserResponse` Pydantic model (has `.id` attribute)
- Type hint says `current_user: dict` which is incorrect
- Code uses `current_user.id` which works BUT:
  - Type hint is misleading
  - Should use `get_current_user` from `app.dependencies.auth` for consistency
  - OR fix type hint to `UserResponse`

**Current Code:**
```python
from app.routes.auth import get_current_user  # Returns UserResponse

@router.post("/drafts")
async def create_habit_draft(
    habit_data: HabitCreate,
    current_user: dict = Depends(get_current_user),  # ❌ Wrong type hint
    ...
):
    habit_dict["created_by"] = current_user.id  # ✅ Works but type hint is wrong
```

**Better Approach:**
```python
from app.dependencies.auth import get_current_user  # Returns dict

@router.post("/drafts")
async def create_habit_draft(
    habit_data: HabitCreate,
    current_user: dict = Depends(get_current_user),  # ✅ Correct
    ...
):
    habit_dict["created_by"] = str(current_user["_id"])  # ✅ Correct for dict
```

**OR:**
```python
from app.routes.auth import get_current_user  # Returns UserResponse
from app.models.user import UserResponse

@router.post("/drafts")
async def create_habit_draft(
    habit_data: HabitCreate,
    current_user: UserResponse = Depends(get_current_user),  # ✅ Correct type
    ...
):
    habit_dict["created_by"] = current_user.id  # ✅ Correct
```

**Impact:**
- Currently works but is confusing and inconsistent
- May break if import changes
- Type checking tools will show errors

---

### 🐛 Issue #3: Frequency Enum Mismatch
**Location:** `Backend/app/models/habit.py` (line 30)

**Problem:**
- `HabitFrequency` enum has: `DAILY`, `WEEKLY`, `MONTH` (not `MONTHLY`)
- Frontend sends: `'daily' | 'weekly' | 'monthly'`
- Backend expects: `'daily' | 'weekly' | 'month'`

**Impact:**
- If `frequency` field is added to `HabitBase`, validation will fail for "monthly"
- Frontend and backend are out of sync

---

### 🐛 Issue #4: Missing Frequency in Database Schema
**Location:** Backend habit model

**Problem:**
- Even if `frequency` is added to `HabitBase`, the database document may not store it
- `format_habit_response` (line 53) tries to get `frequency` from habit dict:
  ```python
  frequency=habit.get("frequency", "daily"),
  ```
- But if `frequency` isn't in `HabitBase`, it won't be saved to DB
- Response will always default to "daily"

---

## Summary of Root Causes

1. **Primary Issue:** `frequency` field is missing from `HabitBase`/`HabitCreate` models
2. **Secondary Issue:** Type inconsistency in `get_current_user` usage
3. **Tertiary Issue:** Enum value mismatch (`month` vs `monthly`)

---

## Recommended Fixes

### Fix #1: Add `frequency` to HabitBase
```python
class HabitBase(BaseModel):
    habit_name: str = Field(..., min_length=1, max_length=100)
    habit_type: HabitType
    category: HabitCategory
    description: Optional[str] = None
    frequency: HabitFrequency = Field(default=HabitFrequency.DAILY)  # ✅ ADD THIS
    streak: int = Field(default=0)
    goals: Dict[str, UserGoal] = Field(default_factory=dict)
```

### Fix #2: Fix Frequency Enum
```python
class HabitFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"  # ✅ Change from "month" to "monthly"
```

### Fix #3: Fix get_current_user Import/Usage
```python
# Option A: Use dependencies version (returns dict)
from app.dependencies.auth import get_current_user

@router.post("/drafts")
async def create_habit_draft(
    habit_data: HabitCreate,
    current_user: dict = Depends(get_current_user),
    ...
):
    habit_dict["created_by"] = str(current_user["_id"])

# Option B: Use routes version with correct type hint
from app.routes.auth import get_current_user
from app.models.user import UserResponse

@router.post("/drafts")
async def create_habit_draft(
    habit_data: HabitCreate,
    current_user: UserResponse = Depends(get_current_user),
    ...
):
    habit_dict["created_by"] = current_user.id
```

---

## Testing Checklist

After fixes, verify:
- [ ] Draft creation saves `frequency` correctly
- [ ] Draft update preserves `frequency`
- [ ] Active habit creation includes `frequency`
- [ ] Response includes correct `frequency` value
- [ ] Frontend "monthly" value is accepted by backend
- [ ] Type hints are correct and consistent

