"""
VyOS Service Layer - Modular Version

Uses the new modular mapper and builder structure.
Much cleaner and easier to maintain!
"""

from typing import Optional, Union, Dict, Any, List
import json
import logging
import requests as _requests

from pyvyos import VyDevice
from pyvyos.core.rest_client import ApiResponse
import commit_confirm_state
from config_state import clear_managed_config, record_failed_commit, set_managed_config
from events.event_manager import event_manager, EVENT_CONFIG_DIFF, EVENT_COMMIT_CONFIRM
from vyos_builders.dhcp_server import DHCPServerBatchBuilder
from vyos_builders.firewall import FirewallGroupsBatchBuilder
from vyos_builders.interfaces import (
    EthernetInterfaceBuilderMixin,
    DummyInterfaceBuilderMixin,
    GeneveInterfaceBuilderMixin,
    InputInterfaceBuilderMixin,
    L2TPv3InterfaceBuilderMixin,
    LoopbackInterfaceBuilderMixin,
    MacsecInterfaceBuilderMixin,
    OpenvpnInterfaceBuilderMixin,
    PppoeInterfaceBuilderMixin,
    PseudoEthernetInterfaceBuilderMixin,
    VirtualEthernetInterfaceBuilderMixin,
    VppInterfaceBuilderMixin,
    VtiInterfaceBuilderMixin,
)
from vyos_builders.nat import NATBatchBuilder
from vyos_builders.system import SystemPerformanceBatchBuilder
from vyos_builders.wireguard import WireGuardBatchBuilder

logger = logging.getLogger(__name__)

# Put in front of the error when a failed commit may still have changed the router.
PARTIAL_COMMIT_NOTICE = (
    "Part of this change reached the router before the commit failed. "
    "It is listed under unsaved changes."
)
UNREAD_COMMIT_NOTICE = (
    "The router could not be read after the commit failed, so part of this "
    "change may be live. Check unsaved changes."
)
UNANSWERED_COMMIT_NOTICE = (
    "The router did not answer, so this change may still be applied. "
    "If it is, it will show under unsaved changes."
)
UNANSWERED_COMMIT_CONFIRM_NOTICE = (
    "The router did not answer, so this change and its commit-confirm timer "
    "may be active. If the change is live, confirm it before the timer runs out."
)

# Text of a transport error raised before the request left VyManager
# (connection refused, DNS failure). Anything else may have reached the router.
_NOT_SENT_MARKERS = (
    "NewConnectionError",
    "Failed to establish a new connection",
    "Name or service not known",
    "Temporary failure in name resolution",
)


def _transport_failure(exc: Exception, endpoint: str) -> ApiResponse:
    """Map a requests failure to a status without the device URL in the text.

    504: the reply timed out; 503: the request was never sent; 502: the
    connection broke after the request may have been sent.
    """
    logger.warning("VyOS API /%s request failed: %s", endpoint, type(exc).__name__, exc_info=True)
    if isinstance(exc, _requests.exceptions.Timeout):
        return ApiResponse(status=504, request={}, result={}, error="Request timed out")
    if isinstance(exc, _requests.exceptions.ConnectionError) and any(
        marker in str(exc) for marker in _NOT_SENT_MARKERS
    ):
        return ApiResponse(status=503, request={}, result={}, error="Could not reach the VyOS API")
    return ApiResponse(status=502, request={}, result={}, error="The connection to the VyOS API was lost")


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

    def create_ethernet_batch(self) -> EthernetInterfaceBuilderMixin:
        """
        Create a batch builder for ethernet interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return EthernetInterfaceBuilderMixin(self.config.version)

    def create_dummy_batch(self) -> DummyInterfaceBuilderMixin:
        """
        Create a batch builder for dummy interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return DummyInterfaceBuilderMixin(self.config.version)

    def create_input_batch(self) -> InputInterfaceBuilderMixin:
        """
        Create a batch builder for input (IFB) interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return InputInterfaceBuilderMixin(self.config.version)

    def create_geneve_batch(self) -> GeneveInterfaceBuilderMixin:
        """
        Create a batch builder for geneve interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return GeneveInterfaceBuilderMixin(self.config.version)

    def create_l2tpv3_batch(self) -> L2TPv3InterfaceBuilderMixin:
        """
        Create a batch builder for L2TPv3 interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return L2TPv3InterfaceBuilderMixin(self.config.version)

    def create_loopback_batch(self) -> LoopbackInterfaceBuilderMixin:
        """
        Create a batch builder for loopback interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return LoopbackInterfaceBuilderMixin(self.config.version)

    def create_openvpn_batch(self) -> OpenvpnInterfaceBuilderMixin:
        """
        Create a batch builder for OpenVPN interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return OpenvpnInterfaceBuilderMixin(self.config.version)

    def create_pppoe_batch(self) -> PppoeInterfaceBuilderMixin:
        """
        Create a batch builder for PPPoE interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return PppoeInterfaceBuilderMixin(self.config.version)

    def create_pseudo_ethernet_batch(self) -> PseudoEthernetInterfaceBuilderMixin:
        """
        Create a batch builder for pseudo-ethernet (MacVLAN) interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return PseudoEthernetInterfaceBuilderMixin(self.config.version)

    def create_virtual_ethernet_batch(self) -> VirtualEthernetInterfaceBuilderMixin:
        """
        Create a batch builder for virtual-ethernet interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return VirtualEthernetInterfaceBuilderMixin(self.config.version)

    def create_vpp_batch(self) -> VppInterfaceBuilderMixin:
        """
        Create a batch builder for VPP interfaces (VyOS 1.5+ only).

        The builder automatically uses correct command syntax based on version.
        """
        return VppInterfaceBuilderMixin(self.config.version)

    def create_vti_batch(self) -> VtiInterfaceBuilderMixin:
        """
        Create a batch builder for VTI (Virtual Tunnel Interface) interfaces.

        The builder automatically uses correct command syntax based on version.
        """
        return VtiInterfaceBuilderMixin(self.config.version)

    def _record_managed_config(self, instance_id: str) -> None:
        """Record post-mutation live config as VyManager-produced state.

        The mutation already succeeded, so this cannot fail the request. But a
        stale managed snapshot is not a safe fallback: the next reconcile would
        see live config differing from it, classify this VyManager edit as
        external, and fold it into the saved baseline, so the unsaved-changes
        banner would never show the edit (#855). Drop the snapshot instead,
        which leaves the baseline untouched and keeps the edit visible.
        """
        try:
            set_managed_config(instance_id, self.get_full_config(refresh=True))
        except Exception:
            clear_managed_config(instance_id)
            logger.exception(
                "Unable to record managed config after mutation for instance %s; "
                "dropped the managed snapshot so the change stays in the unsaved banner",
                instance_id,
            )

    def _note_failed_commit(
        self,
        instance_id: str,
        operations: List[Dict[str, Any]],
        response: ApiResponse,
        commit_confirm: bool = False,
    ) -> None:
        """After a failed commit, keep whatever still reached the router visible.

        VyOS commits feature by feature, so a rejected batch can be partly
        live, and a batch whose reply was lost can be fully live. The nodes
        this batch touched are recorded as VyManager's change, so the
        unsaved-changes banner shows them, and the error says so.
        """
        if response.status == 503:
            return  # The request was never sent.

        if response.status in (502, 504):
            # The router may still be applying the commit, so a re-read now
            # proves nothing. Drop the managed snapshot: reconciliation then
            # leaves the baseline alone, and whatever lands shows as unsaved.
            clear_managed_config(instance_id)
            notice = UNANSWERED_COMMIT_NOTICE
            if commit_confirm:
                # The timer may be armed on the router. Show the countdown so
                # it can be confirmed; confirming with nothing pending is a no-op.
                commit_confirm_state.set_active(instance_id, self.config.commit_confirm_minutes)
                notice = UNANSWERED_COMMIT_CONFIRM_NOTICE
                event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
            self._prefix_error(response, notice)
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
            return

        # VyOS answered with an error. The node an op touches is its parent,
        # which covers a leaf's value, a multi value, and a created or deleted
        # tag value; a one-element path is the node itself.
        node_paths = []
        for op in operations:
            path = [str(part) for part in op.get("path", [])]
            node_paths.append(path[:-1] if len(path) > 1 else path)
        try:
            current = self.get_full_config(refresh=True)
        except Exception:
            logger.exception("Could not re-read config for instance %s after a failed commit", instance_id)
            clear_managed_config(instance_id)
            self._prefix_error(response, UNREAD_COMMIT_NOTICE)
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
            return

        if record_failed_commit(instance_id, current, node_paths):
            self._prefix_error(response, PARTIAL_COMMIT_NOTICE)
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)

    @staticmethod
    def _prefix_error(response: ApiResponse, notice: str) -> None:
        response.error = f"{notice}\n{response.error}" if response.error else notice

    def commit_operations(self, operations: List[Dict[str, Any]]) -> ApiResponse:
        """The only call to device.configure_multiple_op.

        pyvyos keeps HTTP 200 when VyOS rejects the commit. commit-confirm
        already returns 400 in that case. Do the same here so every caller
        can treat status 200 as applied. pyvyos raises on transport failures;
        those become a status as well (see _transport_failure).
        """
        try:
            response = self.device.configure_multiple_op(op_path=operations)
        except _requests.exceptions.RequestException as exc:
            return _transport_failure(exc, "configure")
        if response.status == 200 and response.error:
            response.status = 400
        return response

    def execute_batch(
        self,
        batch: Union[
            EthernetInterfaceBuilderMixin,
            DummyInterfaceBuilderMixin,
            InputInterfaceBuilderMixin,
            FirewallGroupsBatchBuilder,
            NATBatchBuilder,
            DHCPServerBatchBuilder,
            WireGuardBatchBuilder,
            SystemPerformanceBatchBuilder,
            LoopbackInterfaceBuilderMixin,
            MacsecInterfaceBuilderMixin,
            OpenvpnInterfaceBuilderMixin,
            PppoeInterfaceBuilderMixin,
        ],
    ) -> ApiResponse:
        """Execute a batch of operations using configure_multiple_op.

        If commit-confirm is enabled for this instance and the VyOS version
        supports it, the batch is executed with a rollback timer automatically.
        On a version without commit-confirm the flag is ignored and the batch
        commits normally. No router changes are needed.
        """
        if (
            self.config.commit_confirm_enabled
            and self.config.instance_id
            and commit_confirm_state.supports_commit_confirm(self.config.version)
        ):
            return self.execute_batch_with_confirm(batch, self.config.instance_id)

        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")

        operations = batch.get_operations()
        response = self.commit_operations(operations)
        if self.config.instance_id:
            if response.status == 200:
                self._record_managed_config(self.config.instance_id)
                event_manager.emit(self.config.instance_id, EVENT_CONFIG_DIFF, None)
            else:
                self._note_failed_commit(self.config.instance_id, operations, response)
        return response

    def _post_api(self, endpoint: str, data: Dict[str, Any]) -> ApiResponse:
        """POST one form-encoded request to the VyOS HTTP API.

        VyOS answers a rejected request with HTTP 400 and a JSON body that
        carries the error, so the body is read before the status: status 200
        means ``success`` was true, status 400 carries the VyOS error text.
        Transport failures are logged and get a fixed message, so the device
        URL and the requests text never reach the client.
        """
        url = f"{self.config.protocol}://{self.config.hostname}:{self.config.port}/{endpoint}"
        payload = {"data": json.dumps(data), "key": self.config.apikey}
        try:
            resp = _requests.post(
                url,
                data=payload,
                verify=self.config.verify,
                timeout=self.config.timeout,
            )
        except _requests.exceptions.RequestException as exc:
            return _transport_failure(exc, endpoint)

        try:
            body = resp.json()
        except ValueError:
            body = None
        if not isinstance(body, dict):
            logger.warning("VyOS API /%s returned HTTP %s without a JSON body", endpoint, resp.status_code)
            return ApiResponse(status=502, request={}, result={}, error="Unexpected response from the VyOS API")
        if not body.get("success"):
            return ApiResponse(
                status=400, request={}, result={}, error=body.get("error") or "Unknown error from VyOS API",
            )
        return ApiResponse(status=200, request={}, result=body.get("data") or {}, error=False)

    def execute_batch_with_confirm(self, batch, instance_id: str) -> ApiResponse:
        """
        Execute a batch using VyOS commit-confirm.

        Applies operations to the running config with an automatic rollback
        timer. The caller must confirm via confirm_commit() before the timer
        expires, otherwise VyOS will revert the changes. execute_batch is the
        only caller and the only place that checks the instance flag and the
        version; this method never calls back into execute_batch.

        Raises:
            HTTPException 409: If a commit-confirm is already active for this instance.
            ValueError: If the batch is empty.
        """
        from fastapi import HTTPException

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

        confirm_time_minutes = self.config.commit_confirm_minutes

        # VyOS ConfigureListModel format: {"commands": [...], "confirm_time": N}
        # pyvyos's configure_multiple_op sends a raw JSON array, which VyOS wraps
        # internally as {"commands": [...], "confirm_time": 0} — discarding any
        # confirm_time we'd try to include. We must build this payload manually so
        # the timer is armed atomically with the same commit that applies the ops.
        operations = batch.get_operations()
        response = self._post_api(
            "configure",
            {"commands": operations, "confirm_time": confirm_time_minutes},
        )
        if response.status != 200:
            # A rejected commit arms no timer, so whatever landed stays live
            # with no rollback. A lost reply may have armed one.
            self._note_failed_commit(instance_id, operations, response, commit_confirm=True)
            return response

        commit_confirm_state.set_active(instance_id, confirm_time_minutes)
        self._record_managed_config(instance_id)
        event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
        event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
        return response

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
        response = self._post_api("config-file", {"op": "confirm"})
        if response.status == 200:
            commit_confirm_state.clear(instance_id)
            event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
        return response

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
        # response.result is already the JSON string
        config_json = response.result

        try:
            self._cached_config = json.loads(config_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse configuration JSON: {e}")

        return self._cached_config

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

    def generate(self, path: List[str]) -> ApiResponse:
        """
        Run an operational-mode ``generate`` command on the device.

        Used for op-mode generators such as ``generate openvpn client-config``
        which produce a payload (e.g. an .ovpn file) rather than mutating config.

        Args:
            path: Op-mode path elements after ``generate``
                  (e.g. ["openvpn", "client-config", "interface", "vtun0", ...])

        Returns:
            ApiResponse: ``result`` holds the generated text on success.
        """
        return self.device.generate(path=path)


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

    def clear(self) -> None:
        """Clear all registered devices."""
        self._devices.clear()
