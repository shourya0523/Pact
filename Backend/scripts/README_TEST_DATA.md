# Test Data Population Script

This script creates comprehensive test data including users, partnerships, habits, goals, and check-in history.

## Prerequisites

1. **Install Python dependencies:**
   ```bash
   cd Backend
   pip install -r requirements.txt
   ```

   Or if using a virtual environment:
   ```bash
   cd Backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Make sure you have a `.env` file in the `Backend` directory with:
   ```
   MONGODB_URL=your_mongodb_connection_string
   # OR
   MONGODB_URI=your_mongodb_connection_string
   ```

## Running the Script

From the `Backend` directory:
```bash
python3 scripts/populate_comprehensive_test_data.py
```

## What It Creates

- **5 Test Users** with real names and credentials
- **3 Partnerships** between users
- **12 Habits** (4 habits × 3 partnerships)
- **24 Goals** (2 goals per habit, one for each partner)
- **Check-in History** spanning 8-30 days depending on the habit

## Test User Credentials

After running the script, check `Backend/TEST_USERS_README.md` for all login credentials.

All users have the password: `Test123!`

### Quick Reference:
- **Alex Martinez**: `alex.martinez@test.com`
- **Sarah Johnson**: `sarah.johnson@test.com`
- **Michael Chen**: `michael.chen@test.com`
- **Emily Williams**: `emily.williams@test.com`
- **David Brown**: `david.brown@test.com`

## Troubleshooting

### "ModuleNotFoundError: No module named 'motor'"
- Install dependencies: `pip install -r requirements.txt`
- Or activate your virtual environment first

### "MONGODB_URL not found"
- Check that your `.env` file exists in the `Backend` directory
- Verify it contains `MONGODB_URL` or `MONGODB_URI`

### Script skips creating data
- The script checks for existing data and skips duplicates
- To recreate everything, you may need to clear the database first
- Or modify the script to delete existing test users first

## Notes

- The script is idempotent - safe to run multiple times
- It will skip creating data that already exists
- All test users have completed profiles
- Partnerships are set to "active" status
- Habits have varying streak lengths (8-30 days)
- Goals are frequency-based (1x per day for 30 days)

