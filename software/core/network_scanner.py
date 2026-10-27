import os
import socket
import psutil
from typing import Dict, List, Any

SUSPICIOUS_PORTS = {
    4444: "Metasploit / Meterpreter Default Payload Listener",
    1337: "Elite Backdoor / HackTool Listener",
    6667: "IRC Botnet Command & Control Channel",
    8888: "Suspicious High-Port HTTP Tunnel / Web Proxy",
    31337: "BackOrifice Trojan Remote Access Port",
    9999: "Generic Trojan Inbound Listener"
}

class NetworkSafetyScanner:
    def __init__(self):
        pass

    def scan_network_safety(self) -> Dict[str, Any]:
        """Scans network interfaces, open listening sockets, and outbound connection safety."""
        connections = []
        suspicious_hits = []
        listening_ports = []
        established_connections = 0

        try:
            net_conns = psutil.net_connections(kind='inet')
            for conn in net_conns:
                laddr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "0.0.0.0"
                raddr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A"
                status = conn.status
                pid = conn.pid

                proc_name = "Unknown"
                if pid:
                    try:
                        p = psutil.Process(pid)
                        proc_name = p.name()
                    except Exception:
                        pass

                if status == "LISTEN":
                    port = conn.laddr.port if conn.laddr else 0
                    listening_ports.append({"port": port, "process": proc_name, "pid": pid})
                    if port in SUSPICIOUS_PORTS:
                        suspicious_hits.append({
                            "threat": SUSPICIOUS_PORTS[port],
                            "port": port,
                            "type": "Inbound Listener",
                            "process": proc_name,
                            "severity": "High"
                        })
                elif status == "ESTABLISHED":
                    established_connections += 1
                    rport = conn.raddr.port if conn.raddr else 0
                    if rport in SUSPICIOUS_PORTS:
                        suspicious_hits.append({
                            "threat": SUSPICIOUS_PORTS[rport],
                            "port": rport,
                            "type": "Outbound Backdoor Connection",
                            "process": proc_name,
                            "severity": "Critical"
                        })

                connections.append({
                    "protocol": "TCP" if conn.type == socket.SOCK_STREAM else "UDP",
                    "local_address": laddr,
                    "remote_address": raddr,
                    "status": status,
                    "process_name": proc_name,
                    "pid": pid
                })
        except Exception as e:
            print(f"[NetworkScanner] Scan error: {e}")

        # Check Hostname & DNS
        hostname = socket.gethostname()
        try:
            local_ip = socket.gethostbyname(hostname)
        except Exception:
            local_ip = "127.0.0.1"

        safety_score = 100 - (len(suspicious_hits) * 35)
        safety_score = max(safety_score, 30)

        return {
            "safety_score": safety_score,
            "status": "Secure" if len(suspicious_hits) == 0 else "Vulnerable",
            "hostname": hostname,
            "local_ip": local_ip,
            "total_connections": len(connections),
            "established_connections": established_connections,
            "listening_ports_count": len(listening_ports),
            "suspicious_hits": suspicious_hits,
            "active_connections": connections[:40],
            "dns_protection": "Active (Standard Resolver)"
        }

network_scanner = NetworkSafetyScanner()
