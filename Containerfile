FROM docker.io/python:3.13.2-bullseye AS base

# Set the working directory
COPY . /app
WORKDIR /app

# Set shell to bash
RUN ln -sf /bin/bash /bin/sh

# Install dependencies
RUN python -m venv venv
RUN source venv/bin/activate
RUN pip install -r requirements.txt

# Setup port
EXPOSE 8000

# Set the entrypoint
RUN chmod +x start.sh
ENTRYPOINT [ "./start.sh" ]
