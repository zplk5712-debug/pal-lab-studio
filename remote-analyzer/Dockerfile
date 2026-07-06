FROM condaforge/miniforge3:latest

RUN mamba install -y -c conda-forge python=3.10 "pythonocc-core=7.7.2" \
    && mamba clean -afy

WORKDIR /app
COPY analyzer.py server.py ./

ENV PORT=8080
EXPOSE 8080

CMD ["python", "/app/server.py"]
