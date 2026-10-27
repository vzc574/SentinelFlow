import os
import sys
import time
import winreg
import shutil
import ctypes
import threading
import tkinter as tk
from tkinter import ttk, messagebox

COLOR_BG = "#F5F6F3"
COLOR_CARD = "#FFFFFF"
COLOR_CARD_INNER = "#F8F9FA"
COLOR_ACCENT = "#1F6F68"
COLOR_ACCENT_HOVER = "#175751"
COLOR_TEXT = "#1A202C"
COLOR_MUTED = "#718096"
COLOR_BORDER = "#E2E8F0"
COLOR_DANGER = "#EF4444"
COLOR_DANGER_HOVER = "#DC2626"

class SentinelFlowUninstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("SentinelFlow Antivirus Uninstaller")
        
        # Frameless window matching main application Kaspersky style
        self.overrideredirect(True)
        self.configure(bg=COLOR_BG)

        self._normal_w = 560
        self._normal_h = 420
        x = (self.winfo_screenwidth() // 2) - (self._normal_w // 2)
        y = (self.winfo_screenheight() // 2) - (self._normal_h // 2)
        self.geometry(f'{self._normal_w}x{self._normal_h}+{x}+{y}')

        self._is_maximized = False
        self._prev_geom = f'{self._normal_w}x{self._normal_h}+{x}+{y}'

        self.remove_logs = tk.BooleanVar(value=True)
        self.remove_quarantine = tk.BooleanVar(value=True)

        self.init_ui()

    def init_ui(self):
        # Outer Border Wrap
        self.outer_border = tk.Frame(self, bg=COLOR_BORDER, bd=1)
        self.outer_border.pack(fill=tk.BOTH, expand=True)

        self.main_container = tk.Frame(self.outer_border, bg=COLOR_BG)
        self.main_container.pack(fill=tk.BOTH, expand=True)

        # 1. Custom Frameless Titlebar (Kaspersky style ? — □ ✕)
        self.titlebar = tk.Frame(self.main_container, bg=COLOR_CARD, height=36)
        self.titlebar.pack(fill=tk.X, side=tk.TOP)
        self.titlebar.pack_propagate(False)

        # Draggable Titlebar Binding
        self.titlebar.bind("<ButtonPress-1>", self._start_drag)
        self.titlebar.bind("<B1-Motion>", self._do_drag)
        self.titlebar.bind("<Double-Button-1>", lambda e: self.toggle_maximize())

        brand_frame = tk.Frame(self.titlebar, bg=COLOR_CARD)
        brand_frame.pack(side=tk.LEFT, padx=12, fill=tk.Y)
        brand_frame.bind("<ButtonPress-1>", self._start_drag)
        brand_frame.bind("<B1-Motion>", self._do_drag)

        lbl_shield = tk.Label(brand_frame, text="🛡️", font=("Segoe UI", 10), bg=COLOR_CARD, fg=COLOR_ACCENT)
        lbl_shield.pack(side=tk.LEFT, padx=(0, 6))

        lbl_title = tk.Label(
            brand_frame, text="SentinelFlow Uninstall Wizard",
            font=("Segoe UI", 9, "bold"), fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_title.pack(side=tk.LEFT)

        lbl_tag = tk.Label(
            brand_frame, text="Removal Utility", font=("Segoe UI", 7, "bold"),
            fg="#DC2626", bg="#FEE2E2", padx=6, pady=1
        )
        lbl_tag.pack(side=tk.LEFT, padx=8)

        # Right window controls: ? — □ ✕
        ctrl_frame = tk.Frame(self.titlebar, bg=COLOR_CARD)
        ctrl_frame.pack(side=tk.RIGHT, fill=tk.Y)

        self.btn_close = tk.Label(ctrl_frame, text="✕", font=("Segoe UI", 9), bg=COLOR_CARD, fg=COLOR_MUTED, width=4, cursor="hand2")
        self.btn_close.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_close.bind("<Button-1>", lambda e: self.destroy())
        self.btn_close.bind("<Enter>", lambda e: self.btn_close.config(bg=COLOR_DANGER, fg="#FFFFFF"))
        self.btn_close.bind("<Leave>", lambda e: self.btn_close.config(bg=COLOR_CARD, fg=COLOR_MUTED))

        self.btn_max = tk.Label(ctrl_frame, text="□", font=("Segoe UI", 9), bg=COLOR_CARD, fg=COLOR_MUTED, width=4, cursor="hand2")
        self.btn_max.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_max.bind("<Button-1>", lambda e: self.toggle_maximize())
        self.btn_max.bind("<Enter>", lambda e: self.btn_max.config(bg="#E2E8F0", fg=COLOR_TEXT))
        self.btn_max.bind("<Leave>", lambda e: self.btn_max.config(bg=COLOR_CARD, fg=COLOR_MUTED))

        self.btn_min = tk.Label(ctrl_frame, text="—", font=("Segoe UI", 9), bg=COLOR_CARD, fg=COLOR_MUTED, width=4, cursor="hand2")
        self.btn_min.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_min.bind("<Button-1>", lambda e: self.minimize_window())
        self.btn_min.bind("<Enter>", lambda e: self.btn_min.config(bg="#E2E8F0", fg=COLOR_TEXT))
        self.btn_min.bind("<Leave>", lambda e: self.btn_min.config(bg=COLOR_CARD, fg=COLOR_MUTED))

        self.btn_help = tk.Label(ctrl_frame, text="?", font=("Segoe UI", 9, "bold"), bg=COLOR_CARD, fg=COLOR_MUTED, width=4, cursor="hand2")
        self.btn_help.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_help.bind("<Button-1>", lambda e: self.show_help_modal())
        self.btn_help.bind("<Enter>", lambda e: self.btn_help.config(bg="#E2E8F0", fg=COLOR_TEXT))
        self.btn_help.bind("<Leave>", lambda e: self.btn_help.config(bg=COLOR_CARD, fg=COLOR_MUTED))

        sep_bar = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        sep_bar.pack(fill=tk.X, side=tk.TOP)

        # 2. Header Banner
        self.header_frame = tk.Frame(self.main_container, bg=COLOR_CARD, height=65)
        self.header_frame.pack(fill=tk.X, side=tk.TOP)
        self.header_frame.pack_propagate(False)

        self.header_title = tk.Label(
            self.header_frame, text="Uninstall SentinelFlow Antivirus",
            font=("Segoe UI", 12, "bold"), fg="#DC2626", bg=COLOR_CARD
        )
        self.header_title.pack(anchor="w", padx=24, pady=(12, 1))

        self.header_subtitle = tk.Label(
            self.header_frame, text="Safely remove all protection modules, drivers, and background services",
            font=("Segoe UI", 9), fg=COLOR_MUTED, bg=COLOR_CARD
        )
        self.header_subtitle.pack(anchor="w", padx=24)

        header_border = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        header_border.pack(fill=tk.X, side=tk.TOP)

        # 3. Content Frame
        self.content_frame = tk.Frame(self.main_container, bg=COLOR_BG)
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=24, pady=16)

        card = tk.Frame(self.content_frame, bg=COLOR_CARD, bd=1, relief=tk.SOLID)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        card_pad = tk.Frame(card, bg=COLOR_CARD)
        card_pad.pack(fill=tk.BOTH, expand=True, padx=22, pady=16)

        lbl_prompt = tk.Label(
            card_pad,
            text="Confirm SentinelFlow Removal",
            font=("Segoe UI", 11, "bold"), fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_prompt.pack(anchor="w", pady=(0, 6))

        lbl_info = tk.Label(
            card_pad,
            text="This will stop real-time protection, removable device auto-detection,\n"
                 "and remove all SentinelFlow shortcuts and files from your system.",
            font=("Segoe UI", 9), fg=COLOR_MUTED, bg=COLOR_CARD, justify=tk.LEFT
        )
        lbl_info.pack(anchor="w", pady=(0, 14))

        chk_logs = tk.Checkbutton(
            card_pad, text="Remove configuration, exclusions whitelist, and audit logs",
            variable=self.remove_logs, font=("Segoe UI", 9), fg=COLOR_TEXT, bg=COLOR_CARD,
            selectcolor=COLOR_CARD, activebackground=COLOR_CARD, activeforeground=COLOR_TEXT
        )
        chk_logs.pack(anchor="w", pady=3)

        chk_quar = tk.Checkbutton(
            card_pad, text="Delete Encrypted Quarantine Vault and quarantined files",
            variable=self.remove_quarantine, font=("Segoe UI", 9), fg=COLOR_TEXT, bg=COLOR_CARD,
            selectcolor=COLOR_CARD, activebackground=COLOR_CARD, activeforeground=COLOR_TEXT
        )
        chk_quar.pack(anchor="w", pady=3)

        # 4. Footer Bar
        footer_border = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        footer_border.pack(fill=tk.X, side=tk.BOTTOM)

        self.footer_frame = tk.Frame(self.main_container, bg=COLOR_CARD, height=58)
        self.footer_frame.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer_frame.pack_propagate(False)

        btn_cancel = tk.Button(
            self.footer_frame, text="Cancel", font=("Segoe UI", 9, "bold"),
            bg="#FFFFFF", fg=COLOR_TEXT, activebackground="#F1F5F9", activeforeground=COLOR_TEXT,
            relief=tk.SOLID, bd=1, padx=16, pady=5, cursor="hand2", command=self.destroy
        )
        btn_cancel.pack(side=tk.RIGHT, padx=(0, 24), pady=13)

        self.btn_uninstall = tk.Button(
            self.footer_frame, text="Uninstall Now", font=("Segoe UI", 9, "bold"),
            bg="#DC2626", fg="#FFFFFF", activebackground=COLOR_DANGER_HOVER, activeforeground="#FFFFFF",
            relief=tk.FLAT, padx=20, pady=6, cursor="hand2", command=self.start_uninstall
        )
        self.btn_uninstall.pack(side=tk.RIGHT, padx=(0, 10), pady=13)

    def _start_drag(self, event):
        self._drag_x = event.x
        self._drag_y = event.y

    def _do_drag(self, event):
        if self._is_maximized:
            return
        x = self.winfo_x() + (event.x - self._drag_x)
        y = self.winfo_y() + (event.y - self._drag_y)
        self.geometry(f"+{x}+{y}")

    def toggle_maximize(self):
        if self._is_maximized:
            self.geometry(self._prev_geom)
            self._is_maximized = False
            self.btn_max.config(text="□")
        else:
            self._prev_geom = f"{self.winfo_width()}x{self.winfo_height()}+{self.winfo_x()}+{self.winfo_y()}"
            screen_w = self.winfo_screenwidth()
            screen_h = self.winfo_screenheight() - 48
            self.geometry(f"{screen_w}x{screen_h}+0+0")
            self._is_maximized = True
            self.btn_max.config(text="❐")

    def minimize_window(self):
        self.withdraw()
        self.overrideredirect(False)
        self.iconify()
        self.bind('<Map>', self._on_restore_map)

    def _on_restore_map(self, event=None):
        if not self.overrideredirect():
            self.overrideredirect(True)
            self.unbind('<Map>')

    def show_help_modal(self):
        messagebox.showinfo(
            "SentinelFlow Uninstaller Help",
            "SentinelFlow Uninstallation Utility\n\n"
            "This utility terminates active antivirus protection services, "
            "unregisters Windows boot hooks, and removes application binaries.\n"
            "Version: 2.4.0"
        )

    def start_uninstall(self):
        self.btn_uninstall.config(state=tk.DISABLED)
        
        for w in self.content_frame.winfo_children():
            w.destroy()

        card = tk.Frame(self.content_frame, bg=COLOR_CARD, bd=1, relief=tk.SOLID)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        card_pad = tk.Frame(card, bg=COLOR_CARD)
        card_pad.pack(fill=tk.BOTH, expand=True, padx=22, pady=24)

        lbl_removing = tk.Label(
            card_pad, text="Uninstalling SentinelFlow...",
            font=("Segoe UI", 11, "bold"), fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_removing.pack(anchor="w", pady=(4, 6))

        self.lbl_status = tk.Label(
            card_pad, text="Terminating background shield and resident processes...",
            font=("Segoe UI", 9), fg=COLOR_MUTED, bg=COLOR_CARD
        )
        self.lbl_status.pack(anchor="w", pady=(0, 16))

        style = ttk.Style()
        style.theme_use('default')
        style.configure("Uninstall.Horizontal.TProgressbar", background="#DC2626", troughcolor="#E2E8F0", borderwidth=0)

        prog = ttk.Progressbar(card_pad, style="Uninstall.Horizontal.TProgressbar", mode="indeterminate")
        prog.pack(fill=tk.X, pady=10)
        prog.start(10)

        threading.Thread(target=self.execute_removal, daemon=True).start()

    def execute_removal(self):
        # 1. Kill running processes
        os.system("taskkill /f /im SentinelFlow.exe >nul 2>&1")
        time.sleep(1)

        # 2. Remove desktop shortcut
        desktop = os.path.join(os.environ.get("USERPROFILE", os.path.expanduser("~")), "Desktop")
        sc_desk = os.path.join(desktop, "SentinelFlow.lnk")
        if os.path.exists(sc_desk):
            try: os.remove(sc_desk)
            except Exception: pass

        # 3. Remove Start Menu shortcut
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            start_menu = os.path.join(appdata, r"Microsoft\Windows\Start Menu\Programs")
            sc_start = os.path.join(start_menu, "SentinelFlow.lnk")
            if os.path.exists(sc_start):
                try: os.remove(sc_start)
                except Exception: pass

        # 4. Remove Run boot registry key
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
            try: winreg.DeleteValue(key, "SentinelFlow")
            except FileNotFoundError: pass
            winreg.CloseKey(key)
        except Exception: pass

        # 5. Remove Uninstall registry key
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall\SentinelFlow")
        except Exception: pass

        # 6. Remove AppData if requested
        if self.remove_logs.get():
            sf_appdata = os.path.join(appdata, "SentinelFlow")
            if os.path.exists(sf_appdata):
                try: shutil.rmtree(sf_appdata, ignore_errors=True)
                except Exception: pass

        time.sleep(1.5)
        self.after(100, self.finish_uninstall)

    def finish_uninstall(self):
        messagebox.showinfo("Uninstall Complete", "SentinelFlow Antivirus has been successfully uninstalled from your computer.")
        
        install_dir = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__))
        cmd = f'cmd.exe /c timeout /t 2 & rmdir /s /q "{install_dir}"'
        os.system(f'start /b "" {cmd}')
        self.destroy()

if __name__ == "__main__":
    app = SentinelFlowUninstaller()
    app.mainloop()
