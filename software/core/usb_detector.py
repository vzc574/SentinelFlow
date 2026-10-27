import os
import time
import string
import ctypes
from ctypes import wintypes
import threading
from typing import Callable, Optional, Set, List, Dict
import psutil

from core.notifier import notify_user
from core.config import config_manager

DRIVE_UNKNOWN = 0
DRIVE_NO_ROOT_DIR = 1
DRIVE_REMOVABLE = 2
DRIVE_FIXED = 3
DRIVE_REMOTE = 4
DRIVE_CDROM = 5
DRIVE_RAMDISK = 6

IOCTL_STORAGE_QUERY_PROPERTY = 0x002D1400
BUS_TYPE_USB = 7

class STORAGE_PROPERTY_QUERY(ctypes.Structure):
    _fields_ = [
        ('PropertyId', wintypes.DWORD),
        ('QueryType', wintypes.DWORD),
        ('AdditionalParameters', wintypes.BYTE * 1)
    ]

def is_usb_bus_device(letter: str) -> bool:
    """Queries Windows IOCTL to determine if the drive bus interface is USB."""
    try:
        clean_letter = letter.replace(':', '').replace('\\', '').replace('/', '').strip()
        if not clean_letter:
            return False
        
        drive_path = f"\\\\.\\{clean_letter}:"
        FILE_SHARE_READ = 0x00000001
        FILE_SHARE_WRITE = 0x00000002
        OPEN_EXISTING = 3
        
        handle = ctypes.windll.kernel32.CreateFileW(
            drive_path,
            0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            0,
            None
        )
        if handle == -1 or handle == 0xFFFFFFFFFFFFFFFF:
            return False
        
        query = STORAGE_PROPERTY_QUERY(0, 0)
        buf = ctypes.create_string_buffer(1024)
        returned = wintypes.DWORD()
        
        success = ctypes.windll.kernel32.DeviceIoControl(
            handle,
            IOCTL_STORAGE_QUERY_PROPERTY,
            ctypes.byref(query),
            ctypes.sizeof(query),
            buf,
            ctypes.sizeof(buf),
            ctypes.byref(returned),
            None
        )
        ctypes.windll.kernel32.CloseHandle(handle)
        
        if success and returned.value >= 29:
            # BusType is at byte offset 28 of STORAGE_DEVICE_DESCRIPTOR
            bus_type = buf.raw[28]
            return bus_type == BUS_TYPE_USB
    except Exception:
        pass
    return False

def get_volume_label(drive_path: str) -> str:
    """Retrieves the Windows volume label for a drive (e.g. 'Ventoy', 'SanDisk')."""
    try:
        vol_buf = ctypes.create_unicode_buffer(260)
        fs_buf = ctypes.create_unicode_buffer(260)
        res = ctypes.windll.kernel32.GetVolumeInformationW(
            drive_path, vol_buf, 260, None, None, None, fs_buf, 260
        )
        if res and vol_buf.value:
            return vol_buf.value.strip()
    except Exception:
        pass
    return ""

def get_all_logical_drive_letters() -> Set[str]:
    """Retrieves all currently mounted logical drive letters."""
    drives = set()
    try:
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for idx, letter in enumerate(string.ascii_uppercase):
            if (bitmask >> idx) & 1:
                drives.add(f"{letter}:\\")
    except Exception:
        for part in psutil.disk_partitions(all=True):
            drives.add(part.device)
    return drives

def is_removable_or_external_drive(drive_path: str) -> bool:
    """Robust multi-vector check for removable, flash, or external USB storage."""
    letter = drive_path[0].upper()
    # System root drive is never considered removable
    sys_drive = os.environ.get('SystemDrive', 'C:').upper()
    if letter == sys_drive[0]:
        return False
        
    try:
        dtype = ctypes.windll.kernel32.GetDriveTypeW(ctypes.c_wchar_p(drive_path))
        if dtype == DRIVE_REMOVABLE:
            return True
        if dtype == DRIVE_CDROM:
            return False
    except Exception:
        dtype = DRIVE_UNKNOWN

    # Hardware IOCTL check for USB Bus Type
    if is_usb_bus_device(letter):
        return True

    # psutil mount options check
    try:
        for part in psutil.disk_partitions(all=True):
            if part.device.upper().startswith(f"{letter}:"):
                if 'removable' in part.opts.lower():
                    return True
    except Exception:
        pass

    return False

class RemovableDeviceDetector:
    def __init__(self):
        self.is_running = False
        self.detector_thread: Optional[threading.Thread] = None
        self.on_device_connected: Optional[Callable] = None
        self.on_device_disconnected: Optional[Callable] = None
        self.known_drives: Set[str] = set()

    def get_connected_removable_drives(self) -> List[Dict[str, str]]:
        """Returns all currently connected removable or USB storage devices."""
        removable_list = []
        for drive in sorted(get_all_logical_drive_letters()):
            if is_removable_or_external_drive(drive):
                label = get_volume_label(drive)
                removable_list.append({
                    "drive": drive,
                    "label": label or "Removable Disk",
                    "display": f"{label} ({drive})" if label else f"Removable Storage ({drive})"
                })
        return removable_list

    def start(self, on_device_connected: Optional[Callable] = None, on_device_disconnected: Optional[Callable] = None):
        if self.is_running:
            return

        self.on_device_connected = on_device_connected
        self.on_device_disconnected = on_device_disconnected
        self.is_running = True
        
        # Take initial snapshot of mounted drives
        self.known_drives = get_all_logical_drive_letters()

        self.detector_thread = threading.Thread(target=self._monitor_loop, daemon=True, name="SentinelFlow-USBDetector")
        self.detector_thread.start()

    def _monitor_loop(self):
        while self.is_running:
            if config_manager.get("usb_detection", True):
                try:
                    current_drives = get_all_logical_drive_letters()
                    
                    # Detect newly inserted drives
                    added_drives = current_drives - self.known_drives
                    valid_removable = []
                    for drive in added_drives:
                        if is_removable_or_external_drive(drive):
                            size_mb = 0
                            try:
                                size_mb = psutil.disk_usage(drive).total / (1024 * 1024)
                            except Exception:
                                pass
                            valid_removable.append((drive, size_mb))

                    # Sort largest partition first
                    valid_removable.sort(key=lambda x: x[1], reverse=True)
                    has_large_storage = any(sz > 500 for _, sz in valid_removable)

                    for drive, sz in valid_removable:
                        # Skip tiny auxiliary EFI boot partitions (<100MB) on multi-partition USB sticks
                        if has_large_storage and sz < 100:
                            continue

                        label = get_volume_label(drive)
                        display_name = f"{label} ({drive})" if label else f"USB Storage ({drive})"
                        
                        device_info = {
                            "drive": drive,
                            "label": label,
                            "display_name": display_name,
                            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                        }
                        
                        if self.on_device_connected:
                            self.on_device_connected(device_info)

                    # Detect removed drives so re-insertions are caught immediately
                    removed_drives = self.known_drives - current_drives
                    for drive in removed_drives:
                        if self.on_device_disconnected:
                            self.on_device_disconnected({"drive": drive})

                    self.known_drives = current_drives
                except Exception as e:
                    print(f"[USB Detector] Error in monitoring cycle: {e}")
            
            time.sleep(1.0)

    def stop(self):
        self.is_running = False

usb_detector = RemovableDeviceDetector()
