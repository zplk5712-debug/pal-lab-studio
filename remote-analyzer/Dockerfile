FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends freecad libgl1-mesa-dri libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY analyzer.py server.py ./

ENV PORT=8080
ENV QT_QPA_PLATFORM=offscreen
ENV LIBGL_ALWAYS_SOFTWARE=1
EXPOSE 8080

CMD ["freecadcmd", "/app/server.py"]
