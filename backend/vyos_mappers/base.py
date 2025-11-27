"""
Base classes for VyOS command mappers.

Provides the foundation for version-specific command translation.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Type, Union, Callable


class BaseFeatureMapper(ABC):
    """
    Base class for feature-specific mappers.

    Each feature (DHCP, interfaces, firewall, etc.) creates its own
    mapper class that inherits from this.
    """

    def __init__(self, version: str):
        self.version = version


class CommandMapperRegistry:
    """
    Registry for all feature mappers.

    This allows the system to automatically discover and use all
    available mappers without manual configuration.

    Supports both direct mapper classes and factory functions for
    version-specific mapper selection.
    """

    _features: Dict[str, Union[Type[BaseFeatureMapper], Callable[[str], BaseFeatureMapper]]] = {}

    @classmethod
    def register_feature(
        cls,
        name: str,
        mapper_or_factory: Union[Type[BaseFeatureMapper], Callable[[str], BaseFeatureMapper]]
    ):
        """
        Register a feature mapper class or factory function.

        Args:
            name: Feature identifier (e.g., "interface_ethernet")
            mapper_or_factory: Either:
                - A mapper class (will be instantiated with version)
                - A factory function that takes version and returns mapper instance

        Examples:
            # Register a class
            CommandMapperRegistry.register_feature("interface_dummy", DummyInterfaceMapper)

            # Register a factory function
            CommandMapperRegistry.register_feature("interface_ethernet", get_ethernet_mapper)
        """
        cls._features[name] = mapper_or_factory

    @classmethod
    def get_mapper(cls, feature: str, version: str) -> BaseFeatureMapper:
        """
        Get a mapper instance for a specific feature and version.

        Args:
            feature: Feature identifier
            version: VyOS version string (e.g., "1.4", "1.5")

        Returns:
            Mapper instance for the specified feature and version
        """
        if feature not in cls._features:
            raise ValueError(f"Unknown feature: {feature}")

        mapper_or_factory = cls._features[feature]

        # Check if it's a class or a callable factory
        if isinstance(mapper_or_factory, type):
            # It's a class - instantiate it
            return mapper_or_factory(version)
        else:
            # It's a factory function - call it
            return mapper_or_factory(version)

    @classmethod
    def get_all_mappers(cls, version: str) -> Dict[str, BaseFeatureMapper]:
        """
        Get all mapper instances for a specific version.

        Args:
            version: VyOS version string (e.g., "1.4", "1.5")

        Returns:
            Dictionary mapping feature names to mapper instances
        """
        return {
            name: cls.get_mapper(name, version)
            for name in cls._features.keys()
        }
