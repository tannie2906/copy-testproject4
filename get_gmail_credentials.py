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
                'client_secret_438132391113-cllb7723buo3mbk5ok53sk36n3v9tecc.apps.googleusercontent.com.json', SCOPES)
            creds = flow.run_local_server(port=8080)

        # Save the credentials for next time
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

# Main logic to fetch credentials and print OAuth2 token
if __name__ == "__main__":
    creds = get_credentials()
    if creds:
        oauth2_token = creds.token
        print(f"Your OAuth2 Token: {oauth2_token}")
    else:
        print("Failed to get credentials.")