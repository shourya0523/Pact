# Pull the official Node.js image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Expo uses (default 8081, web 8081 or 19006 depending on version)
EXPOSE 8081

# Start the application
CMD ["npx", "expo", "start"]

