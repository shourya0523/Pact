from app.models.habit import PresetHabit, HabitType, HabitCategory, HabitFrequency

PRESET_HABITS = [
    PresetHabit(
        name="Exercise 30 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.FITNESS,
        description="Get at least 30 minutes of physical activity",
        goal="Stay active and improve cardiovascular health",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Drink 8 glasses of water",
        type=HabitType.BUILD,
        category=HabitCategory.HEALTH,
        description="Stay hydrated throughout the day",
        goal="Maintain proper hydration",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="No phone before bed",
        type=HabitType.BREAK,
        category=HabitCategory.SLEEP,
        description="Avoid screens 30 minutes before sleeping",
        goal="Improve sleep quality",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Study for 1 hour",
        type=HabitType.BUILD,
        category=HabitCategory.LEARNING,
        description="Dedicated study or learning time",
        goal="Continuous learning and skill development",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Meditate 10 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.MINDFULNESS,
        description="Practice mindfulness meditation",
        goal="Reduce stress and increase focus",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="No social media",
        type=HabitType.BREAK,
        category=HabitCategory.PRODUCTIVITY,
        description="Avoid social media for the day",
        goal="Reduce digital distraction",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Read for 20 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.LEARNING,
        description="Read books, articles, or educational content",
        goal="Expand knowledge and vocabulary",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Eat a healthy breakfast",
        type=HabitType.BUILD,
        category=HabitCategory.NUTRITION,
        description="Start the day with a nutritious meal",
        goal="Maintain balanced nutrition",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="No junk food",
        type=HabitType.BREAK,
        category=HabitCategory.NUTRITION,
        description="Avoid processed and unhealthy foods",
        goal="Improve overall health",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Call a friend or family",
        type=HabitType.BUILD,
        category=HabitCategory.SOCIAL,
        description="Connect with loved ones",
        goal="Maintain strong relationships",
        frequency=HabitFrequency.WEEKLY
    ),
    PresetHabit(
        name="Sleep before 11 PM",
        type=HabitType.BUILD,
        category=HabitCategory.SLEEP,
        description="Maintain a consistent sleep schedule",
        goal="Get 8 hours of quality sleep",
        frequency=HabitFrequency.DAILY
    ),
    PresetHabit(
        name="Journal for 5 minutes",
        type=HabitType.BUILD,
        category=HabitCategory.MINDFULNESS,
        description="Reflect on your day and thoughts",
        goal="Increase self-awareness",
        frequency=HabitFrequency.DAILY
    ),
]

def get_preset_habits():
    return PRESET_HABITS