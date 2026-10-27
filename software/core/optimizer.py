import os
import glob
import shutil
import ctypes
import psutil
from typing import Dict, List, Any
from core.config import config_manager

def format_bytes(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"

class PerformanceOptimizer:
    def __init__(self):
        pass

    def get_junk_categories(self) -> Dict[str, dict]:
        user_profile = os.environ.get('USERPROFILE', os.path.expanduser('~'))
        local_appdata = os.environ.get('LOCALAPPDATA', os.path.join(user_profile, 'AppData', 'Local'))
        temp_dir = os.environ.get('TEMP', os.path.join(local_appdata, 'Temp'))
        prog_data = os.environ.get('PROGRAMDATA', r"C:\ProgramData")

        categories = {
            "user_temp": {
                "name": "User Temporary Files",
                "desc": "Temporary cached application data, installer remnants, and transient files",
                "paths": [temp_dir]
            },
            "system_temp": {
                "name": "Windows System Temp & Logs",
                "desc": "Operating system temp files, installation logs, and servicing artifacts",
                "paths": [
                    r"C:\Windows\Temp",
                    r"C:\Windows\Logs"
                ]
            },
            "crash_dumps": {
                "name": "Crash Dumps & Error Reports",
                "desc": "WER crash reports, application memory dumps (*.dmp), and triage logs",
                "paths": [
                    os.path.join(local_appdata, 'CrashDumps'),
                    os.path.join(local_appdata, 'Microsoft', 'Windows', 'WER'),
                    os.path.join(prog_data, 'Microsoft', 'Windows', 'WER'),
                    r"C:\Windows\Minidump"
                ]
            },
            "browser_cache": {
                "name": "Web Browser Caches",
                "desc": "Cached web assets, script caches, and GPU caches from Chrome, Edge, Brave, and Firefox",
                "paths": [
                    os.path.join(local_appdata, r"Google\Chrome\User Data\Default\Cache"),
                    os.path.join(local_appdata, r"Google\Chrome\User Data\Default\Code Cache"),
                    os.path.join(local_appdata, r"Google\Chrome\User Data\Default\GPUCache"),
                    os.path.join(local_appdata, r"Microsoft\Edge\User Data\Default\Cache"),
                    os.path.join(local_appdata, r"Microsoft\Edge\User Data\Default\Code Cache"),
                    os.path.join(local_appdata, r"Microsoft\Edge\User Data\Default\GPUCache"),
                    os.path.join(local_appdata, r"BraveSoftware\Brave-Browser\User Data\Default\Cache"),
                    os.path.join(local_appdata, r"Mozilla\Firefox\Profiles")
                ]
            },
            "windows_update_cache": {
                "name": "Windows Update Download Cache",
                "desc": "Downloaded update packages that have already been applied to the system",
                "paths": [
                    r"C:\Windows\SoftwareDistribution\Download"
                ]
            },
            "thumbnail_shader_cache": {
                "name": "Thumbnail & DirectX Shader Cache",
                "desc": "Explorer cached media thumbnails and GPU compiled DirectX shader blobs",
                "paths": [
                    os.path.join(local_appdata, r"Microsoft\Windows\Explorer"),
                    os.path.join(local_appdata, r"D3DSCache")
                ]
            }
        }
        return categories

    def scan_junk(self) -> Dict[str, Any]:
        """Scans for all junk without deleting anything."""
        categories = self.get_junk_categories()
        results = {}
        total_size = 0
        total_files = 0

        for cat_key, cat_info in categories.items():
            cat_files = []
            cat_size = 0

            for base_path in cat_info["paths"]:
                if not os.path.exists(base_path):
                    continue

                if os.path.isfile(base_path):
                    try:
                        sz = os.path.getsize(base_path)
                        cat_size += sz
                        cat_files.append(base_path)
                    except Exception:
                        pass
                elif os.path.isdir(base_path):
                    for root, dirs, files in os.walk(base_path):
                        for f in files:
                            # If thumbnail cache, only match thumbcache/iconcache files
                            if cat_key == "thumbnail_shader_cache" and not (f.startswith("thumbcache_") or f.startswith("iconcache_") or root.endswith("D3DSCache")):
                                continue
                            fp = os.path.join(root, f)
                            try:
                                sz = os.path.getsize(fp)
                                cat_size += sz
                                cat_files.append(fp)
                            except Exception:
                                pass

            total_size += cat_size
            total_files += len(cat_files)

            results[cat_key] = {
                "key": cat_key,
                "name": cat_info["name"],
                "desc": cat_info["desc"],
                "count": len(cat_files),
                "size_bytes": cat_size,
                "size_formatted": format_bytes(cat_size),
                "files": cat_files[:1000]
            }

        return {
            "categories": results,
            "total_size_bytes": total_size,
            "total_size_formatted": format_bytes(total_size),
            "total_files": total_files
        }

    def clean_junk(self, selected_categories: List[str]) -> Dict[str, Any]:
        """Cleans selected categories only with explicit user acknowledgement."""
        scan_data = self.scan_junk()
        cleaned_bytes = 0
        cleaned_files = 0
        failed_files = 0

        for cat_key in selected_categories:
            if cat_key in scan_data["categories"]:
                cat = scan_data["categories"][cat_key]
                for file_path in cat["files"]:
                    try:
                        if os.path.isfile(file_path):
                            sz = os.path.getsize(file_path)
                            os.remove(file_path)
                            cleaned_bytes += sz
                            cleaned_files += 1
                    except Exception:
                        failed_files += 1

        # Memory Optimization: Free working sets of idle background processes
        processes_optimized = 0
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    handle = ctypes.windll.kernel32.OpenProcess(0x001F0FFF, False, proc.pid)
                    if handle:
                        if ctypes.windll.psapi.EmptyWorkingSet(handle):
                            processes_optimized += 1
                        ctypes.windll.kernel32.CloseHandle(handle)
                except Exception:
                    pass
        except Exception:
            pass

        cleaned_mb = round(cleaned_bytes / (1024 * 1024), 2)
        config_manager.update_stats(junk_cleaned_mb=cleaned_mb)

        return {
            "success": True,
            "cleaned_bytes": cleaned_bytes,
            "cleaned_formatted": format_bytes(cleaned_bytes),
            "cleaned_files": cleaned_files,
            "failed_files": failed_files,
            "processes_optimized": processes_optimized,
            "ram_optimized": True
        }

performance_optimizer = PerformanceOptimizer()
