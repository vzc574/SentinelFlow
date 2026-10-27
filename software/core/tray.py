import os
import sys
import threading
from PIL import Image
import pystray
from pystray import MenuItem as item, Menu

class SystemTrayManager:
    def __init__(self, on_show_window=None, on_quick_scan=None, on_optimize=None, on_exit=None):
        self.on_show_window = on_show_window
        self.on_quick_scan = on_quick_scan
        self.on_optimize = on_optimize
        self.on_exit = on_exit
        self.icon = None
        self.thread = None

    def create_tray_icon(self):
        icon_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ui', 'assets', 'icon.png'))
        if os.path.exists(icon_path):
            image = Image.open(icon_path)
        else:
            image = Image.new('RGB', (64, 64), color=(31, 111, 104))

        def _action_show(icon, item):
            if self.on_show_window:
                self.on_show_window()

        def _action_scan(icon, item):
            if self.on_quick_scan:
                self.on_quick_scan()

        def _action_optimize(icon, item):
            if self.on_optimize:
                self.on_optimize()

        def _action_exit(icon, item):
            if self.icon:
                self.icon.stop()
            if self.on_exit:
                self.on_exit()
            else:
                os._exit(0)

        menu = Menu(
            item("🛡️ Open SentinelFlow", _action_show, default=True),
            item("⚡ Run Quick Scan", _action_scan),
            item("🧹 Clean Junk & Optimize", _action_optimize),
            Menu.SEPARATOR,
            item("❌ Exit SentinelFlow", _action_exit)
        )

        self.icon = pystray.Icon("SentinelFlow", image, "SentinelFlow - System Protected", menu)

    def start(self):
        if not self.icon:
            self.create_tray_icon()
        self.thread = threading.Thread(target=self.icon.run, daemon=True)
        self.thread.start()

    def stop(self):
        if self.icon:
            self.icon.stop()

    def notify(self, title: str, message: str):
        if self.icon:
            try:
                self.icon.notify(message, title)
            except Exception:
                pass
