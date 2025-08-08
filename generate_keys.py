#!/usr/bin/env python3
"""
Generate RSA key pair for Tauri updater
"""
import sys
import os

try:
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("Installing cryptography package...")
    os.system(f"{sys.executable} -m pip install cryptography")
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend

def generate_keys():
    print("Generating RSA key pair for Tauri updater...")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Serialize private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    # Save to files
    with open('updater_private.pem', 'wb') as f:
        f.write(private_pem)
    
    with open('updater_public.pem', 'wb') as f:
        f.write(public_pem)
    
    print("✓ Keys generated successfully!")
    print("Private key: updater_private.pem")
    print("Public key: updater_public.pem")
    print("")
    print("IMPORTANT:")
    print("- Keep the private key secure and never commit it to your repository")
    print("- Copy the public key content to your tauri.conf.json")
    print("")
    print("Public key content:")
    print(public_pem.decode('utf-8'))

if __name__ == "__main__":
    generate_keys()