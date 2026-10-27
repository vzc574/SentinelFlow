import os
import subprocess
import ctypes
import sys

def open_in_explorer(target_path: str):
    """Opens Windows Explorer with target path highlighted/selected."""
    if not target_path:
        return False

    norm_path = os.path.abspath(target_path)

    # If folder, check if exists
    if os.path.isdir(norm_path):
        try:
            os.startfile(norm_path)
            return True
        except Exception:
            pass

    # If file, open parent folder with file selected
    if os.path.exists(norm_path):
        try:
            cmd = f'explorer.exe /select,"{norm_path}"'
            subprocess.Popen(cmd, shell=True)
            return True
        except Exception as e:
            print(f"[NativeHelper] Explorer launch error: {e}")

    # Fallback to parent directory if file deleted
    parent = os.path.dirname(norm_path)
    if os.path.exists(parent):
        try:
            os.startfile(parent)
            return True
        except Exception:
            pass

    return False
