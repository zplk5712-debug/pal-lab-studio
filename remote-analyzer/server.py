import base64
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyzer import analyze_with_opencascade  # noqa: E402

MAX_BODY_BYTES = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = (".step", ".stp")
analysis_lock = threading.Lock()


class AnalyzerRequestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/analyze-model":
            self._send_json(404, {"error": "not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > MAX_BODY_BYTES:
                raise ValueError("invalid or oversized request body")

            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))

            file_name = payload.get("fileName")
            data_base64 = payload.get("dataBase64")
            file_size_bytes = payload.get("fileSizeBytes")

            if not file_name or not data_base64:
                raise ValueError("missing fileName or dataBase64")

            extension = os.path.splitext(file_name)[1].lower()
            if extension not in ALLOWED_EXTENSIONS:
                raise ValueError("unsupported model type, only STEP/STP is supported")

            binary = base64.b64decode(data_base64)
            temp_path = None

            with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
                temp_file.write(binary)
                temp_path = temp_file.name

            try:
                with analysis_lock:
                    result = analyze_with_opencascade(temp_path, file_name, file_size_bytes)
            finally:
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

            self._send_json(200, {"result": result})
        except Exception as error:  # noqa: BLE001
            self._send_json(400, {"error": str(error)})

    def log_message(self, format_str, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), format_str % args))


def main():
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AnalyzerRequestHandler)
    print(f"OpenCascade remote analyzer listening on port {port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
