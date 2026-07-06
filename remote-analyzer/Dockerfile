FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends freecad \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY analyzer.py server.py ./

ENV PORT=8080
EXPOSE 8080

CMD ["freecadcmd", "/app/server.py"]
