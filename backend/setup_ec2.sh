#!/bin/bash
# AWS EC2 Setup script for FastAPI Backend
# Runs as root on Ubuntu. Sets up Python, systemd, and starts the API.

set -e

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <GEMINI_API_KEY> <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_KEY>"
    exit 1
fi

GEMINI_KEY=$1
SUPABASE_URL=$2
SUPABASE_KEY=$3

echo "=== 1. Creating 2GB Swap File (Prevents Out of Memory compiler crashes) ==="
if [ ! -f "/swapfile" ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "=== 2. Updating System Packages ==="
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv python3-dev git nginx curl python3-pandas python3-numpy

echo "=== 3. Cloning Repository ==="
cd /home/ubuntu
if [ ! -d "AI-stack-auditor" ]; then
    git clone https://github.com/Mehtab-24/AI-stack-auditor.git
fi
cd AI-stack-auditor/backend

echo "=== 4. Creating Virtual Environment ==="
# Use system-site-packages so Nginx, Pandas, and NumPy are inherited from apt-get
python3 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "=== 5. Setting Environment Variables ==="
cat <<EOT > .env
PORT=8000
HOST=0.0.0.0
GEMINI_API_KEY=$GEMINI_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY
APP_ENV=production
DEBUG=false
EOT

echo "=== 6. Setting up background systemd Service ==="
sudo cat <<EOT > /etc/systemd/system/fastapi.service
[Unit]
Description=FastAPI AI Stack Auditor Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/AI-stack-auditor/backend
ExecStart=/home/ubuntu/AI-stack-auditor/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
Environment=PATH=/home/ubuntu/AI-stack-auditor/backend/.venv/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOT

echo "=== 7. Starting Service ==="
sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl restart fastapi

echo "============================================="
echo "   BACKEND DEPLOYED SUCCESSFULLY TO AWS EC2!"
echo "   It is running on port 8000."
echo "============================================="
