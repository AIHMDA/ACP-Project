from schedule_agent import ScheduleAgent
from match_agent import MatchAgent
from learning_agent import LearningAgent

# Initialize agents
schedule_agent = ScheduleAgent()
match_agent = MatchAgent()
learning_agent = LearningAgent()

# Simulate interactions
project_id = "example_project_id"
updates = {"task": "Update task details"}
schedule_agent.update_schedule(project_id, updates)

tasks = ["Task 1", "Task 2"]
workers = ["Worker A", "Worker B"]
match_agent.distribute_tasks(tasks, workers)

student_id = "student_123"
performance_data = {"scores": [85, 90, 78]}
learning_agent.evaluate_student(student_id, performance_data)