"""
Agent Discovery Module

Provides mechanisms for dynamically discovering agents in the ACP ecosystem.
Extends basic registry functionality with more advanced discovery patterns.
"""

import datetime

class AgentDiscovery:
    """
    Enhanced agent discovery mechanisms beyond basic registry lookups.
    Supports dynamic discovery patterns and advanced filtering.
    """

    def __init__(self, agent_registry):
        """
        Initialize the discovery service.

        Args:
            agent_registry (AgentRegistry): Reference to the agent registry
        """
        self.registry = agent_registry
        self.discovery_cache = {}  # Cache for discovery results
        self.cache_expiry = 300  # Cache expiry in seconds (5 minutes)

    def discover_by_capability_pattern(self, pattern):
        """
        Find agents with capabilities matching a pattern.

        Args:
            pattern (str): Pattern to match against capabilities

        Returns:
            list: Agent IDs with matching capabilities
        """
        matching_agents = []

        # Check all agents in registry
        for agent_id, agent_data in self.registry.agents.items():
            for capability in agent_data["capabilities"]:
                if pattern in capability:
                    matching_agents.append(agent_id)
                    break

        return matching_agents

    def discover_complementary_agents(self, agent_id):
        """
        Find agents with complementary capabilities to the specified agent.

        Args:
            agent_id (str): Reference agent to find complements for

        Returns:
            list: Agent IDs with complementary capabilities
        """
        if agent_id not in self.registry.agents:
            return []

        # Get reference agent's capabilities
        ref_capabilities = set(self.registry.agents[agent_id]["capabilities"])
        complementary_agents = []

        # Find agents with non-overlapping capabilities
        for other_id, other_data in self.registry.agents.items():
            if other_id == agent_id:
                continue

            other_capabilities = set(other_data["capabilities"])
            # If this agent has capabilities the reference doesn't have
            if other_capabilities - ref_capabilities:
                complementary_agents.append(other_id)

        return complementary_agents

    def discover_by_metadata(self, metadata_key, metadata_value):
        """
        Find agents with specific metadata values.

        Args:
            metadata_key (str): Key to search in metadata
            metadata_value: Value to match

        Returns:
            list: Agent IDs with matching metadata
        """
        matching_agents = []

        for agent_id, agent_data in self.registry.agents.items():
            if "metadata" in agent_data and agent_data["metadata"]:
                if metadata_key in agent_data["metadata"] and agent_data["metadata"][metadata_key] == metadata_value:
                    matching_agents.append(agent_id)

        return matching_agents

    def get_capability_distribution(self):
        """
        Get distribution of capabilities across agents.

        Returns:
            dict: Mapping of capability -> count of agents
        """
        distribution = {}

        for capability, agents in self.registry.capabilities_index.items():
            distribution[capability] = len(agents)

        return distribution

    def _get_from_cache(self, cache_key):
        """
        Get result from cache if available and not expired.

        Args:
            cache_key (str): Cache key to look up

        Returns:
            object or None: Cached result or None if not found/expired
        """
        if cache_key not in self.discovery_cache:
            return None

        cache_entry = self.discovery_cache[cache_key]
        cached_time = cache_entry["timestamp"]
        current_time = datetime.datetime.now()

        # Check if cache has expired
        if (current_time - cached_time).total_seconds() > self.cache_expiry:
            # Cache expired
            return None

        return cache_entry["result"]

    def _add_to_cache(self, cache_key, result):
        """
        Add a result to the discovery cache.

        Args:
            cache_key (str): Cache key to store result under
            result: Result to cache
        """
        self.discovery_cache[cache_key] = {
            "timestamp": datetime.datetime.now(),
            "result": result
        }