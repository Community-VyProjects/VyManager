"""
VyOS Service Layer - Modular Version

Uses the new modular mapper and builder structure.
Much cleaner and easier to maintain!
"""

from typing import Optional, Dict, Any, List, Protocol
import contextlib
import json
import logging
import ssl as _ssl
import requests as _requests
import urllib3 as _urllib3

from pyvyos import VyDevice
from pyvyos.core.rest_client import ApiResponse
import commit_confirm_state
import device_keys
from config_state import clear_managed_config, reconcile_baseline, record_failed_commit, set_managed_config
from events.event_manager import event_manager, EVENT_CONFIG_DIFF, EVENT_COMMIT_CONFIRM
from vyos_builders.interfaces import (
    EthernetInterfaceBuilderMixin,
    DummyInterfaceBuilderMixin,
    GeneveInterfaceBuilderMixin,
    InputInterfaceBuilderMixin,
    L2TPv3InterfaceBuilderMixin,
    LoopbackInterfaceBuilderMixin,
    OpenvpnInterfaceBuilderMixin,
    PppoeInterfaceBuilderMixin,
    PseudoEthernetInterfaceBuilderMixin,
    VirtualEthernetInterfaceBuilderMixin,
    VppInterfaceBuilderMixin,
    VtiInterfaceBuilderMixin,
)

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

# Transport errors raised before the request was sent: the URL was invalid,
# the connect timed out or was refused, the name did not resolve, or the
# certificate was rejected.
_NOT_SENT_ERRORS = (
    _requests.exceptions.ConnectTimeout,
    _requests.exceptions.InvalidURL,
    _urllib3.exceptions.NewConnectionError,  # includes NameResolutionError
    _urllib3.exceptions.ConnectTimeoutError,
    _ssl.SSLCertVerificationError,  # ssl.CertificateError is the same class
)

# urllib3 raises the same types (SSLError, ReadTimeout, ProtocolError) for a
# failure in the TLS handshake and for one while reading the reply. Only the
# traceback tells them apart: urllib3 runs the handshake in _validate_conn,
# before it sends the request, so any error raised there means nothing was sent.
_HANDSHAKE_FRAMES = {"_validate_conn", "do_handshake", "wrap_socket", "_ssl_wrap_socket_and_match_hostname"}


def _raised_in_handshake(exc: BaseException) -> bool:
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_name in _HANDSHAKE_FRAMES:
            return True
        tb = tb.tb_next
    return False


def _causes(exc: BaseException):
    """exc and what it wraps: pyvyos re-raises inside ``except``, so the
    original is ``__context__``; requests and urllib3 wrap the reason in
    ``args`` and ``MaxRetryError.reason``."""
    seen: set = set()
    todo: List[Any] = [exc]
    while todo:
        item = todo.pop()
        if not isinstance(item, BaseException) or id(item) in seen:
            continue
        seen.add(id(item))
        yield item
        todo.extend([item.__cause__, item.__context__, getattr(item, "reason", None), *item.args])


# pyvyos _validate_response's errors for a 200 whose body is not the VyOS API's.
_NOT_A_VYOS_REPLY = ("Invalid response format", "Validation Error", "Unexpected error")


def _vyos_replied(response: ApiResponse) -> bool:
    """pyvyos parsed a VyOS reply: HTTP 200 with the API's JSON body (success
    or a VyOS error). Anything else may come from a proxy in front of it."""
    if response.status != 200:
        return False
    return not response.error or not str(response.error).startswith(_NOT_A_VYOS_REPLY)


def _classify_200_error(response: ApiResponse) -> None:
    """A pyvyos 200 with an error is VyOS's rejection (400), unless pyvyos
    says the body was not VyOS's reply (a proxy page or a proxy's JSON): then
    the outcome is unknown (502), as on the _post_api path."""
    if response.status == 200 and response.error:
        response.status = 502 if str(response.error).startswith(_NOT_A_VYOS_REPLY) else 400


class RouterRefusedRead(ValueError):
    """A config read the router refused (401/403); keeps its reply."""

    def __init__(self, response: ApiResponse, message: str) -> None:
        super().__init__(message)
        self.response = response


def _transport_failure(exc: Exception, endpoint: str) -> ApiResponse:
    """Map a requests failure to a status without the device URL in the text.

    504: the reply timed out; 503: the request was never sent; 502: the
    connection broke after the request may have been sent.
    """
    logger.warning("VyOS API /%s request failed: %s", endpoint, type(exc).__name__, exc_info=True)
    if any(isinstance(cause, _NOT_SENT_ERRORS) or _raised_in_handshake(cause) for cause in _causes(exc)):
        return ApiResponse(status=503, request={}, result={}, error="Could not reach the VyOS API")
    if isinstance(exc, _requests.exceptions.Timeout):
        return ApiResponse(status=504, request={}, result={}, error="Request timed out")
    return ApiResponse(status=502, request={}, result={}, error="The connection to the VyOS API was lost")


_NO_LOCK = contextlib.nullcontext()

# The config the router boots; a save to it is what a reboot revert loads.
BOOT_CONFIG = "/config/config.boot"


class BatchOperations(Protocol):
    """What execute_batch needs from a batch builder: every builder has these."""

    def is_empty(self) -> bool: ...

    def get_operations(self) -> List[Dict[str, Any]]: ...


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
        if device_config.instance_id:
            device_keys.note(device_config.instance_id, device_config.hostname, device_config.port)

    def _write_lock(self) -> Any:
        """The router's write lock (see device_keys.write_lock); a no-op lock without an instance."""
        if not self.config.instance_id:
            return _NO_LOCK
        return device_keys.write_lock(self.config.instance_id)

    def _router_answered(self, status: int, vyos_replied: bool) -> None:
        """What the router's answer says about this row's credentials.

        Refused (401/403, a key revoked or changed on the router): the row
        stops sharing the router's state, and its cached config, read while
        the key still worked, is dropped. Accepted only when VyOS itself
        answered (``vyos_replied``: its JSON reply, or a parsed config read):
        a proxy's 5xx or HTML page, or a failed read, proves nothing about the
        key, so it neither verifies nor un-verifies the row.
        """
        if not self.config.instance_id:
            return
        if status in (401, 403):
            device_keys.rejected(self.config.instance_id)
            self._cached_config = None
        elif vyos_replied:
            device_keys.verified(self.config.instance_id)

    def _refuse_during_commit_confirm(self) -> None:
        """409 when a commit-confirm is pending on this router.

        Any commit during the window would be archived by VyOS and make the
        pending change permanent, so every commit path checks this under the
        router's write lock.
        """
        from fastapi import HTTPException

        instance_id = self.config.instance_id
        session = commit_confirm_state.blocking(instance_id) if instance_id else None
        if session is None:
            return
        # A row that has not shown it can reach this router learns nothing more.
        shares = device_keys.key_for(instance_id) == session.device_key
        starter = session.starter_label() if shares else None
        who = f" started by {starter}" if starter else ""
        raise HTTPException(
            status_code=409,
            detail=(
                f"A commit-confirm{who} is pending on this router. "
                f"Confirm it or wait {session.seconds_remaining()} seconds for it to run out."
            ),
        )

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
        action: str = commit_confirm_state.DEFAULT_ACTION,
        unsaved_before: bool = True,
    ) -> None:
        """After a failed commit, keep whatever still reached the router visible.

        VyOS commits feature by feature, so a rejected batch can be partly
        live, and a batch whose reply was lost can be fully live. The nodes
        this batch touched are recorded as VyManager's change, so the
        unsaved-changes banner shows them, and the error says so.
        """
        if response.status in (401, 403, 503):
            return  # Never sent, or refused before VyOS ran anything.

        if response.status in (502, 504):
            # The router may still be applying the commit, so a re-read now
            # proves nothing. Drop the managed snapshot: reconciliation then
            # leaves the baseline alone, and whatever lands shows as unsaved.
            clear_managed_config(instance_id)
            notice = UNANSWERED_COMMIT_NOTICE
            if commit_confirm:
                # The timer may be armed on the router. Show the countdown so
                # it can be confirmed; confirming with nothing pending is a no-op.
                commit_confirm_state.set_active(
                    instance_id, self.config.commit_confirm_minutes, action, unsaved_before)
                notice = UNANSWERED_COMMIT_CONFIRM_NOTICE
                # Stored under the router the post went to; emit's refetch
                # signal reaches its rows even if this one is not verified.
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

        VyOS rejects a commit with HTTP 400 (pyvyos: "HTTP Error 400: ...");
        an older reply shape keeps HTTP 200 with the error ("API Error ..."),
        which becomes 400 here, as commit-confirm does, so every caller can
        treat status 200 as applied. A 400 through pyvyos's HTTPError path
        cannot be told from a proxy's, so it does not verify the row. pyvyos raises on transport failures;
        those become a status as well (see _transport_failure).

        Raises HTTPException 409 while a commit-confirm is pending on the router.
        """
        with self._write_lock():
            self._refuse_during_commit_confirm()
            try:
                response = self.device.configure_multiple_op(op_path=operations)
            except _requests.exceptions.RequestException as exc:
                return _transport_failure(exc, "configure")
            self._router_answered(response.status, _vyos_replied(response))
        _classify_200_error(response)
        return response

    def execute_batch(
        self,
        batch: BatchOperations,
    ) -> ApiResponse:
        """Execute a batch of operations using configure_multiple_op.

        If commit-confirm is enabled for this instance and the VyOS version
        supports it, the batch is executed with a rollback timer automatically.
        On a version without commit-confirm the flag is ignored and the batch
        commits normally. No router changes are needed.

        The router's write lock is held from the commit-confirm check to the
        recorded result, so another write cannot land in between.
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
        with self._write_lock():
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
        means ``success`` was true, status 400 carries the VyOS error text,
        and 401/403 (bad API key) keep their status and text.
        Transport failures are logged and get a fixed message, so the device
        URL and the requests text never reach the client.
        """
        # self.device.hostname is the host pyvyos formats, IPv6 in brackets.
        url = f"{self.config.protocol}://{self.device.hostname}:{self.config.port}/{endpoint}"
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
        # VyOS answers every request with {"success", "data", "error"}; any
        # other body (HTML, or a proxy's own JSON) is not VyOS's answer, and
        # the commit may or may not have run: an unknown outcome.
        vyos_replied = isinstance(body, dict) and "success" in body
        self._router_answered(resp.status_code, vyos_replied)
        if resp.status_code in (401, 403) and not vyos_replied:
            # Refused before anything ran, whoever refused it (VyOS or a proxy):
            # never sent, as on the pyvyos path, never an unknown outcome.
            return ApiResponse(
                status=resp.status_code, request={}, result={},
                error=f"HTTP Error {resp.status_code}: the request was refused",
            )
        if not vyos_replied or not isinstance(body, dict):
            logger.warning("VyOS API /%s returned HTTP %s without the VyOS reply body", endpoint, resp.status_code)
            status = 504 if resp.status_code == 504 else 502
            return ApiResponse(status=status, request={}, result={}, error="Unexpected response from the VyOS API")
        if not body.get("success"):
            # 401/403 (bad API key) is kept, as pyvyos does on the plain path.
            status = resp.status_code if resp.status_code in (401, 403) else 400
            return ApiResponse(
                status=status, request={}, result={}, error=body.get("error") or "Unknown error from VyOS API",
            )
        return ApiResponse(status=200, request={}, result=body.get("data") or {}, error=False)

    def execute_batch_with_confirm(self, batch: BatchOperations, instance_id: str) -> ApiResponse:
        """
        Execute a batch using VyOS commit-confirm.

        Applies operations to the running config with an automatic rollback
        timer. The caller must confirm via confirm_commit() before the timer
        expires, otherwise VyOS will revert the changes. execute_batch is the
        only caller and the only place that checks the instance flag and the
        version; this method never calls back into execute_batch.

        Raises:
            HTTPException 409: If a commit-confirm is already pending on this router.
            ValueError: If the batch is empty.
        """
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")

        confirm_time_minutes = self.config.commit_confirm_minutes

        # VyOS ConfigureListModel format: {"commands": [...], "confirm_time": N}
        # pyvyos's configure_multiple_op sends a raw JSON array, which VyOS wraps
        # internally as {"commands": [...], "confirm_time": 0} — discarding any
        # confirm_time we'd try to include. We must build this payload manually so
        # the timer is armed atomically with the same commit that applies the ops.
        operations = batch.get_operations()
        with self._write_lock():
            self._refuse_during_commit_confirm()
            action, unsaved_before, refused = self._before_arming(instance_id)
            if refused is not None:
                # The router just refused this key: a commit with it would be
                # refused too, and a lost reply would block the router for
                # nothing. Nothing was sent; the router's status and text stand.
                return refused
            response = self._post_api(
                "configure",
                {"commands": operations, "confirm_time": confirm_time_minutes},
            )
            if response.status != 200:
                # A rejected commit arms no timer, so whatever landed stays live
                # with no rollback. A lost reply may have armed one.
                self._note_failed_commit(
                    instance_id, operations, response,
                    commit_confirm=True, action=action, unsaved_before=unsaved_before,
                )
                return response

            commit_confirm_state.set_active(instance_id, confirm_time_minutes, action, unsaved_before)
            self._record_managed_config(instance_id)
        event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
        event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
        return response

    def _before_arming(self, instance_id: str) -> tuple:
        """Read the router just before arming: its commit-confirm action, and
        whether unsaved changes are already live (a reboot revert loses them).

        Read fresh, under the write lock: the action can change on the router
        (CLI, another row) after any cached read. An unreadable router counts
        as the VyOS default action with unsaved changes, so the banner warns.
        The third value is the router's reply when it refused this read's key
        (401/403), else None: this read's own outcome, not a shared flag.
        """
        try:
            before = self.get_full_config(refresh=True)
        except RouterRefusedRead as exc:
            return commit_confirm_state.DEFAULT_ACTION, True, exc.response
        except Exception:
            logger.warning("Could not read the router before arming a commit-confirm for instance %s", instance_id)
            return commit_confirm_state.DEFAULT_ACTION, True, None
        baseline = reconcile_baseline(instance_id, before)
        return commit_confirm_state.router_action(before), baseline is not None and baseline != before, None

    def confirm_commit(self, instance_id: str) -> ApiResponse:
        """
        Confirm an active commit-confirm session, stopping the rollback timer.

        Raises:
            HTTPException 409: If no active commit-confirm session exists.
        """
        from fastapi import HTTPException

        with self._write_lock():
            # The router the row names, verified or not: a lost reply can arm
            # one before any read verified the row. The router checks the key;
            # its 200 verifies the row, so clear() below finds the session.
            if commit_confirm_state.blocking(instance_id) is None:
                raise HTTPException(
                    status_code=409,
                    detail="No commit-confirm is pending on this router.",
                )

            # Tested format: confirm goes to /config-file with op: confirm
            response = self._post_api("config-file", {"op": "confirm"})
            if response.status == 200:
                commit_confirm_state.clear(instance_id)
        if response.status == 200:
            event_manager.emit(instance_id, EVENT_COMMIT_CONFIRM, None)
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
        return response

    def load_config_file(self, file: str) -> ApiResponse:
        """Load and commit a config file (archive restore).

        A load is a commit, so it holds the router's write lock and is
        refused while a commit-confirm is pending, like every other commit.
        """
        instance_id = self.config.instance_id
        with self._write_lock():
            self._refuse_during_commit_confirm()
            response = self._config_file_call("load", lambda: self.device.config_file_load(file=file))
            if instance_id:
                if response.status == 200:
                    self._record_managed_config(instance_id)
                elif response.status not in (401, 403, 503):
                    # A failed or unanswered load may have changed anything;
                    # with no managed snapshot the banner keeps showing it.
                    clear_managed_config(instance_id)
        if instance_id and response.status not in (401, 403, 503):
            event_manager.emit(instance_id, EVENT_CONFIG_DIFF, None)
        return response

    def _config_file_call(self, op: str, call) -> ApiResponse:
        """One /config-file call through pyvyos, with the same status rules as commit_operations."""
        try:
            response = call()
        except _requests.exceptions.RequestException as exc:
            return _transport_failure(exc, f"config-file {op}")
        self._router_answered(response.status, _vyos_replied(response))
        _classify_200_error(response)
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

        if response.status != 200 or response.error:
            self._router_answered(response.status, False)
            error_msg = response.error if response.error else "Unknown error"
            if response.status in (401, 403):
                raise RouterRefusedRead(response, f"Failed to retrieve full config: {error_msg}")
            raise ValueError(f"Failed to retrieve full config: {error_msg}")

        # Parse JSON from result
        # response.result is already the JSON string
        config_json = response.result

        try:
            parsed = json.loads(config_json)
        except (json.JSONDecodeError, TypeError) as e:
            raise ValueError(f"Failed to parse configuration JSON: {e}")
        if not isinstance(parsed, dict):
            raise ValueError("Failed to parse configuration JSON: not an object")
        self._cached_config = parsed
        # Only a parsed config read proves the key works on this router.
        self._router_answered(response.status, True)
        if self.config.instance_id:
            commit_confirm_state.note_router_config(self.config.instance_id, self._cached_config)

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

        Saving the boot config while a commit-confirm is pending would make
        the pending change survive the router's revert (a reboot boots the
        saved config), so that save is refused with a 409 until it is
        confirmed or runs out.
        """
        if file is not None and file != BOOT_CONFIG:
            return self._config_file_call("save", lambda: self.device.config_file_save(file=file))
        with self._write_lock():
            self._refuse_during_commit_confirm()
            return self._config_file_call("save", lambda: self.device.config_file_save(file=file))

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
