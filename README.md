# Pact - Habit Tracker App

## Getting Started

### Backend Setup

1. Navigate to backend and create virtual environment:
   ```bash
   cd Backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string and other settings
   ```

4. Start the server:
   ```bash
   python main.py
   ```
   
   Server runs at: `http://localhost:8000`
   API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run android # Android emulator
   npm run ios     # iOS simulator
   npm run web     # Web browser
   ```

## Prerequisites

- Node.js 18+
- Python 3.8+
- MongoDB (local or cloud instance)

## Environment Variables

Backend (.env):

MONGODB_URL=mongodb://localhost:27017/duotrack 
SECRET_KEY= (create this later)
JWT_ALGORITHM= (same with this) 
JWT_EXPIRATION_HOURS=24

