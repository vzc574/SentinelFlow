import os
import sys
import time
import zipfile
import shutil
import winreg
import ctypes
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

COLOR_BG = "#F5F6F3"
COLOR_CARD = "#FFFFFF"
COLOR_CARD_INNER = "#F8F9FA"
COLOR_ACCENT = "#1F6F68"
COLOR_ACCENT_HOVER = "#175751"
COLOR_TEXT = "#1A202C"
COLOR_MUTED = "#718096"
COLOR_BORDER = "#E2E8F0"
COLOR_DANGER = "#EF4444"

def create_windows_shortcut(target_path, shortcut_path, description="SentinelFlow Antivirus", icon_path=None):
    """Creates a Windows .lnk shortcut using VBScript."""
    vbs_script = f'''
    Set oWS = WScript.CreateObject("WScript.Shell")
    sLinkFile = "{shortcut_path}"
    Set oLink = oWS.CreateShortcut(sLinkFile)
    oLink.TargetPath = "{target_path}"
    oLink.Description = "{description}"
    oLink.WorkingDirectory = "{os.path.dirname(target_path)}"
    '''
    if icon_path and os.path.exists(icon_path):
        vbs_script += f'\noLink.IconLocation = "{icon_path},0"'
    vbs_script += '\noLink.Save'

    temp_vbs = os.path.join(os.environ.get("TEMP", "C:\\Temp"), "create_sf_shortcut.vbs")
    try:
        with open(temp_vbs, "w") as f:
            f.write(vbs_script)
        os.system(f'cscript //nologo "{temp_vbs}"')
        if os.path.exists(temp_vbs):
            os.remove(temp_vbs)
    except Exception as e:
        print(f"[Shortcut Error]: {e}")

class SentinelFlowInstaller(tk.Tk):
    def __init__(self, payload_zip_path):
        super().__init__()
        self.payload_zip_path = payload_zip_path
        self.title("SentinelFlow Antivirus Setup")
        
        # Frameless window matching main application Kaspersky style
        self.overrideredirect(True)
        self.configure(bg=COLOR_BG)

        self._normal_w = 640
        self._normal_h = 490
        x = (self.winfo_screenwidth() // 2) - (self._normal_w // 2)
        y = (self.winfo_screenheight() // 2) - (self._normal_h // 2)
        self.geometry(f'{self._normal_w}x{self._normal_h}+{x}+{y}')

        self._is_maximized = False
        self._prev_geom = f'{self._normal_w}x{self._normal_h}+{x}+{y}'

        local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
        self.install_dir = tk.StringVar(value=os.path.join(local_app, "Programs", "SentinelFlow"))
        self.create_desktop_shortcut = tk.BooleanVar(value=True)
        self.create_start_shortcut = tk.BooleanVar(value=True)
        self.launch_after = tk.BooleanVar(value=True)

        self.current_step = 1
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

        # Left brand info
        brand_frame = tk.Frame(self.titlebar, bg=COLOR_CARD)
        brand_frame.pack(side=tk.LEFT, padx=12, fill=tk.Y)
        brand_frame.bind("<ButtonPress-1>", self._start_drag)
        brand_frame.bind("<B1-Motion>", self._do_drag)

        lbl_shield = tk.Label(brand_frame, text="🛡️", font=("Segoe UI", 10), bg=COLOR_CARD, fg=COLOR_ACCENT)
        lbl_shield.pack(side=tk.LEFT, padx=(0, 6))

        lbl_title = tk.Label(
            brand_frame, text="SentinelFlow Setup",
            font=("Segoe UI", 9, "bold"), fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_title.pack(side=tk.LEFT)

        lbl_tag = tk.Label(
            brand_frame, text="Setup Wizard", font=("Segoe UI", 7, "bold"),
            fg=COLOR_ACCENT, bg="#E6F4F2", padx=6, pady=1
        )
        lbl_tag.pack(side=tk.LEFT, padx=8)

        # Right window controls: ? — □ ✕
        ctrl_frame = tk.Frame(self.titlebar, bg=COLOR_CARD)
        ctrl_frame.pack(side=tk.RIGHT, fill=tk.Y)

        self.btn_close = tk.Label(ctrl_frame, text="✕", font=("Segoe UI", 9), bg=COLOR_CARD, fg=COLOR_MUTED, width=4, cursor="hand2")
        self.btn_close.pack(side=tk.RIGHT, fill=tk.Y)
        self.btn_close.bind("<Button-1>", lambda e: self.on_close_click())
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

        # Thin separator below titlebar
        sep_bar = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        sep_bar.pack(fill=tk.X, side=tk.TOP)

        # 2. Header Banner (Clean Light Styling)
        self.header_frame = tk.Frame(self.main_container, bg=COLOR_CARD, height=65)
        self.header_frame.pack(fill=tk.X, side=tk.TOP)
        self.header_frame.pack_propagate(False)

        self.header_title = tk.Label(
            self.header_frame, 
            text="Install SentinelFlow", 
            font=("Segoe UI", 12, "bold"), 
            fg=COLOR_ACCENT, 
            bg=COLOR_CARD
        )
        self.header_title.pack(anchor="w", padx=24, pady=(12, 1))

        self.header_subtitle = tk.Label(
            self.header_frame, 
            text="Real-Time Protection, Removable Device Auto-Scan & Performance Suite", 
            font=("Segoe UI", 9), 
            fg=COLOR_MUTED, 
            bg=COLOR_CARD
        )
        self.header_subtitle.pack(anchor="w", padx=24)

        header_border = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        header_border.pack(fill=tk.X, side=tk.TOP)

        # 3. Main Content Area
        self.content_frame = tk.Frame(self.main_container, bg=COLOR_BG)
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=24, pady=16)

        # 4. Footer Bar
        footer_border = tk.Frame(self.main_container, bg=COLOR_BORDER, height=1)
        footer_border.pack(fill=tk.X, side=tk.BOTTOM)

        self.footer_frame = tk.Frame(self.main_container, bg=COLOR_CARD, height=58)
        self.footer_frame.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer_frame.pack_propagate(False)

        self.btn_cancel = tk.Button(
            self.footer_frame, text="Cancel", font=("Segoe UI", 9, "bold"),
            bg="#FFFFFF", fg=COLOR_TEXT, activebackground="#F1F5F9", activeforeground=COLOR_TEXT,
            relief=tk.SOLID, bd=1, padx=16, pady=5, cursor="hand2", command=self.on_close_click
        )
        self.btn_cancel.pack(side=tk.RIGHT, padx=(0, 24), pady=13)

        self.btn_next = tk.Button(
            self.footer_frame, text="Install Now", font=("Segoe UI", 9, "bold"),
            bg=COLOR_ACCENT, fg="#FFFFFF", activebackground=COLOR_ACCENT_HOVER, activeforeground="#FFFFFF",
            relief=tk.FLAT, padx=22, pady=6, cursor="hand2", command=self.on_next_click
        )
        self.btn_next.pack(side=tk.RIGHT, padx=(0, 10), pady=13)

        self.render_step_1()

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
            "SentinelFlow Setup Help",
            "SentinelFlow Setup Wizard\n\n"
            "This installer configures real-time threat interception, "
            "automated removable device detection, and system optimization.\n"
            "Version: 2.4.0\n"
            "Publisher: SentinelFlow"
        )

    def on_close_click(self):
        if messagebox.askyesno("Exit Setup", "Are you sure you want to cancel SentinelFlow installation?"):
            self.destroy()

    def clear_content(self):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

    def render_step_1(self):
        self.clear_content()

        card = tk.Frame(self.content_frame, bg=COLOR_CARD, bd=1, relief=tk.SOLID)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        card_pad = tk.Frame(card, bg=COLOR_CARD)
        card_pad.pack(fill=tk.BOTH, expand=True, padx=22, pady=16)

        lbl_welcome = tk.Label(
            card_pad,
            text="Welcome to SentinelFlow Setup",
            font=("Segoe UI", 11, "bold"),
            fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_welcome.pack(anchor="w", pady=(0, 6))

        lbl_desc = tk.Label(
            card_pad,
            text="SentinelFlow provides real-time download scanning, automated removable device\n"
                 "threat isolation, deep heuristics, and system performance acceleration.\n"
                 "Select your destination folder below to begin setup.",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED, bg=COLOR_CARD, justify=tk.LEFT
        )
        lbl_desc.pack(anchor="w", pady=(0, 14))

        lbl_folder = tk.Label(card_pad, text="Destination Folder:", font=("Segoe UI", 9, "bold"), fg=COLOR_TEXT, bg=COLOR_CARD)
        lbl_folder.pack(anchor="w", pady=(4, 4))

        folder_box = tk.Frame(card_pad, bg=COLOR_CARD)
        folder_box.pack(fill=tk.X, pady=(0, 14))

        ent_folder = tk.Entry(
            folder_box, textvariable=self.install_dir, font=("Segoe UI", 9),
            bg=COLOR_CARD_INNER, fg=COLOR_TEXT, insertbackground=COLOR_ACCENT,
            relief=tk.SOLID, bd=1
        )
        ent_folder.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=4, padx=(0, 8))

        btn_browse = tk.Button(
            folder_box, text="Browse...", font=("Segoe UI", 9, "bold"),
            bg="#FFFFFF", fg=COLOR_TEXT, relief=tk.SOLID, bd=1, padx=12, pady=3, cursor="hand2",
            command=self.browse_destination
        )
        btn_browse.pack(side=tk.RIGHT)

        chk_desktop = tk.Checkbutton(
            card_pad, text="Create Desktop Shortcut icon", variable=self.create_desktop_shortcut,
            font=("Segoe UI", 9), fg=COLOR_TEXT, bg=COLOR_CARD, selectcolor=COLOR_CARD,
            activebackground=COLOR_CARD, activeforeground=COLOR_TEXT
        )
        chk_desktop.pack(anchor="w", pady=2)

        chk_start = tk.Checkbutton(
            card_pad, text="Create Start Menu Programs shortcut", variable=self.create_start_shortcut,
            font=("Segoe UI", 9), fg=COLOR_TEXT, bg=COLOR_CARD, selectcolor=COLOR_CARD,
            activebackground=COLOR_CARD, activeforeground=COLOR_TEXT
        )
        chk_start.pack(anchor="w", pady=2)

    def browse_destination(self):
        dest = filedialog.askdirectory(initialdir=self.install_dir.get(), title="Select Install Folder")
        if dest:
            self.install_dir.set(os.path.join(dest, "SentinelFlow"))

    def on_next_click(self):
        if self.current_step == 1:
            self.current_step = 2
            self.btn_next.config(state=tk.DISABLED)
            self.btn_cancel.config(state=tk.DISABLED)
            self.render_step_2_extracting()
            threading.Thread(target=self.perform_installation, daemon=True).start()
        elif self.current_step == 3:
            if self.launch_after.get():
                exe_path = os.path.join(self.install_dir.get(), "SentinelFlow.exe")
                if os.path.exists(exe_path):
                    os.startfile(exe_path)
            self.destroy()

    def render_step_2_extracting(self):
        self.clear_content()

        card = tk.Frame(self.content_frame, bg=COLOR_CARD, bd=1, relief=tk.SOLID)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        card_pad = tk.Frame(card, bg=COLOR_CARD)
        card_pad.pack(fill=tk.BOTH, expand=True, padx=22, pady=24)

        lbl_installing = tk.Label(
            card_pad,
            text="Extracting SentinelFlow Components...",
            font=("Segoe UI", 11, "bold"),
            fg=COLOR_TEXT, bg=COLOR_CARD
        )
        lbl_installing.pack(anchor="w", pady=(4, 6))

        self.lbl_status = tk.Label(
            card_pad,
            text="Copying application binaries and engine resources...",
            font=("Segoe UI", 9),
            fg=COLOR_MUTED, bg=COLOR_CARD
        )
        self.lbl_status.pack(anchor="w", pady=(0, 16))

        style = ttk.Style()
        style.theme_use('default')
        style.configure("Light.Horizontal.TProgressbar", background=COLOR_ACCENT, troughcolor="#E2E8F0", borderwidth=0)

        self.prog_bar = ttk.Progressbar(card_pad, style="Light.Horizontal.TProgressbar", mode="determinate")
        self.prog_bar.pack(fill=tk.X, pady=10)

    def perform_installation(self):
        dest = self.install_dir.get()
        os.makedirs(dest, exist_ok=True)

        try:
            if os.path.exists(self.payload_zip_path):
                with zipfile.ZipFile(self.payload_zip_path, 'r') as zf:
                    file_list = zf.namelist()
                    total = len(file_list)
                    for idx, f in enumerate(file_list):
                        zf.extract(f, dest)
                        percent = int(((idx + 1) / total) * 100)
                        self.prog_bar["value"] = percent
                        self.lbl_status.config(text=f"Extracting: {os.path.basename(f)}")
                        time.sleep(0.01)

            main_exe = os.path.join(dest, "SentinelFlow.exe")
            icon_file = os.path.join(dest, "ui", "assets", "icon.ico")
            desktop_icon_file = os.path.join(dest, "ui", "assets", "icon_transparent.ico")
            if not os.path.exists(desktop_icon_file):
                desktop_icon_file = icon_file
            uninstaller_exe = os.path.join(dest, "uninstall.exe")

            # Create Desktop Shortcut (transparent background icon with pure green symbol)
            if self.create_desktop_shortcut.get():
                desktop = os.path.join(os.environ.get("USERPROFILE", os.path.expanduser("~")), "Desktop")
                shortcut_path = os.path.join(desktop, "SentinelFlow.lnk")
                create_windows_shortcut(main_exe, shortcut_path, "SentinelFlow", desktop_icon_file)

            # Create Start Menu Shortcut
            if self.create_start_shortcut.get():
                appdata = os.environ.get("APPDATA", "")
                if appdata:
                    start_menu = os.path.join(appdata, r"Microsoft\Windows\Start Menu\Programs")
                    shortcut_path = os.path.join(start_menu, "SentinelFlow.lnk")
                    create_windows_shortcut(main_exe, shortcut_path, "SentinelFlow", icon_file)

            # Register in Windows Add/Remove Programs
            self.register_uninstaller(dest, main_exe, icon_file, uninstaller_exe)

            self.after(100, self.render_step_3_finished)

        except Exception as e:
            self.after(100, lambda: messagebox.showerror("Installation Error", f"Failed to install: {e}"))
            self.btn_cancel.config(state=tk.NORMAL)

    def register_uninstaller(self, install_dir, main_exe, icon_file, uninstaller_exe):
        try:
            reg_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\SentinelFlow"
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_path)
            winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "SentinelFlow")
            winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, "2.4.0")
            winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "SentinelFlow Security")

            if os.path.exists(icon_file):
                display_icon = icon_file
            elif os.path.exists(main_exe):
                display_icon = f"{main_exe},0"
            else:
                display_icon = icon_file

            winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, display_icon)
            winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, install_dir)
            if os.path.exists(uninstaller_exe):
                winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, f'"{uninstaller_exe}"')
            else:
                winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, f'cmd.exe /c "rmdir /s /q \\"{install_dir}\\""')
            winreg.CloseKey(key)
        except Exception as e:
            print(f"[Uninstall Reg Error]: {e}")

    def render_step_3_finished(self):
        self.clear_content()
        self.current_step = 3

        card = tk.Frame(self.content_frame, bg=COLOR_CARD, bd=1, relief=tk.SOLID)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        card_pad = tk.Frame(card, bg=COLOR_CARD)
        card_pad.pack(fill=tk.BOTH, expand=True, padx=22, pady=24)

        lbl_done = tk.Label(
            card_pad,
            text="✓ Installation Completed Successfully",
            font=("Segoe UI", 12, "bold"),
            fg=COLOR_ACCENT, bg=COLOR_CARD
        )
        lbl_done.pack(anchor="w", pady=(4, 8))

        lbl_done_desc = tk.Label(
            card_pad,
            text="SentinelFlow Antivirus has been installed on your workstation.\n"
                 "The real-time file drop shield, removable device monitoring, and\n"
                 "system tray background resident service are now active.",
            font=("Segoe UI", 9),
            fg=COLOR_TEXT, bg=COLOR_CARD, justify=tk.LEFT
        )
        lbl_done_desc.pack(anchor="w", pady=(0, 18))

        chk_launch = tk.Checkbutton(
            card_pad, text="Launch SentinelFlow Antivirus now", variable=self.launch_after,
            font=("Segoe UI", 9, "bold"), fg=COLOR_ACCENT, bg=COLOR_CARD, selectcolor=COLOR_CARD,
            activebackground=COLOR_CARD, activeforeground=COLOR_ACCENT
        )
        chk_launch.pack(anchor="w", pady=4)

        self.btn_next.config(text="Finish", state=tk.NORMAL)
        self.btn_cancel.pack_forget()

def launch_installer():
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.abspath(os.path.dirname(__file__))

    payload_zip = os.path.join(base_dir, "app_payload.zip")
    app = SentinelFlowInstaller(payload_zip)
    app.mainloop()

if __name__ == "__main__":
    launch_installer()
