from cryptography.fernet import Fernet
import os

KEY_FILE = 'secret.key'

# Generate and save a secret key (Run this once and save the key securely)
def generate_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as key_file:
            key_file.write(key)
        print("Secret key generated and saved.")
    else:
        print("Secret key already exists.")

# Load the secret key
def load_key():
    if not os.path.exists(KEY_FILE):
        raise Exception("Secret key not found. Please generate one first.")
    return open(KEY_FILE, 'rb').read()

# Encrypt a file
def encrypt_file(file_path):
    key = load_key()
    fernet = Fernet(key)

    with open(file_path, 'rb') as file:
        original = file.read()

    encrypted = fernet.encrypt(original)

    with open(file_path, 'wb') as encrypted_file:
        encrypted_file.write(encrypted)

# Decrypt a file
def decrypt_file(file_path):
    key = load_key()
    fernet = Fernet(key)

    with open(file_path, 'rb') as enc_file:
        encrypted = enc_file.read()

    decrypted = fernet.decrypt(encrypted)

    temp_path = file_path + ".decrypted"
    with open(temp_path, 'wb') as dec_file:
        dec_file.write(decrypted)

