import os
import json
import winreg
import sys

def get_system_theme() -> str:
    """Detects Windows 10/11 system/app theme from the user registry."""
    try:
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            val, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
            return "light" if val == 1 else "dark"
    except Exception:
        pass
    return "light"

DEFAULT_CONFIG = {
    "theme": "system",  # "system", "dark", or "light"
    "realtime_protection": True,
    "realtime_scan_on_create": True,
    "realtime_scan_on_modify": True,
    "usb_detection": True,
    "auto_scan_usb": True,
    "usb_policy": "auto_scan",  # "prompt", "auto_scan", "silent_block"
    "heuristic_level": "deep",  # "standard", "deep", "aggressive"
    "scan_archives": True,
    "max_archive_size_mb": 100,
    "performance_profile": "balanced",  # "balanced", "maximum", "low_cpu"
    "auto_quarantine": True,
    "start_on_boot": True,
    "quarantine_retention_days": 30,
    "notification_toast": True,
    "notification_sound": True,
    "exclusions": [],
    "excluded_extensions": [".iso", ".vmdk", ".vdi"],
    "stats": {
        "total_scans": 0,
        "threats_blocked": 0,
        "files_scanned": 0,
        "bytes_scanned": 0,
        "last_scan_date": "Never",
        "last_scan_threats": 0,
        "junk_cleaned_mb": 0
    }
}

class ConfigManager:
    def __init__(self):
        self.app_data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'SentinelFlow')
        os.makedirs(self.app_data_dir, exist_ok=True)
        self.config_path = os.path.join(self.app_data_dir, 'config.json')
        self.config = self.load_config()

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    cfg = DEFAULT_CONFIG.copy()
                    cfg.update(saved)
                    if "stats" in saved:
                        cfg["stats"] = {**DEFAULT_CONFIG["stats"], **saved["stats"]}
                    return cfg
            except Exception as e:
                print(f"[Config] Error loading config: {e}")
        return DEFAULT_CONFIG.copy()

    def save_config(self):
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4)
        except Exception as e:
            print(f"[Config] Error saving config: {e}")

    def get(self, key, default=None):
        return self.config.get(key, default)

    def get_resolved_theme(self) -> str:
        """Returns 'dark' or 'light', resolving 'system' to the user's OS preference."""
        theme = self.config.get("theme", "system")
        if theme == "system":
            return get_system_theme()
        return "light" if theme == "light" else "dark"

    def set(self, key, value):
        self.config[key] = value
        self.save_config()

    def update_stats(self, **kwargs):
        for k, v in kwargs.items():
            if k in self.config["stats"]:
                if isinstance(v, (int, float)) and isinstance(self.config["stats"][k], (int, float)) and k in ["total_scans", "threats_blocked", "files_scanned", "bytes_scanned", "junk_cleaned_mb"]:
                    self.config["stats"][k] += v
                else:
                    self.config["stats"][k] = v
        self.save_config()

    def reset_to_defaults(self):
        self.config = DEFAULT_CONFIG.copy()
        self.save_config()

    def set_start_on_boot(self, enabled=True):
        self.set("start_on_boot", enabled)
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        app_name = "SentinelFlow"
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            if enabled:
                exe_path = sys.executable
                if getattr(sys, 'frozen', False):
                    cmd = f'"{exe_path}" --background'
                else:
                    script = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app.py'))
                    cmd = f'"{exe_path}" "{script}" --background'
                winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, cmd)
            else:
                try:
                    winreg.DeleteValue(key, app_name)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
        except Exception as e:
            print(f"[Config] Startup registry error: {e}")

config_manager = ConfigManager()
