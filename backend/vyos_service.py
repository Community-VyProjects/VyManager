"""
VyOS Service Layer - Modular Version

Uses the new modular mapper and builder structure.
Much cleaner and easier to maintain!
"""

from typing import Optional, Union, Dict, Any, List
from contextlib import contextmanager
import json
import requests as _requests

from pyvyos import VyDevice
from pyvyos.core.rest_client import ApiResponse
import commit_confirm_state
from events.event_manager import event_manager, EVENT_CONFIG_DIFF, EVENT_COMMIT_CONFIRM
from vyos_builders import (
    EthernetBatchBuilder,
    DummyBatchBuilder,
    BondingBatchBuilder,
    GeneveBatchBuilder,
    InputBatchBuilder,
    L2TPv3BatchBuilder,
    LoopbackBatchBuilder,
    MacsecBatchBuilder,
    OpenvpnBatchBuilder,
    PppoeBatchBuilder,
    PseudoEthernetBatchBuilder,
    SstpcBatchBuilder,
    FirewallGroupsBatchBuilder,
    NATBatchBuilder,
    DHCPBatchBuilder,
    WireGuardBatchBuilder,
    SystemPerformanceBatchBuilder,
)


class VyOSDeviceConfig:
    """Configuration for a VyOS device."""

    def __init__(
        self,
        hostname: str,
        apikey: str,
        version: str,
        protocol: str = "https",
        port: int = 443,
        verify: bool = False,
        timeout: int = 10,
        commit_confirm_enabled: bool = False,
        commit_confirm_minutes: int = 5,
        instance_id: str = "",
    ):
        self.hostname = hostname
        self.apikey = apikey
        self.version = version
        self.protocol = protocol
        self.port = port
        self.verify = verify
        self.timeout = timeout
        self.commit_confirm_enabled = commit_confirm_enabled
        self.commit_confirm_minutes = commit_confirm_minutes
        self.instance_id = instance_id


class VyOSService:
    """
    Service for managing VyOS devices with version-aware commands and batching.
    """

    def __init__(self, device_config: VyOSDeviceConfig):
        """Initialize VyOS service."""
        self.config = device_config
        self.device = VyDevice(
            hostname=device_config.hostname,
            apikey=device_config.apikey,
            protocol=device_config.protocol,
            port=device_config.port,
            verify=device_config.verify,
            timeout=device_config.timeout,
        )
        # Cache for full configuration (for read operations)
        self._cached_config: Optional[Dict[str, Any]] = None

    def get_version(self) -> str:
        """Get the VyOS version for this device."""
        return self.config.version

    def create_ethernet_batch(self) -> EthernetBatchBuilder:
        """
        Create a batch builder for ethernet interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return EthernetBatchBuilder(self.config.version)

    def create_dummy_batch(self) -> DummyBatchBuilder:
        """
        Create a batch builder for dummy interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return DummyBatchBuilder(self.config.version)

    def create_input_batch(self) -> InputBatchBuilder:
        """
        Create a batch builder for input (IFB) interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return InputBatchBuilder(self.config.version)

    def create_geneve_batch(self) -> GeneveBatchBuilder:
        """
        Create a batch builder for geneve interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return GeneveBatchBuilder(self.config.version)

    def create_l2tpv3_batch(self) -> L2TPv3BatchBuilder:
        """
        Create a batch builder for L2TPv3 interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return L2TPv3BatchBuilder(self.config.version)

    def create_loopback_batch(self) -> LoopbackBatchBuilder:
        """
        Create a batch builder for loopback interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return LoopbackBatchBuilder(self.config.version)

    def create_macsec_batch(self) -> MacsecBatchBuilder:
        """
        Create a batch builder for MACsec interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return MacsecBatchBuilder(self.config.version)

    def create_openvpn_batch(self) -> OpenvpnBatchBuilder:
        """
        Create a batch builder for OpenVPN interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return OpenvpnBatchBuilder(self.config.version)

    def create_pppoe_batch(self) -> PppoeBatchBuilder:
        """
        Create a batch builder for PPPoE interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return PppoeBatchBuilder(self.config.version)

    def create_pseudo_ethernet_batch(self) -> PseudoEthernetBatchBuilder:
        """
        Create a batch builder for pseudo-ethernet (MacVLAN) interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return PseudoEthernetBatchBuilder(self.config.version)

    def create_sstpc_batch(self) -> SstpcBatchBuilder:
        """
        Create a batch builder for SSTPC interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return SstpcBatchBuilder(self.config.version)

    def create_bonding_batch(self) -> BondingBatchBuilder:
        """
        Create a batch builder for bonding interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return BondingBatchBuilder(self.config.version)

    def create_firewall_groups_batch(self) -> FirewallGroupsBatchBuilder:
        """
        Create a batch builder for firewall groups.

        The builder automatically uses correct command syntax based on version.
        """
        return FirewallGroupsBatchBuilder(self.config.version)

    def create_nat_batch(self) -> NATBatchBuilder:
        """
        Create a batch builder for NAT configuration.

        The builder automatically uses correct command syntax based on version.
        """
        return NATBatchBuilder(self.config.version)

    def create_system_performance_batch(self) -> SystemPerformanceBatchBuilder:
        """
        Create a batch builder for system option performance.
        Version-aware (1.4: throughput/latency; 1.5: five profiles).
        """
        return SystemPerformanceBatchBuilder(self.config.version)

    def execute_batch(
        self,
        batch: Union[
            EthernetBatchBuilder,
            DummyBatchBuilder,
            InputBatchBuilder,
            FirewallGroupsBatchBuilder,
            NATBatchBuilder,
            DHCPBatchBuilder,
            WireGuardBatchBuilder,
            SystemPerformanceBatchBuilder,
            LoopbackBatchBuilder,
            MacsecBatchBuilder,
            OpenvpnBatchBuilder,
            PppoeBatchBuilder,
        ],
    ) -> ApiResponse:
        """Execute a batch of operations using configure_multiple_op.

        If commit-confirm is enabled for this instance (and the VyOS version
        supports it), the batch is executed with a rollback timer automatically.
        No router changes are needed — the feature is fully transparent.
        """
        if self.config.commit_confirm_enabled and self.config.instance_id:
            return self.execute_batch_with_confirm(batch, self.config.instance_id)

        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")

        operations = batch.get_operations()
        response = self.device.configure_multiple_op(op_path=operations)
        if response.status == 200 and self.config.instance_id:
            event_manager.emit(self.config.instance_id, EVENT_CONFIG_DIFF, None)
        return response

    def execute_batch_with_confirm(
        self,
        batch,
        instance_id: str,
        confirm_time_minutes: int = 5,
        action: str = "reload",
    ) -> ApiResponse:
        """
        Execute a batch using VyOS commit-confirm.

        Applies operations to the running config with an automatic rollback
        timer. The caller must confirm via confirm_commit() before the timer
        expires, otherwise VyOS will revert the changes.

        Raises:
            HTTPException 409: If a commit-confirm is already active for this instance.
            ValueError: If the batch is empty.
        """
        from fastapi import HTTPException

        # Fall back to regular commit if feature is disabled or VyOS version
        # doesn't support commit-confirm (requires 1.5+).
        version = self.config.version or ""
        supports_commit_confirm = "1.5" in version or "1.6" in version
        if not self.config.commit_confirm_enabled or not supports_commit_confirm:
            return self.execute_batch(batch)

        if commit_confirm_state.is_active(instance_id):
            session = commit_confirm_state.get_active(instance_id)
            raise HTTPException(
                status_code=409,
                detail=(
                    f"A commit-confirm is already active for this instance. "
                    f"Please confirm or wait {session.seconds_remaining()} seconds for it to expire."
                ),
            )

        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")

        # Use the per-instance configured confirm time
        confirm_time_minutes = self.config.commit_confirm_minutes

        operations = batch.get_operations()

        # Step 1: Execute all operations as a normal atomic batch.
        batch_response = self.device.configure_multiple_op(op_path=operations)
        if batch_response.status != 200:
            return batch_response

        # Step 2: Arm the commit-confirm rollback timer.
        #
        # VyOS only arms the rollback when confirm_time is inside a SINGLE
        # operation JSON object (not an array). Sending the last operation again
        # as a single object with confirm_time is idempotent (set is a no-op if
        # already set; delete is a no-op if already deleted) and properly arms
        # the timer so VyOS will revert if the user doesn't confirm in time.
        last_op = {**operations[-1], "confirm_time": confirm_time_minutes}
        url = f"{self.config.protocol}://{self.config.hostname}:{self.config.port}/configure"
        payload = {
            "data": json.dumps(last_op),
            "key": self.config.apikey,
        }

        try:
            resp = _requests.post(
                url,
                data=payload,
                verify=self.config.verify,
                timeout=self.config.timeout,
            )
            resp.raise_for_status()
            body = resp.json()
            if body.get("success"):
                commit_confirm_state.set_active(instance_id, confirm_time_minutes, action)
                event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
                event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
                return ApiResponse(status=200, request={}, result=body.get("data") or {}, error=False)
            else:
                error_msg = body.get("error", "Unknown error from VyOS API")
                return ApiResponse(status=400, request={}, result={}, error=error_msg)
        except _requests.exceptions.Timeout:
            return ApiResponse(status=504, request={}, result={}, error="Request timed out")
        except _requests.exceptions.RequestException as exc:
            return ApiResponse(status=503, request={}, result={}, error=str(exc))

    def confirm_commit(self, instance_id: str) -> ApiResponse:
        """
        Confirm an active commit-confirm session, stopping the rollback timer.

        Raises:
            HTTPException 409: If no active commit-confirm session exists.
        """
        from fastapi import HTTPException

        if not commit_confirm_state.is_active(instance_id):
            raise HTTPException(
                status_code=409,
                detail="No active commit-confirm session for this instance.",
            )

        # Tested format: confirm goes to /config-file with op: confirm
        url = f"{self.config.protocol}://{self.config.hostname}:{self.config.port}/config-file"
        payload = {
            "data": json.dumps({"op": "confirm"}),
            "key": self.config.apikey,
        }

        try:
            resp = _requests.post(
                url,
                data=payload,
                verify=self.config.verify,
                timeout=self.config.timeout,
            )
            resp.raise_for_status()
            body = resp.json()
            if body.get("success"):
                commit_confirm_state.clear(instance_id)
                event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
                event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
                return ApiResponse(status=200, request={}, result=body.get("data") or {}, error=False)
            else:
                error_msg = body.get("error", "Unknown error from VyOS API")
                return ApiResponse(status=400, request={}, result={}, error=error_msg)
        except _requests.exceptions.Timeout:
            return ApiResponse(status=504, request={}, result={}, error="Request timed out")
        except _requests.exceptions.RequestException as exc:
            return ApiResponse(status=503, request={}, result={}, error=str(exc))

    def configure_batch(self, commands: List[str]) -> Dict[str, Any]:
        """
        Execute a batch of VyOS configuration commands.

        Args:
            commands: List of VyOS command strings
                     (e.g., ["set firewall group address-group TEST", "set firewall group address-group TEST description 'Test'"])

        Returns:
            Dictionary with success status and optional error message

        Example:
            >>> commands = ["set firewall group address-group TEST", "set firewall group address-group TEST address 10.0.0.1"]
            >>> result = service.configure_batch(commands)
            >>> result["success"]
            True
        """
        if not commands:
            return {"success": False, "error": "No commands provided"}

        try:
            # Parse commands into operations for configure_multiple_op
            operations = []
            for cmd in commands:
                # Parse command string (e.g., "set firewall group address-group TEST description 'value'")
                parts = cmd.split(maxsplit=1)
                if len(parts) < 2:
                    continue

                op_type = parts[0]  # "set" or "delete"
                path_str = parts[1]  # "firewall group address-group TEST description 'value'"

                # Parse the path, handling quoted values
                path_parts = []
                current = ""
                in_quotes = False
                quote_char = None

                for char in path_str:
                    if char in ("'", '"') and not in_quotes:
                        in_quotes = True
                        quote_char = char
                    elif char == quote_char and in_quotes:
                        in_quotes = False
                        quote_char = None
                        if current:
                            path_parts.append(current)
                            current = ""
                    elif char == " " and not in_quotes:
                        if current:
                            path_parts.append(current)
                            current = ""
                    else:
                        current += char

                if current:
                    path_parts.append(current)

                operations.append({"op": op_type, "path": path_parts})

            # Execute using configure_multiple_op
            if operations:
                response = self.device.configure_multiple_op(op_path=operations)

                if response.status == 200:
                    # Handle empty string responses from VyOS
                    result_data = response.result if response.result and response.result != '' else None
                    return {"success": True, "data": result_data}
                else:
                    error_msg = response.error if response.error else "Unknown error"
                    return {"success": False, "error": error_msg}
            else:
                return {"success": False, "error": "No valid operations parsed from commands"}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_full_config(self, refresh: bool = False) -> Dict[str, Any]:
        """
        Get the full VyOS configuration (cached for performance).

        This method retrieves the entire configuration once and caches it.
        Subsequent calls return the cached version unless refresh=True.

        Args:
            refresh: If True, force refresh from VyOS device

        Returns:
            Full configuration dictionary

        Example:
            >>> config = service.get_full_config()
            >>> ethernet_config = config.get("interfaces", {}).get("ethernet", {})
        """
        # Return cached config if available and not forcing refresh
        if self._cached_config is not None and not refresh:
            return self._cached_config

        # Fetch full config using pyvyos show() with JSON output
        response = self.device.show(path=["configuration", "json", "pretty"])

        if response.status != 200:
            error_msg = response.error if response.error else "Unknown error"
            raise ValueError(f"Failed to retrieve full config: {error_msg}")

        # Parse JSON from result
        import json
        # response.result is already the JSON string
        config_json = response.result

        try:
            self._cached_config = json.loads(config_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse configuration JSON: {e}")

        return self._cached_config

    def refresh_config(self) -> Dict[str, Any]:
        """
        Force refresh of the cached configuration from VyOS.

        Returns:
            Refreshed full configuration dictionary
        """
        return self.get_full_config(refresh=True)

    def config_file_save(self, file: Optional[str] = None) -> ApiResponse:
        """
        Save the running configuration to a file.

        This calls VyOS's config-file save operation to write the running
        configuration to persistent storage (typically /config/config.boot).

        Args:
            file: Optional path to save config to. If None, saves to default location.

        Returns:
            ApiResponse: Response from the VyOS API

        Example:
            >>> service.config_file_save()
            >>> service.config_file_save(file="/config/backup.boot")
        """
        return self.device.config_file_save(file=file)

    def show_config(self, path: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Retrieve configuration from VyOS using pyvyos.

        DEPRECATED: Use get_full_config() for read operations instead.
        This method is kept for backward compatibility.

        Args:
            path: Configuration path as list (e.g., ['interfaces', 'ethernet'])
                  If None, retrieves entire configuration

        Returns:
            Configuration data as dictionary

        Example:
            >>> service.show_config(["interfaces", "ethernet"])
            {'eth0': {'address': ['10.0.0.1/24'], 'description': 'WAN'}}
        """
        # Use pyvyos retrieve_show_config with path parameter
        response = self.device.retrieve_show_config(path=path)

        if response.status != 200:
            error_msg = response.error if response.error else "Unknown error"
            raise ValueError(f"Failed to retrieve config: {error_msg}")

        return response.result.get("data", {})


class VyOSDeviceRegistry:
    """Registry for managing multiple VyOS devices."""

    def __init__(self):
        self._devices = {}

    def register(self, name: str, config: VyOSDeviceConfig) -> None:
        """Register a VyOS device."""
        self._devices[name] = VyOSService(config)

    def get(self, name: str) -> VyOSService:
        """Get a registered VyOS service by name."""
        if name not in self._devices:
            raise KeyError(f"Device '{name}' not found in registry")
        return self._devices[name]

    def unregister(self, name: str) -> None:
        """Unregister a device."""
        self._devices.pop(name, None)

    def list_devices(self) -> list:
        """Get list of registered device names."""
        return list(self._devices.keys())

    def clear(self) -> None:
        """Clear all registered devices."""
        self._devices.clear()
