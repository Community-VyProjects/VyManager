import json
import logging
import os
import time
from abc import ABC
from dataclasses import dataclass
from typing import Tuple, List, Union, Dict, Any, Optional

import requests
from requests import Response
from requests.exceptions import (
    HTTPError,
    ConnectionError,
    Timeout,
    RequestException,
    JSONDecodeError,
)

logger = logging.getLogger("pyvyos")

# Enable DEBUG logs if PYVYOS_DEBUG=1
if os.getenv("PYVYOS_DEBUG") == "1":
    logging.basicConfig(level=logging.DEBUG)


@dataclass
class ApiResponse:
    """
    Represents an API response.

    Attributes:
        status (int): The HTTP status code of the response.
        request (dict): The request payload sent to the API.
        result (dict): The data result of the API response.
        error (str): Any error message in case of a failed response.
    """

    status: int
    request: dict
    result: dict
    error: str


class RestClient(ABC):
    """Secure REST client for integration with VyOS device APIs"""

    hostname: str
    apikey: str
    protocol: str
    port: int
    verify: bool
    timeout: int

    def __init__(
        self,
        hostname: str,
        apikey: str,
        protocol: str = "https",
        port: int = 443,
        verify: bool = False,
        timeout: int = 10,
    ):
        """
        Args:
            hostname: VyOS device address
            apikey: API key for authentication
            protocol: Protocol (http/https)
            port: Access port
            verify: Verify SSL certificates
            timeout: Request timeout in seconds
        """
        super().__init__()
        self.hostname = hostname
        self.apikey = apikey
        self.protocol = protocol
        self.port = port
        self.verify = verify
        self.timeout = timeout

    def _get_url(self, command):
        """
        Get the full URL for a specific API command.

        Args:
            command (str): The API command to construct the URL for.

        Returns:
            str: The full URL for the API command.
        """
        return f"{self.protocol}://{self.hostname}:{self.port}/{command}"

    def _get_payload(
        self,
        op: Optional[str] = None,
        path: Union[List[str], List[List[str]]] = None,
        file: Optional[str] = None,
        url: Optional[str] = None,
        name: Optional[str] = None,
        include_empty_path: bool = True,
    ) -> Dict[str, Any]:
        """
        Generates API request payload based on specified operations and parameters.

        Parameters:
            op (str, optional): Operation to perform (e.g., 'set', 'delete')
            path (Union[List[str], List[List[str]]], optional):
                Configuration path(s) for the API. Can be:
                - Single path as string list
                - Multiple paths as list of string lists
            file (str, optional): File path for upload
            url (str, optional): External resource URL
            name (str, optional): Resource name
            include_empty_path (bool, optional): Whether to include empty path in payload.
                Default True. Set to False to omit path when empty (except for config-file).

        Returns:
            Dict: Formatted API payload containing:
                - data: JSON-serialized operations
                - key: API key

        Raises:
            ValueError: If required parameters are missing or invalid
        """

        def _create_operations() -> Union[List[Dict], Dict]:
            """Creates operation structure based on parameters."""
            if not op:
                if not all(isinstance(p, dict) for p in path):
                    raise ValueError(
                        "Path must contain dictionaries when no operation is specified"
                    )
                return path

            normalized_paths = path or []
            
            # Skip path if empty and include_empty_path is False
            if not normalized_paths and not include_empty_path:
                if not op:
                    raise ValueError(
                        "Must provide either 'op' or pre-formatted operations in 'path'"
                    )
                return {"op": op}
            
            is_multiple = (
                isinstance(normalized_paths[0], list) if normalized_paths else False
            )

            if is_multiple:
                return [{"op": op, "path": p} for p in normalized_paths]
            return {"op": op, "path": normalized_paths}

        def _add_optional_params(
            data: Union[List[Dict], Dict], params: Dict[str, str]
        ) -> Union[List[Dict], Dict]:
            """Adds optional parameters to operation structure."""
            if isinstance(data, list):
                return [{**item, **params} for item in data]
            return {**data, **params}

        # Initial validation
        if not op and not path:
            raise ValueError(
                "Must provide either 'op' or pre-formatted operations in 'path'"
            )

        operations = _create_operations()
        optional_params = {
            k: v for k, v in zip(["file", "url", "name"], [file, url, name]) if v
        }

        if optional_params:
            operations = _add_optional_params(operations, optional_params)

        return {"data": json.dumps(operations), "key": self.apikey}

    def _api_request(
        self,
        command: str,
        op: Optional[str] = None,
        path: Optional[List[str]] = None,
        method: str = "POST",
        file: Optional[str] = None,
        resource_url: Optional[str] = None,
        name: Optional[str] = None,
    ):
        """
        Executes an API request with proper error handling and security measures.

        Parameters:
            command (str): API endpoint command to execute
            op (str, optional): Operation type (e.g., 'create', 'update', 'delete')
            path (List[str], optional): Hierarchical path for resource location
            method (str): HTTP method (GET/POST/PUT/DELETE). Default: POST
            file (str, optional): Local file path for file uploads
            resource_url (str, optional): External resource URL reference
            name (str, optional): Resource identifier name

        Returns:
            ApiResponse: Structured response containing:
                - status: HTTP status code
                - request: Sanitized request payload
                - result: Parsed response data
                - error: Error message if applicable

        Raises:
            ConnectionError: Network communication failures
            Timeout: Server response timeout
            ValueError: Invalid parameter combinations
        """

        def _prepare_request() -> Dict[str, Any]:
            """Constructs request components with validation."""
            if not command:
                raise ValueError("API command is required")
            
            # Special case: config-file requires path to be present (even if empty)
            # Other commands can omit path when empty
            include_empty_path = (command == "config-file")
            
            return {
                "url": self._get_url(command),
                "method": method,
                "verify": self.verify,
                "timeout": self.timeout,
                "payload": self._get_payload(
                    op, path=path, file=file, url=resource_url, name=name,
                    include_empty_path=include_empty_path
                ),
                "headers": {},
            }

        # Initialize mutable defaults safely
        path = path or []

        # Generate request ID for tracing
        try:
            from ..utils.ids import request_id
            req_id = request_id()
        except ImportError:
            req_id = None

        # Log request start (DEBUG level)
        logger.debug(
            "Request start",
            extra={
                "request_id": req_id,
                "command": command,
                "op": op,
                "has_path": bool(path),
            }
        )

        # Request execution flow
        start_time = time.time()
        request_components = _prepare_request()
        response = self._execute_request(**request_components)
        elapsed_ms = int((time.time() - start_time) * 1000)
        status, result, error = self._validate_response(response)

        # Log response (INFO level)
        logger.info(
            "Request completed",
            extra={
                "request_id": req_id,
                "command": command,
                "op": op,
                "status": status,
                "success": not error,
                "elapsed_ms": elapsed_ms,
            }
        )

        # Sanitize sensitive data before returning (use utils if available)
        try:
            from ..utils.json import redact_key
            sanitized_payload = redact_key(request_components["payload"])
        except ImportError:
            sanitized_payload = request_components["payload"].copy()
            sanitized_payload.pop("key", None)

        return ApiResponse(
            status=status, request=sanitized_payload, result=result, error=error
        )

    @classmethod
    def _execute_request(
        cls,
        url: str,
        method: str,
        verify: bool,
        timeout: int,
        payload: Dict,
        headers: Dict,
    ) -> requests.Response:
        """Sends HTTP request with error handling."""
        try:
            return requests.request(
                method=method.upper(),
                url=url,
                verify=verify,
                data=payload,
                timeout=timeout,
                headers=headers,
            )
        except Timeout:
            raise Timeout(f"Request timed out after {timeout} seconds")
        except RequestException as e:
            raise ConnectionError(f"Network error: {str(e)}")

    @classmethod
    def _validate_response(
        cls, resp: Response
    ) -> Tuple[Optional[int], Dict[str, Any], Union[str, bool]]:
        """
        Validates and processes API responses with comprehensive error handling.

        Parameters:
            resp (Response): HTTP response object from requests library

        Returns:
            Tuple containing:
            - status (int | None): HTTP status code
            - result (dict): Parsed successful response data
            - error (str | bool): Error message (False indicates success)

        Raises:
            ValueError: For invalid response structures
            RuntimeError: For unexpected parsing failures

        Processing Flow:
            1. HTTP Status Code Validation
            2. Response Body Parsing
            3. API Success/Failure Flag Check
            4. Error Message Extraction
            5. Fallback Error Handling
        """
        status: Optional[int] = None
        result: Dict[str, Any] = {}
        error: Union[str, bool] = False

        def _validate_schema(response_json: Dict[str, Any]) -> None:
            """Validates response structure against API contract."""
            required_keys = {"success", "data", "error"}
            if isinstance(response_json, dict) and not required_keys.issubset(response_json.keys()):
                missing = required_keys - response_json.keys()
                raise ValueError(f"Invalid response structure. Missing keys: {missing}")

        try:
            # Validate HTTP status code
            resp.raise_for_status()
            status = resp.status_code

            # Parse and validate JSON structure
            resp_decoded = resp.json()
            _validate_schema(resp_decoded)

            # Process API business logic
            if resp_decoded["success"]:
                result = resp_decoded["data"]
            else:
                error = f"API Error {status}: {resp_decoded['error']}"

        except JSONDecodeError as exc:
            error = f"Invalid response format: {str(exc)}"
            status = resp.status_code if resp is not None and isinstance(resp, Response) else 500


        except HTTPError as exc:
            response = exc.response
            status = response.status_code if response is not None and isinstance(response, Response) else 500
            error = f"HTTP Error {status}: {response.text[:200] if response else 'Unknown error'}"

        except ValueError as exc:
            error = f"Validation Error: {str(exc)}"

        except Exception as exc:
            error = f"Unexpected error: {str(exc)}"
            status = 500

        return status, result, error

