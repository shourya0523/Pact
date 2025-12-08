# Populate Sarah Johnson Check-in Data

This script populates varied check-in patterns for Sarah Johnson to test the progress visualization feature.

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

3. **Ensure test data exists:**
   First run the comprehensive test data script if you haven't already:
   ```bash
   python3 scripts/populate_comprehensive_test_data.py
   ```

## Running the Script

From the `Backend` directory:
```bash
python3 scripts/populate_sarah_checkins.py
```

## What It Does

1. **Finds Sarah Johnson** in the database
2. **Finds her habits** with goals
3. **Clears existing check-ins** for Sarah (to start fresh)
4. **Creates varied check-in patterns:**
   - **Habit 1**: Recent daily check-ins (last 14 days) - tests daily view
   - **Habit 2**: Weekly pattern (last 8 weeks, 3-4 check-ins per week) - tests weekly aggregation
   - **Habit 3**: Monthly pattern (last 3 months, 8-12 check-ins per month) - tests monthly aggregation
   - **Habit 4+**: Sparse pattern (few check-ins over 60 days) - tests sparse data handling
5. **Updates goal progress** based on the check-ins

## Test Login

After running the script, you can log in as Sarah Johnson:
- **Email:** `sarah.johnson@test.com`
- **Password:** `Test123!`

Then navigate to any of her goals to see the progress visualization with different time periods and grouping strategies.

## Notes

- The script creates realistic check-in patterns with varying frequencies
- For completion goals with target values, it assigns random values per check-in
- The script automatically updates goal progress in the habits collection
- Existing check-ins for Sarah are cleared before creating new ones

