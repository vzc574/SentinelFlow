import os
import psutil
from typing import List, Dict, Any

class ProcessManager:
    def __init__(self):
        pass

    def get_running_processes(self) -> List[Dict[str, Any]]:
        """Gathers all active processes with CPU, RAM, and path metadata."""
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'status', 'exe', 'username']):
            try:
                mem_mb = round(p.info['memory_info'].rss / (1024 * 1024), 1) if p.info.get('memory_info') else 0.0
                cpu = p.info.get('cpu_percent') or 0.0
                exe_path = p.info.get('exe') or ""

                procs.append({
                    "pid": p.info['pid'],
                    "name": p.info['name'],
                    "cpu_percent": round(cpu, 1),
                    "memory_mb": mem_mb,
                    "status": p.info.get('status') or "running",
                    "exe_path": exe_path,
                    "username": p.info.get('username') or "System"
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        procs.sort(key=lambda x: x["memory_mb"], reverse=True)
        return procs

    def terminate_process(self, pid: int) -> bool:
        """Terminates an unwanted or resource-heavy background process."""
        try:
            p = psutil.Process(pid)
            p.terminate()
            p.wait(timeout=1.5)
            return True
        except Exception:
            try:
                p = psutil.Process(pid)
                p.kill()
                return True
            except Exception as e:
                print(f"[ProcessManager] Error terminating PID {pid}: {e}")
                return False

process_manager = ProcessManager()
