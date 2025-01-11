# Use official Python image from the Docker Hub
FROM python:3.9-slim

# Set working directory inside the container
WORKDIR /app

# Copy the requirements.txt file into the container
COPY requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire FastAPI app into the container
COPY . /app/

# Expose the port your app will run on
EXPOSE 8080

# Command to run the app with uvicorn
CMD ["python", "main.py", "--host", "0.0.0.0", "--port", "8080"]