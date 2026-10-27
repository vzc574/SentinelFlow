import os
import time
import threading
from typing import Callable, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from core.scanner import scanner_engine
from core.quarantine import quarantine_manager
from core.config import config_manager
from core.notifier import notify_user
from core.history_logger import history_logger

class DownloadSecurityHandler(FileSystemEventHandler):
    def __init__(self, on_threat_detected: Optional[Callable] = None):
        super().__init__()
        self.on_threat_detected = on_threat_detected
        self.processed_files = set()

    def on_created(self, event):
        if event.is_directory:
            return
        if config_manager.get("realtime_scan_on_create", True):
            self._check_file(event.src_path, trigger_event="DOWNLOAD_DROP")

    def on_modified(self, event):
        if event.is_directory:
            return
        if config_manager.get("realtime_scan_on_modify", True):
            self._check_file(event.src_path, trigger_event="FILE_MODIFY")

    def _check_file(self, file_path: str, trigger_event: str = "DOWNLOAD_DROP"):
        ext = os.path.splitext(file_path)[1].lower()
        if ext in [".crdownload", ".part", ".tmp", ".download", ".sfq"]:
            return

        time.sleep(0.3)

        if not os.path.exists(file_path):
            return

        try:
            mtime = os.path.getmtime(file_path)
            cache_key = f"{file_path}_{mtime}"
            if cache_key in self.processed_files:
                return
            self.processed_files.add(cache_key)

            # Log inspection
            file_name = os.path.basename(file_path)
            
            threat = scanner_engine.scan_file(file_path)
            if threat:
                threat_dict = threat.to_dict()

                # Quarantine threat immediately
                quarantine_manager.quarantine_file(
                    file_path=file_path,
                    threat_name=threat.threat_name,
                    threat_type=threat.threat_type
                )

                # Update stats
                config_manager.update_stats(threats_blocked=1)

                # Send Windows system notification
                notify_user(
                    title="Malicious Download Neutralized",
                    message=f"SentinelFlow intercepted '{file_name}'. Identified as {threat.threat_name}. File moved to Quarantine.",
                    threat=True
                )

                # Audit log
                history_logger.log(
                    event_type="THREAT_INTERCEPT",
                    title=f"Malicious Download Intercepted: {threat.threat_name}",
                    details=f"File '{file_name}' ({threat.threat_type} - {threat.severity}) was intercepted and moved to Quarantine Vault.",
                    severity="CRITICAL",
                    target_path=file_path
                )

                # Trigger UI callback
                if self.on_threat_detected:
                    self.on_threat_detected(threat_dict)
            else:
                # Log benign download if in Downloads directory
                if "downloads" in file_path.lower() and ext in [".exe", ".msi", ".zip", ".bat", ".ps1", ".scr", ".dll"]:
                    history_logger.log(
                        event_type="DOWNLOAD_VERIFIED",
                        title=f"Download Verified Clean: {file_name}",
                        details=f"Downloaded file '{file_name}' was inspected and verified safe by SentinelFlow.",
                        severity="SUCCESS",
                        target_path=file_path
                    )

        except Exception as e:
            print(f"[RealTime] Error checking file {file_path}: {e}")

class RealTimeGuard:
    def __init__(self):
        self.observer: Optional[Observer] = None
        self.is_running = False
        self.event_handler: Optional[DownloadSecurityHandler] = None
        self.on_threat_callback: Optional[Callable] = None

    def start(self, on_threat_detected: Optional[Callable] = None):
        if self.is_running:
            return

        self.on_threat_callback = on_threat_detected
        self.event_handler = DownloadSecurityHandler(on_threat_detected=self._on_threat)
        self.observer = Observer()

        user_profile = os.environ.get('USERPROFILE', os.path.expanduser('~'))
        watch_dirs = [
            os.path.join(user_profile, 'Downloads'),
            os.path.join(user_profile, 'Desktop'),
            os.environ.get('TEMP', ''),
        ]

        active_watches = 0
        for wdir in watch_dirs:
            if wdir and os.path.exists(wdir):
                try:
                    self.observer.schedule(self.event_handler, path=wdir, recursive=True)
                    active_watches += 1
                except Exception as e:
                    print(f"[RealTime] Could not watch {wdir}: {e}")

        if active_watches > 0:
            self.observer.start()
            self.is_running = True
            history_logger.log(
                event_type="SHIELD_ENABLED",
                title="Real-Time Protection Guard Enabled",
                details=f"Resident interceptor active on {active_watches} system locations (Downloads, Desktop, Temp).",
                severity="INFO"
            )

    def stop(self):
        if self.observer and self.is_running:
            self.observer.stop()
            self.observer.join(timeout=2)
            self.is_running = False
            history_logger.log(
                event_type="SHIELD_DISABLED",
                title="Real-Time Protection Guard Disabled",
                details="Background file system interceptor was disabled by user.",
                severity="WARNING"
            )

    def _on_threat(self, threat_dict: dict):
        if self.on_threat_callback:
            self.on_threat_callback(threat_dict)

realtime_guard = RealTimeGuard()
