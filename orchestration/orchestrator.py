import datetime

class Orchestrator:
    """
    Coordinates agent activities by analyzing tasks, selecting appropriate agents,
    and managing workflows between multiple agents.
    """

    def __init__(self, agent_registry, decision_auditor=None):
        """
        Initialize the orchestrator.

        Args:
            agent_registry (AgentRegistry): Registry of available agents
            decision_auditor (DecisionAuditor, optional): For logging decisions
        """
        self.registry = agent_registry
        self.auditor = decision_auditor
        self.active_workflows = {}  # workflow_id -> workflow_state

    def analyze_task(self, task_description):
        """
        Analyze a task to determine required capabilities.

        Args:
            task_description (dict): Description of the task to be performed

        Returns:
            list: Required capabilities to complete the task
        """
        # Basic implementation - in a real system this might use NLP or rules
        required_capabilities = []

        if "capabilities" in task_description:
            required_capabilities = task_description["capabilities"]
        else:
            # Default capability extraction based on task type
            task_type = task_description.get("type", "unknown")
            if task_type == "schedule_update":
                required_capabilities = ["update_calendar"]
            elif task_type == "task_assignment":
                required_capabilities = ["evaluate", "assign"]
            elif task_type == "learning_assessment":
                required_capabilities = ["analyze", "suggest_module"]

        return required_capabilities

    def select_agents(self, required_capabilities, min_trust_level=0.5):
        """
        Select appropriate agents based on required capabilities.

        Args:
            required_capabilities (list): Capabilities needed for the task
            min_trust_level (float): Minimum trust level for selected agents

        Returns:
            dict: Mapping of capability -> agent_id
        """
        selected_agents = {}

        for capability in required_capabilities:
            # Find agents with this capability
            agents = self.registry.discover_agents_by_capability(capability, min_trust_level)

            if not agents:
                # No agent found with required capability
                continue

            # For simplicity, select the first available agent
            # In a more advanced system, this could use more sophisticated selection
            selected_agents[capability] = agents[0]

        return selected_agents

    def create_workflow(self, task_description):
        """
        Create a new workflow for a task.

        Args:
            task_description (dict): Description of the task

        Returns:
            str: Workflow ID
        """
        # Analyze task to determine required capabilities
        required_capabilities = self.analyze_task(task_description)

        # Select agents for each capability
        selected_agents = self.select_agents(required_capabilities)

        # Check if we have all needed agents
        missing_capabilities = [cap for cap in required_capabilities if cap not in selected_agents]
        if missing_capabilities:
            raise ValueError(f"Missing agents for capabilities: {missing_capabilities}")

        # Create workflow
        workflow_id = f"workflow_{len(self.active_workflows) + 1}"
        workflow = {
            "id": workflow_id,
            "task": task_description,
            "agents": selected_agents,
            "status": "created",
            "created_at": datetime.datetime.now().isoformat(),
            "steps": []
        }

        self.active_workflows[workflow_id] = workflow

        # Audit this decision if auditor is available
        if self.auditor:
            self.auditor.log_decision(
                agent_id="orchestrator",
                decision_type="workflow_creation",
                inputs={"task": task_description, "required_capabilities": required_capabilities},
                outputs={"workflow_id": workflow_id, "selected_agents": selected_agents}
            )

        return workflow_id

    def execute_workflow(self, workflow_id):
        """
        Execute a workflow by coordinating agent activities.

        Args:
            workflow_id (str): ID of the workflow to execute

        Returns:
            dict: Results of the workflow execution
        """
        if workflow_id not in self.active_workflows:
            raise ValueError(f"Workflow {workflow_id} not found")

        workflow = self.active_workflows[workflow_id]
        workflow["status"] = "running"

        # In a real implementation, this would coordinate the actual agent activities
        # For now, we'll simulate the workflow execution

        workflow["status"] = "completed"
        workflow["completed_at"] = datetime.datetime.now().isoformat()

        # Audit workflow completion
        if self.auditor:
            self.auditor.log_decision(
                agent_id="orchestrator",
                decision_type="workflow_completion",
                inputs={"workflow_id": workflow_id},
                outputs={"status": "completed"}
            )

        return {"status": "completed", "workflow_id": workflow_id}

    def get_workflow_status(self, workflow_id):
        """
        Get the current status of a workflow.

        Args:
            workflow_id (str): ID of the workflow

        Returns:
            dict: Current state of the workflow
        """
        if workflow_id not in self.active_workflows:
            raise ValueError(f"Workflow {workflow_id} not found")

        return self.active_workflows[workflow_id]