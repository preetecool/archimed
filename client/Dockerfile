FROM node:lts-slim

# Set working directory
WORKDIR /app

# Set environment variables

ENV WEBSOCKET_URL=""

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port your app runs on
EXPOSE 8080

# Start the server
CMD ["node", ".output/server/index.mjs"]
