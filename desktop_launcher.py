"""PhysLab 2.0 desktop launcher for Windows."""
import threading
import webview
from werkzeug.serving import make_server

from app import app


def main():
    # Bind only to loopback: the desktop edition must not expose its API to LAN.
    server = make_server("127.0.0.1", 0, app, threaded=True)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    url = f"http://127.0.0.1:{server.server_port}/"
    webview.create_window(
        "PhysLab 2.0",
        url,
        width=1440,
        height=900,
        min_size=(1000, 680),
        text_select=True,
    )
    try:
        # On Windows pywebview selects the available native renderer (normally WebView2).
        webview.start()
    finally:
        server.shutdown()
        server_thread.join(timeout=3)


if __name__ == "__main__":
    main()
