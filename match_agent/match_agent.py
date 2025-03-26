class MatchAgent:
    def __init__(self):
        # Initialize the agent with necessary configurations
        pass

    def distribute_tasks(self, students, tasks):
        assigned_tasks = {}
        sorted_students = sorted(students, key=lambda x: x['skill_level'], reverse=True)
        sorted_tasks = sorted(tasks, key=lambda x: x['difficulty'], reverse=True)

        for task in sorted_tasks:
            best_student = sorted_students[0]
            assigned_tasks[task['id']] = best_student['id']
            sorted_students = sorted_students[1:] + [sorted_students[0]]

        return assigned_tasks

# Example usage
if __name__ == "__main__":
    agent = MatchAgent()
    tasks = [{"id": 1, "difficulty": 5}, {"id": 2, "difficulty": 3}]
    students = [{"id": 101, "skill_level": 4}, {"id": 102, "skill_level": 6}]
    print(agent.distribute_tasks(students, tasks))