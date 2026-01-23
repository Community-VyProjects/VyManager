import warnings
from typing import List, Literal

from .rest_client import ApiResponse, RestClient


class VyDevice(RestClient):
    """
    Represents a device for interacting with the VyOS API.

    Args:
        hostname (str): The hostname or IP address of the VyOS device.
        apikey (str): The API key for authentication.
        protocol (str, optional): The protocol to use (default is 'https').
        port (int, optional): The port to use (default is 443).
        verify (bool, optional): Whether to verify SSL certificates (default is True).
        timeout (int, optional): The request timeout in seconds (default is 10).

    Attributes:
        hostname (str): The hostname or IP address of the VyOS device.
        apikey (str): The API key for authentication.
        protocol (str): The protocol used for communication.
        port (int): The port used for communication.
        verify (bool): Whether SSL certificate verification is enabled.
        timeout (int): The request timeout in seconds.

    Methods:
        _get_url(command): Get the full URL for a given API command.
        _get_payload(op, path=[], file=None, url=None, name=None): Generate the API request payload.
        _api_request(command, op, path=[], method='POST', file=None, url=None, name=None): Make an API request.
        retrieve_show_config(path=[]): Retrieve and show the device configuration.
        retrieve_return_values(path=[]): Retrieve and return specific configuration values.
        reset(path=[]): Reset a specific configuration element.
        image_add(url=None, file=None, path=[]): Add an image from a URL or file.
        image_delete(name, url=None, file=None, path=[]): Delete a specific image.
        show(path=[]): Show configuration information.
        generate(path=[]): Generate configuration based on specified path.
        configure_set(path=[]): Sets configuration based on the specified path. This method is versatile, accepting
        either a single configuration path or a list of configuration paths. This flexibility
        allows for setting both individual and multiple configurations in a single operation.
        configure_delete(path=[]): Delete configuration based on specified path.
        config_file_save(file=None): Save the configuration to a file.
        config_file_load(file=None): Load the configuration from a file.
        reboot(path=["now"]): Reboot the device.
        poweroff(path=["now"]): Power off the device.
    """

    def __init__(
        self,
        hostname: str,
        apikey: str,
        protocol: Literal["http", "https"] = "https",
        port: int = 443,
        verify: bool = True,
        timeout: int = 10,
    ):
        super().__init__(
            hostname, apikey, protocol, int(port), bool(verify), int(timeout)
        )
        self._validate_params()

    def _validate_params(
        self,
    ) -> None:
        """Validação centralizada de parâmetros"""
        if not isinstance(self.hostname, str) or len(self.hostname) < 3:
            raise ValueError("Invalid hostname")

        if self.protocol not in ("http", "https"):
            raise ValueError("The protocol must be http or https")

        if not 1 <= self.port <= 65535:
            raise ValueError("Port out of valid range (1-65535)")

        if self.timeout and self.timeout < 1:
            warnings.warn("Timeout below 1s may cause instability", UserWarning)

    def retrieve_show_config(self, path: List = None):
        """
        Retrieve and show the device configuration.

        Args:
            path (list, optional): The path elements for the configuration retrieval (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """

        return self._api_request(
            command="retrieve", op="showConfig", path=path, method="POST"
        )

    def retrieve_return_values(self, path: List = None):
        """
        Retrieve and return specific configuration values.

        Args:
            path (list, optional): The path elements for the configuration retrieval (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="retrieve", op="returnValues", path=path, method="POST"
        )

    def reset(self, path: List = None):
        """
        Reset a specific configuration element.

        Args:
            path (list, optional): The path elements for the configuration reset (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(command="reset", op="reset", path=path, method="POST")

    def image_add(self, url=None, file=None, path=[]):
        """
        Add an image from a URL or file.

        Args:
            url (str, optional): The URL of the image to add (default is None).
            file (str, optional): The path to the local image file to add (default is None).
            path (list, optional): The path elements for the image addition (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(command="image", op="add", resource_url=url, method="POST")

    def image_delete(self, name, url=None, file=None, path=[]):
        """
        Delete a specific image.

        Args:
            name (str): The name of the image to delete.
            url (str, optional): The URL of the image to delete (default is None).
            file (str, optional): The path to the local image file to delete (default is None).
            path (list, optional): The path elements for the image deletion (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(command="image", op="delete", name=name, method="POST")

    def show(self, path: List = None):
        """
        Show configuration information.

        Args:
            path (list, optional): The path elements for the configuration display (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(command="show", op="show", path=path, method="POST")

    def generate(self, path: List = None):
        """
        Generate configuration based on the given path.

        Args:
            path (list, optional): The path elements for configuration generation (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="generate", op="generate", path=path, method="POST"
        )

    def configure_set(self, path: List = None):
        """
        Set configuration based on the given path.

        Args:
            path (list, optional): The path elements for configuration setting (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="configure", op="set", path=path, method="POST"
        )

    def configure_delete(self, path: List = None):
        """
        Delete configuration based on the given path.

        Args:
            path (list, optional): The path elements for configuration deletion (default is an empty list).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="configure", op="delete", path=path, method="POST"
        )

    def configure_multiple_op(self, op_path: List = None):
        """
        Set configuration based on the given {operation : path} for multiple operation.

        Args:
            op_path (list): The path elements for configuration deletion  or/and setting.
            eg: [{'op': 'delete', 'path': [...]}, {'op': 'set', 'path': [...]}]

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(command="configure", op="", path=op_path)

    def config_file_save(self, file=None):
        """
        Save the configuration to a file.

        Args:
            file (str, optional): The path to the file where the configuration will be saved (default is None).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="config-file", op="save", path=[], file=file, method="POST"
        )

    def config_file_load(self, file=None):
        """
        Load the configuration from a file.

        Args:
            file (str, optional): The path to the file from which the configuration will be loaded (default is None).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        return self._api_request(
            command="config-file", op="load", path=[], file=file, method="POST"
        )

    def reboot(self, path: List = None):
        """
        Reboot the device.

        Args:
            path (list, optional): The path elements for the reboot operation (default is ["now"]).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        if path is None:
            path = ["now"]

        return self._api_request(
            command="reboot", op="reboot", path=path, method="POST"
        )

    def poweroff(self, path: List = None):
        """
        Power off the device.

        Args:
            path (list, optional): The path elements for the power off operation (default is ["now"]).

        Returns:
            ApiResponse: An ApiResponse object representing the API response.
        """
        if path is None:
            path = ["now"]

        return self._api_request(
            command="poweroff", op="poweroff", path=path, method="POST"
        )

