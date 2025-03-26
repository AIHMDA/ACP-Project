class AgentRegistry:
  """
  Central registry for managing agents in the ACP ecosystem.
  Handles registration, discovery and capability management.
  """

  def __init__(self, config=None):
      """
      Initialize the agent registry.

      Args:
          config (dict, optional): Configuration parameters for the registry
      """
      self.agents = {}  # Dictionary of agent_id -> agent_details
      self.capabilities_index = {}  # Index of capability -> [agent_ids]
      self.config = config or {}

  def register_agent(self, agent_id, capabilities, metadata=None):
      """
      Register a new agent with the system.

      Args:
          agent_id (str): Unique identifier for the agent
          capabilities (list): List of capabilities the agent provides
          metadata (dict, optional): Additional agent information

      Returns:
          bool: Success of registration

      Raises:
          ValueError: If agent_id already exists or capabilities are invalid
      """
      pass

  def unregister_agent(self, agent_id):
      """
      Remove an agent from the registry.

      Args:
          agent_id (str): Agent identifier to remove

      Returns:
          bool: Success of unregistration
      """
      pass

  def update_agent_capabilities(self, agent_id, capabilities):
      """
      Update the capabilities of an existing agent.

      Args:
          agent_id (str): Agent to update
          capabilities (list): New capability list

      Returns:
          bool: Success of update
      """
      pass

  def discover_agents_by_capability(self, capability, min_trust_level=0):
      """
      Find agents that can provide a specific capability.

      Args:
          capability (str): The capability to search for
          min_trust_level (float, optional): Minimum trust level required

      Returns:
          list: List of agent_ids that provide the capability
      """
      pass

  def get_agent_details(self, agent_id):
      """
      Retrieve full details about an agent.

      Args:
          agent_id (str): Agent to get details for

      Returns:
          dict: Complete agent information
      """
      pass

  def _validate_capabilities(self, capabilities):
      """
      Internal method to validate capabilities against schema.

      Args:
          capabilities (list): Capabilities to validate

      Returns:
          bool: Validation result
      """
      pass
