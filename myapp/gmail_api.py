import os
import pickle
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from email.mime.text import MIMEText
import base64

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
                'client_secret.json', SCOPES)  # Ensure 'client_secret.json' exists
            creds = flow.run_local_server(port=8080)

        # Save the credentials for next time
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

def send_reset_email(to_email, uid, token):
    """Send password reset email via Gmail API."""
    creds = get_credentials()
    if not creds:
        print("Failed to get credentials")
        return
    
    try:
        # Build the Gmail service
        service = build('gmail', 'v1', credentials=creds)

        # Correctly create the reset URL using the reset token
        reset_url = f'http://localhost:4200/reset-password/{uid}/{token}/'

        # Create email content
        subject = "Password Reset Request"
        body = f"Click this link to reset your password: {reset_url}"

        # Create and send email
        message = create_message("danyin161@gmail.com", to_email, subject, body)
        send_message(service, "me", message)
        print("Password reset email sent successfully")
    
    except Exception as error:
        print(f"An error occurred: {error}")

def create_message(sender, to, subject, message_text):
    """Create a message for the Gmail API."""
    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

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
    

def send_email_via_gmail(to_email, subject, body):
    creds = get_credentials()  # Ensure this uses the function from earlier to get Gmail API credentials
    if not creds:
        raise Exception("Failed to get Gmail credentials")
    
    try:
        # Build the Gmail service using credentials
        service = build('gmail', 'v1', credentials=creds)

        # Create the email message
        message = create_message("your-email@gmail.com", to_email, subject, body)
        
        # Send the email via Gmail API
        send_message(service, "me", message)
    except Exception as error:
        print(f"An error occurred while sending email: {error}")
        raise