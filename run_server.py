import os
import json
import webbrowser
import threading
import sqlite3
import smtplib
import base64
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8500
HOST = '0.0.0.0'

# Load configuration if present
CONFIG_FILE = "config.json"
config = {
    "STORAGE_MODE": "local",  # "local" or "sqlite"
    "SQLITE_DB_PATH": "revenue_audit.db",
    "OTP_PROVIDER": "mock",   # "mock", "smtp", "sms"
    "SMTP_CONFIG": {},
    "SMS_CONFIG": {}
}

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            user_config = json.load(f)
            config.update(user_config)
            print(f"Loaded configuration from {CONFIG_FILE}. Storage mode: {config['STORAGE_MODE']}")
    except Exception as e:
        print(f"Error loading {CONFIG_FILE}: {e}. Using defaults.")

def get_db_connection():
    db_path = config.get("SQLITE_DB_PATH", "revenue_audit.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS json_store (
            client_id TEXT,
            key TEXT,
            value TEXT,
            PRIMARY KEY (client_id, key)
        )
    """)
    conn.commit()
    return conn

def load_json_data(key, default_file_path, default_fallback="[]"):
    client_id = "default"
    if config["STORAGE_MODE"] == "sqlite":
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM json_store WHERE client_id = ? AND key = ?", (client_id, key))
            row = cursor.fetchone()
            conn.close()
            if row:
                return row[0]
            else:
                # Auto-migrate existing JSON file if database is empty for this key
                if os.path.exists(default_file_path):
                    with open(default_file_path, "r", encoding="utf-8") as f:
                        file_content = f.read()
                    save_json_data(key, default_file_path, file_content)
                    return file_content
                return default_fallback
        except Exception as e:
            print(f"Error loading from sqlite for key {key}: {e}")
            
    if os.path.exists(default_file_path):
        with open(default_file_path, "r", encoding="utf-8") as f:
            return f.read()
    return default_fallback

def save_json_data(key, default_file_path, content_str):
    client_id = "default"
    if config["STORAGE_MODE"] == "sqlite":
        try:
            conn = get_db_connection()
            conn.execute(
                "INSERT OR REPLACE INTO json_store (client_id, key, value) VALUES (?, ?, ?)",
                (client_id, key, content_str)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving to sqlite for key {key}: {e}")
            
    with open(default_file_path, "w", encoding="utf-8") as f:
        f.write(content_str)
    return True

def send_smtp_email(smtp_config, to_email, subject, body_text):
    host = smtp_config.get("host")
    port = smtp_config.get("port", 587)
    username = smtp_config.get("username")
    password = smtp_config.get("password")
    from_email = smtp_config.get("from_email", username)
    
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body_text, 'plain'))
    
    server = smtplib.SMTP(host, port)
    server.starttls()
    server.login(username, password)
    server.sendmail(from_email, to_email, msg.as_string())
    server.quit()

def send_twilio_sms(account_sid, auth_token, from_number, to_number, message_body):
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    data = urllib.parse.urlencode({
        "From": from_number,
        "To": to_number,
        "Body": message_body
    }).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, method="POST")
    auth_str = f"{account_sid}:{auth_token}"
    auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    req.add_header("Authorization", f"Basic {auth_b64}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    with urllib.request.urlopen(req) as response:
        return response.read().decode("utf-8")

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

    def send_success_response(self, message):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "success", "message": message}).encode('utf-8'))

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "error", "message": message}).encode('utf-8'))

    def do_GET(self):
        if self.path.startswith('/api/load_audits'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            content = load_json_data('saved_audits', 'saved_audits.json', '[]')
            self.wfile.write(content.encode('utf-8'))
            
        elif self.path.startswith('/api/load_users'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            content = load_json_data('saved_users', 'saved_users.json', '[]')
            self.wfile.write(content.encode('utf-8'))
            
        elif self.path.startswith('/api/load_overrides'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            content = load_json_data('customer_rate_overrides', 'customer_rate_overrides.json', '{}')
            self.wfile.write(content.encode('utf-8'))
            
        elif self.path.startswith('/api/load_custom_agreements'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            content = load_json_data('custom_agreements', 'custom_agreements.json', '[]')
            self.wfile.write(content.encode('utf-8'))
            
        elif self.path.startswith('/api/load_agreements'):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            content = load_json_data('agreement_master', 'agreement_master.json', '{"agreements":[], "chargingMethods":[], "version":"1.0"}')
            self.wfile.write(content.encode('utf-8'))
            
        else:
            # Fallback to serving static files normally
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            if self.path == '/api/save_audits':
                save_json_data('saved_audits', 'saved_audits.json', post_data.decode('utf-8'))
                self.send_success_response("Audits saved successfully")
                
            elif self.path == '/api/save_overrides':
                save_json_data('customer_rate_overrides', 'customer_rate_overrides.json', post_data.decode('utf-8'))
                self.send_success_response("Overrides saved successfully")
                
            elif self.path == '/api/save_custom_agreements':
                save_json_data('custom_agreements', 'custom_agreements.json', post_data.decode('utf-8'))
                self.send_success_response("Custom agreements saved successfully")
                
            elif self.path == '/api/save_agreements':
                save_json_data('agreement_master', 'agreement_master.json', post_data.decode('utf-8'))
                self.send_success_response("Agreements saved successfully")
                
            elif self.path == '/api/save_users':
                save_json_data('saved_users', 'saved_users.json', post_data.decode('utf-8'))
                self.send_success_response("Users saved successfully")
                
            elif self.path == '/api/save_permissions':
                save_json_data('saved_permissions', 'saved_permissions.json', post_data.decode('utf-8'))
                self.send_success_response("Permissions saved successfully")
                
            elif self.path == '/api/send_otp':
                data = json.loads(post_data.decode('utf-8'))
                email = data.get("email")
                otp = data.get("otp")
                username = data.get("username", "User")
                
                subject = "Guwahati Revenue Assurance Portal - OTP Verification"
                message_body = f"Your One-Time Password (OTP) for the BRC Guwahati Revenue Assurance Portal is: {otp}.\n\nThis code will expire in 5 minutes.\n\nAuthorized BRC Portal Access Only."
                
                success = False
                error_msg = ""
                provider = config.get("OTP_PROVIDER", "mock")
                
                if provider == "smtp" and config.get("SMTP_CONFIG"):
                    try:
                        send_smtp_email(config["SMTP_CONFIG"], email, subject, message_body)
                        success = True
                    except Exception as ex:
                        error_msg = f"SMTP dispatch failed: {ex}"
                        print(f"[OTP ERROR] {error_msg}")
                elif provider == "sms" and config.get("SMS_CONFIG"):
                    sms_conf = config["SMS_CONFIG"]
                    phone_number = sms_conf.get("to_number_overrides", {}).get(username)
                    if phone_number:
                        try:
                            send_twilio_sms(
                                sms_conf["account_sid"],
                                sms_conf["auth_token"],
                                sms_conf["from_number"],
                                phone_number,
                                message_body
                            )
                            success = True
                        except Exception as ex:
                            error_msg = f"SMS dispatch failed: {ex}"
                            print(f"[OTP ERROR] {error_msg}")
                    else:
                        error_msg = f"No phone number override mapped for username: {username}"
                        print(f"[OTP ERROR] {error_msg}")
                else:
                    # Mock provider: log code to terminal so developers can see it
                    print(f"[MOCK OTP SUCCESS] Sent OTP to {email}: {otp}")
                    success = True
                    
                if success:
                    self.send_success_response("OTP sent successfully")
                else:
                    self.send_error_response(400, error_msg or "OTP provider failed")
            else:
                self.send_error_response(404, "Endpoint not found")
        except Exception as e:
            self.send_error_response(500, str(e))

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
