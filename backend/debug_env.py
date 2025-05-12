import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
print("Loading environment variables from .env file...")
load_dotenv()

# Print environment variables
print(f"VYOS_API_KEY: {os.getenv('VYOS_API_KEY')}")
print(f"VYOS_HOST: {os.getenv('VYOS_HOST')}")
print(f"VYOS_API_URL: {os.getenv('VYOS_API_URL')}")
print(f"VYOS_HTTPS: {os.getenv('VYOS_HTTPS')}")
print(f"TRUST_SELF_SIGNED: {os.getenv('TRUST_SELF_SIGNED')}")

# Check if .env file exists
import pathlib
current_dir = pathlib.Path(__file__).parent
env_file = current_dir / ".env"
print(f".env file exists: {env_file.exists()}")

if env_file.exists():
    print("Contents of .env file:")
    with open(env_file, "r") as f:
        print(f.read())

print("Direct environment variables (not from .env):")
print(f"VYOS_API_KEY from os.environ: {os.environ.get('VYOS_API_KEY')}") 