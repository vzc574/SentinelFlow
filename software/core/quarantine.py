import os
import json
import time
import uuid
import shutil

XOR_KEY = 0x5A

class QuarantineManager:
    def __init__(self):
        self.app_data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'SentinelFlow')
        self.quarantine_dir = os.path.join(self.app_data_dir, 'Quarantine')
        self.vault_dir = os.path.join(self.quarantine_dir, 'Vault')
        self.index_path = os.path.join(self.quarantine_dir, 'quarantine_index.json')
        
        os.makedirs(self.vault_dir, exist_ok=True)
        self.index = self._load_index()

    def _load_index(self):
        if os.path.exists(self.index_path):
            try:
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Quarantine] Error loading index: {e}")
        return []

    def _save_index(self):
        try:
            with open(self.index_path, 'w', encoding='utf-8') as f:
                json.dump(self.index, f, indent=4)
        except Exception as e:
            print(f"[Quarantine] Error saving index: {e}")

    def _xor_cipher(self, data: bytes) -> bytes:
        return bytes([b ^ XOR_KEY for b in data])

    def quarantine_file(self, file_path: str, threat_name: str, threat_type: str = "Malware", sha256: str = "") -> dict:
        """Isolates and encrypts a malicious file."""
        if not os.path.exists(file_path):
            return {"success": False, "error": "File does not exist"}

        try:
            file_id = str(uuid.uuid4())
            file_name = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)
            vault_file_path = os.path.join(self.vault_dir, f"{file_id}.sfq")

            # Read original bytes
            with open(file_path, 'rb') as f:
                raw_data = f.read()

            # Encrypt bytes so file cannot be executed
            encrypted_data = self._xor_cipher(raw_data)

            with open(vault_file_path, 'wb') as f:
                f.write(encrypted_data)

            # Try to safely delete the original file
            try:
                os.remove(file_path)
            except Exception as e:
                # If locked, try to overwrite before removing
                try:
                    with open(file_path, 'wb') as f:
                        f.write(b'\x00' * min(file_size, 1024))
                    os.remove(file_path)
                except Exception:
                    pass

            record = {
                "id": file_id,
                "file_name": file_name,
                "original_path": os.path.abspath(file_path),
                "threat_name": threat_name,
                "threat_type": threat_type,
                "file_size": file_size,
                "sha256": sha256,
                "date_quarantined": time.strftime("%Y-%m-%d %H:%M:%S"),
                "vault_file": vault_file_path
            }

            self.index.insert(0, record)
            self._save_index()
            return {"success": True, "record": record}

        except Exception as e:
            print(f"[Quarantine] Failed to quarantine {file_path}: {e}")
            return {"success": False, "error": str(e)}

    def restore_file(self, file_id: str, target_dir: str = None) -> dict:
        """Restores a quarantined file."""
        record = next((item for item in self.index if item["id"] == file_id), None)
        if not record:
            return {"success": False, "error": "Record not found"}

        vault_file = record.get("vault_file")
        if not os.path.exists(vault_file):
            return {"success": False, "error": "Vault file missing"}

        try:
            with open(vault_file, 'rb') as f:
                encrypted_data = f.read()

            decrypted_data = self._xor_cipher(encrypted_data)

            dest_path = record["original_path"]
            if target_dir:
                dest_path = os.path.join(target_dir, record["file_name"])
            else:
                dest_parent = os.path.dirname(dest_path)
                os.makedirs(dest_parent, exist_ok=True)

            with open(dest_path, 'wb') as f:
                f.write(decrypted_data)

            # Remove from vault and index
            if os.path.exists(vault_file):
                os.remove(vault_file)
            self.index = [item for item in self.index if item["id"] != file_id]
            self._save_index()

            return {"success": True, "restored_path": dest_path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_permanently(self, file_id: str) -> dict:
        """Permanently deletes a quarantined item."""
        record = next((item for item in self.index if item["id"] == file_id), None)
        if not record:
            return {"success": False, "error": "Record not found"}

        vault_file = record.get("vault_file")
        try:
            if os.path.exists(vault_file):
                # Secure wipe
                try:
                    size = os.path.getsize(vault_file)
                    with open(vault_file, 'wb') as f:
                        f.write(b'\x00' * size)
                except Exception:
                    pass
                os.remove(vault_file)

            self.index = [item for item in self.index if item["id"] != file_id]
            self._save_index()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def wipe_all(self) -> dict:
        """Wipes all quarantined items."""
        for item in self.index:
            vault_file = item.get("vault_file")
            if vault_file and os.path.exists(vault_file):
                try:
                    os.remove(vault_file)
                except Exception:
                    pass
        self.index = []
        self._save_index()
        return {"success": True}

    def get_all(self) -> list:
        return self.index

quarantine_manager = QuarantineManager()
