FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Install Docker CLI for Docker-outside-of-Docker (worker builds images via host socket)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gnupg \
    lsb-release \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
       | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install Bun 1.3.10 globally so the non-root 'node' user can use it
RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v1.3.10 \
    && mv /root/.bun/bin/bun /usr/local/bin/bun \
    && ln -s /usr/local/bin/bun /usr/local/bin/bunx \
    && chmod 755 /usr/local/bin/bun /usr/local/bin/bunx

RUN node --version && bun --version && docker --version
