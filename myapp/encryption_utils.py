import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.asymmetric import rsa
from django.http import FileResponse, Http404, HttpResponse
from base64 import b64encode, b64decode
import secrets
import boto3
import botocore.exceptions
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

boto3.setup_default_session(region_name='eu-north-1')
AWS_KMS_KEY_ID = "arn:aws:kms:eu-north-1:423623863574:key/d52ff96e-0372-4815-80c3-d6191a78d82e"
kms_client = boto3.client('kms', region_name='eu-north-1')


# Uses AWS KMS to generate a secure AES-256 encryption key.
def generate_data_key():
    kms_client = boto3.client('kms', region_name='eu-north-1')
    response = kms_client.generate_data_key(
        KeyId='arn:aws:kms:eu-north-1:423623863574:key/d52ff96e-0372-4815-80c3-d6191a78d82e',
        KeySpec='AES_256'
    )
    key = response['Plaintext']
    encrypted_key = response['CiphertextBlob']
    
    with open("encrypted_key.bin", "wb") as f:
        f.write(encrypted_key)  # Write raw binary
    
    return key, encrypted_key

# Uses AWS KMS to decrypt the stored data key.
def decrypt_data_key():
    try:
        with open("encrypted_key.bin", "rb") as f:
            encrypted_key = f.read()  # Read raw binary
        
        print(f"🔹 Encrypted Key Hex: {encrypted_key.hex()}")
        
        kms_client = boto3.client('kms', region_name='eu-north-1')
        response = kms_client.decrypt(CiphertextBlob=encrypted_key)
        key = response['Plaintext']

        if len(key) != 32:
            raise ValueError("Decrypted key is not 32 bytes long, possible corruption")
        
        return key
    except botocore.exceptions.ClientError as e:
        print(f"KMS Decrypt Error: {e.response['Error']['Message']}")
        raise

def encrypt_and_save_file(file, save_path):
    key, encrypted_key = generate_data_key()
    print(f"Before writing: {len(encrypted_key)} bytes")
    
    nonce = os.urandom(12)  # Generate a 12-byte secure nonce
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(file.read()) + encryptor.finalize()
    
    with open(save_path, 'wb') as encrypted_file:
        encrypted_file.write(len(encrypted_key).to_bytes(2, 'big')) 
        encrypted_file.write(encrypted_key)  # Store encrypted AES key
        encrypted_file.write(nonce)  # Store nonce
        encrypted_file.write(encryptor.tag)  # Store tag
        encrypted_file.write(encrypted_data)  # Store encrypted content
        print(f"Encrypted Key Length: {len(encrypted_key)}")

def decrypt_and_serve_file(encrypted_file_path):
    try:
        with open(encrypted_file_path, 'rb') as encrypted_file:
            key_len = int.from_bytes(encrypted_file.read(2), 'big')
            encrypted_key = encrypted_file.read(key_len)
            print(f"Encrypted Key Length: {len(encrypted_key)}")
            
            nonce = encrypted_file.read(12)
            tag = encrypted_file.read(16)
            encrypted_data = encrypted_file.read()
        
        key = decrypt_data_key()
        cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()
        
        response = HttpResponse(decrypted_data, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(encrypted_file_path)}"'
        return response
    except Exception as e:
        raise Http404(f"Error decrypting file: {e}")

def decrypt_file_to_temp(encrypted_file_path, temp_file_path):
    try:
        with open(encrypted_file_path, 'rb') as encrypted_file:
            key_len = int.from_bytes(encrypted_file.read(2), 'big')
            encrypted_key = encrypted_file.read(key_len)
            print(f"After reading: {encrypted_key.hex()}")
            
            nonce = encrypted_file.read(12)
            tag = encrypted_file.read(16)
            encrypted_data = encrypted_file.read()
        
        key = decrypt_data_key()
        cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()
        
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        with open(temp_file_path, 'wb') as temp_file:
            temp_file.write(decrypted_data)
        
        return temp_file_path
    except Exception as e:
        raise Exception(f"Error decrypting file: {e}")
