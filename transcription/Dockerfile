FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install system dependencies
RUN apt update && apt install -y \
    wget git python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install FFmpeg properly
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get install -y python3-pip python3-dev python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Ensure CUDA and cuDNN libraries are available
ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
WORKDIR /workspace/

# Install Python dependencies - modified to use a writable directory for pip cache
RUN mkdir -p /var/tmp && \
    pip install --cache-dir=/var/tmp --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    rm -rf /var/tmp/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . /workspace/

CMD ["python", "/workspace/run.py"]
