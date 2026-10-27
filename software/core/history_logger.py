import os
import json
import time
import csv
from typing import List, Dict, Any, Optional

class HistoryLogger:
    def __init__(self):
        self.app_data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'SentinelFlow')
        os.makedirs(self.app_data_dir, exist_ok=True)
        self.log_path = os.path.join(self.app_data_dir, 'history_log.json')
        self.events: List[Dict[str, Any]] = self._load_events()

    def _load_events(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[HistoryLogger] Error loading history: {e}")
        return []

    def _save_events(self):
        try:
            with open(self.log_path, 'w', encoding='utf-8') as f:
                json.dump(self.events, f, indent=4)
        except Exception as e:
            print(f"[HistoryLogger] Error saving history: {e}")

    def log(self, event_type: str, title: str, details: str = "", severity: str = "INFO", target_path: str = ""):
        event = {
            "id": int(time.time() * 1000),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": event_type,
            "title": title,
            "details": details,
            "severity": severity,  # CRITICAL, WARNING, INFO, SUCCESS
            "target_path": target_path
        }
        self.events.insert(0, event)
        # Retain last 2000 events
        if len(self.events) > 2000:
            self.events = self.events[:2000]
        self._save_events()
        return event

    def get_all(self) -> List[Dict[str, Any]]:
        return self.events

    def clear(self):
        self.events = []
        self._save_events()

    def export_to_csv(self, dest_path: str) -> bool:
        try:
            with open(dest_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ["id", "timestamp", "event_type", "severity", "title", "details", "target_path"]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                for e in self.events:
                    writer.writerow(e)
            return True
        except Exception as e:
            print(f"[HistoryLogger] CSV export error: {e}")
            return False

history_logger = HistoryLogger()
