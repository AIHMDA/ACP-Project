import unittest
from match_agent import MatchAgent

class TestMatchAgent(unittest.TestCase):
    def setUp(self):
        self.match_agent = MatchAgent()
        self.students = [
            {'id': 1, 'availability': 5, 'skill_level': 3},
            {'id': 2, 'availability': 3, 'skill_level': 4},
            {'id': 3, 'availability': 2, 'skill_level': 2}
        ]
        self.tasks = [
            {'id': 101, 'difficulty': 3},
            {'id': 102, 'difficulty': 2},
            {'id': 103, 'difficulty': 4}
        ]

    def test_distribute_tasks(self):
        assigned_tasks = self.match_agent.distribute_tasks(self.students, self.tasks)
        # Check that each task is assigned to a student
        self.assertEqual(len(assigned_tasks), len(self.tasks))
        # Check that each student has at least one task
        student_task_counts = {student['id']: 0 for student in self.students}
        for task, student_id in assigned_tasks.items():
            student_task_counts[student_id] += 1
        self.assertTrue(all(count > 0 for count in student_task_counts.values()))

if __name__ == '__main__':
    unittest.main()