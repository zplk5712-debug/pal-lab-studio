FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends freecad xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY analyzer.py server.py ./

ENV PORT=8080
ENV QT_QPA_PLATFORM=offscreen
EXPOSE 8080

CMD ["xvfb-run", "-a", "freecadcmd", "/app/server.py"]
