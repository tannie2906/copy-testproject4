from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from base64 import urlsafe_b64encode
import os

def generate_aes_key():
    # Generate a secure 256-bit AES key
    key = os.urandom(32)  # 256-bit key (32 bytes)
    return key

def save_aes_key():
    key = generate_aes_key()
    with open("aes_key.key", "wb") as key_file:
        key_file.write(key)
    print("AES key saved as 'aes_key.key'")

if __name__ == "__main__":
    save_aes_key()
