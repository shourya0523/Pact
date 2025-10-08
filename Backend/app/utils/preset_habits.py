from app.models.habit import PresetHabit, HabitType, HabitCategory

PRESET_HABITS = [
    PresetHabit(
        name="Exercise 30 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.FITNESS,
        description="Get at least 30 minutes of physical activity"
    ),
    PresetHabit(
        name="Drink 8 glasses of water",
        type=HabitType.BUILD,
        category=HabitCategory.HEALTH,
        description="Stay hydrated throughout the day"
    ),
    PresetHabit(
        name="No phone before bed",
        type=HabitType.BREAK,
        category=HabitCategory.SLEEP,
        description="Avoid screens 30 minutes before sleeping"
    ),
    PresetHabit(
        name="Study for 1 hour",
        type=HabitType.BUILD,
        category=HabitCategory.LEARNING,
        description="Dedicated study or learning time"
    ),
    PresetHabit(
        name="Meditate 10 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.MINDFULNESS,
        description="Practice mindfulness meditation"
    ),
    PresetHabit(
        name="No social media",
        type=HabitType.BREAK,
        category=HabitCategory.PRODUCTIVITY,
        description="Avoid social media for the day"
    ),
    PresetHabit(
        name="Read for 20 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.LEARNING,
        description="Read books, articles, or educational content"
    ),
    PresetHabit(
        name="Eat a healthy breakfast",
        type=HabitType.BUILD,
        category=HabitCategory.NUTRITION,
        description="Start the day with a nutritious meal"
    ),
    PresetHabit(
        name="No junk food",
        type=HabitType.BREAK,
        category=HabitCategory.NUTRITION,
        description="Avoid processed and unhealthy foods"
    ),
    PresetHabit(
        name="Call a friend or family",
        type=HabitType.BUILD,
        category=HabitCategory.SOCIAL,
        description="Connect with loved ones"
    ),
    PresetHabit(
        name="Sleep before 11 PM",
        type=HabitType.BUILD,
        category=HabitCategory.SLEEP,
        description="Maintain a consistent sleep schedule"
    ),
    PresetHabit(
        name="Journal for 5 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.MINDFULNESS,
        description="Reflect on your day and thoughts"
    ),
]

def get_preset_habits():
    return PRESET_HABITS