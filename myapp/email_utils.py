import os
import pickle
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Scopes required for Gmail API
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_credentials():
    """Fetch OAuth2 credentials."""
    creds = None
    # Check if token.pickle file exists (stores the user's access/refresh tokens)
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)

    # If there are no valid credentials, prompt user to log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'your_credentials.json', SCOPES)
            creds = flow.run_local_server(port=8080)

        # Save the credentials for next time
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

def send_reset_email(to_email, reset_url):
    """Send password reset email via Gmail API."""
    creds = get_credentials()
    if not creds:
        print("Failed to get credentials")
        return
    
    try:
        service = build('gmail', 'v1', credentials=creds)

        message = create_message("your_email@gmail.com", to_email, "Password Reset", f"Click this link to reset your password: {reset_url}")
        send_message(service, "me", message)
        print("Email sent successfully")
    
    except Exception as error:
        print(f"An error occurred: {error}")

def create_message(sender, to, subject, message_text):
    """Create a message for the Gmail API."""
    from email.mime.text import MIMEText
    from base64 import urlsafe_b64encode

    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject

    raw_message = urlsafe_b64encode(message.as_bytes()).decode()

    return {'raw': raw_message}

def send_message(service, sender, message):
    """Send the message via Gmail API."""
    try:
        message = service.users().messages().send(userId=sender, body=message).execute()
        print(f"Message sent successfully with ID: {message['id']}")
        return message
    except Exception as error:
        print(f"An error occurred: {error}")
        return None