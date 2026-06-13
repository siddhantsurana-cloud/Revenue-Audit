import os
import json
import webbrowser
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8000
HOST = '0.0.0.0'

class DatabaseSyncHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Support CORS for local cross-origin file testing if necessary
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/load_audits':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            data_file = 'saved_audits.json'
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            else:
                content = '[]'
            self.wfile.write(content.encode('utf-8'))
            
        elif self.path == '/api/load_overrides':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            data_file = 'customer_rate_overrides.json'
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    content = f.read()
            else:
                content = '{}'
            self.wfile.write(content.encode('utf-8'))
            
        else:
            # Fallback to serving static files normally
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/save_audits':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                with open('saved_audits.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Audits saved successfully"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
                
        elif self.path == '/api/save_overrides':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                with open('customer_rate_overrides.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Overrides saved successfully"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def open_browser():
    url = f"http://localhost:{PORT}/index.html"
    print(f"Opening web browser to: {url}")
    webbrowser.open(url)

if __name__ == '__main__':
    import socket
    
    # Find a free port starting from 8000
    port = PORT
    while port < 9000:
        try:
            # Check loopback interface
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
            # Check wildcard interface
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((HOST, port))
            PORT = port
            break
        except socket.error:
            port += 1

    print(f"Starting database sync server on http://localhost:{PORT}")
    server = HTTPServer((HOST, PORT), DatabaseSyncHandler)
    
    # Launch browser in a background timer thread once the server starts
    threading.Timer(0.8, open_browser).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down database sync server.")
