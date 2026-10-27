import os
import sys
import threading
import ctypes

def notify_user(title: str, message: str, threat: bool = False):
    """Shows a Windows notification and plays an alert sound."""
    def _notify():
        try:
            # Try plyer if available
            from plyer import notification
            app_icon = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ui', 'assets', 'icon.ico'))
            if not os.path.exists(app_icon):
                app_icon = None
                
            notification.notify(
                title=title,
                message=message,
                app_name="SentinelFlow Antivirus",
                app_icon=app_icon,
                timeout=6
            )
        except Exception as e:
            # Fallback to ctypes MessageBeep
            try:
                if threat:
                    ctypes.windll.user32.MessageBeep(0x00000010) # MB_ICONHAND
                else:
                    ctypes.windll.user32.MessageBeep(0x00000040) # MB_ICONASTERISK
            except Exception:
                pass

    t = threading.Thread(target=_notify, daemon=True)
    t.start()
