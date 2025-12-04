# Quick Start - Testing Notifications

## 1. Start Backend (Terminal 1)
```bash
cd /Users/audrey/PycharmProjects/Pact/Backend
python3 -m uvicorn main:app --reload
```

## 2. Create Test Notifications (Terminal 2)
```bash
cd /Users/audrey/PycharmProjects/Pact/Backend
python3 scripts/populate_test_notifications.py
```

You should see:
```
==================================================
Creating Test Notifications
==================================================
Finding test users...
Found users: [username1] and [username2]
Cleared old notifications
Created 6 test notifications for [username1]
Created test partner request: [id]
Updated partnership_request notification with real request ID

Test notifications created successfully
User [username1] now has 6 notifications

You can now view these in the app Notifications screen
```

## 3. Start Frontend (Terminal 3)
```bash
cd /Users/audrey/PycharmProjects/Pact/Frontend
npx expo start
```

## 4. Test in App
1. **Log in** with your test user
2. **Navigate** to Notifications screen
3. **See** 6 different notification types
4. **Tap** ACCEPT on partnership request → Should show success
5. **Tap** CHECK IN on habit reminder → Should show "Checked In!"
6. **Pull down** to refresh notifications

## What You Should See:

### Notification 1: Partner Nudge
```
[Your partner] is nudging you to hit the gym!
About 1 minute ago
[CHECK IN] button
```

### Notification 2: Partnership Request
```
Partnership request from [partner]...
About 3 hours ago
[ACCEPT] [DECLINE] buttons
```

### Notification 3: Partner Check-in
```
[Your partner] checked in today!
About 3 hours ago
[CHECK IN] button
```

### Notification 4: Habit Reminder
```
Check in for your Study Every...
Just now
[CHECK IN] button
```

### Notification 5: Progress Milestone
```
You have reached 50% progress on your Workout...
22 days ago
(no buttons - informational)
```

### Notification 6: Missed Habit
```
Ups, You have missed your Lowerbo...
27 days ago
(no buttons - informational)
```

## Troubleshooting

### "No notifications showing"
- Make sure you ran the test script
- Check you're logged in as the correct user
- Pull down to refresh
- Check backend terminal for errors

### "Buttons not working"
- Check Frontend terminal for API errors
- Check Backend terminal for errors
- Ensure backend is running on port 8000
- Check your auth token is valid

### "Action buttons disappeared immediately"
- This is expected if `action_taken` is true
- Run the populate script again to reset
- Or manually check MongoDB and set `action_taken: false`

## Need to Reset?
```bash
# Run populate script again - it clears old notifications
cd /Users/audrey/PycharmProjects/Pact/Backend
python3 scripts/populate_test_notifications.py
```

## Success Criteria
- [ ] Backend running without errors
- [ ] Test script created 6 notifications
- [ ] App shows 6 notifications
- [ ] ACCEPT button creates partnership
- [ ] DECLINE button works
- [ ] CHECK IN button logs habit
- [ ] Pull-to-refresh works
- [ ] No console errors

---

** Your notifications system is fully functional**
