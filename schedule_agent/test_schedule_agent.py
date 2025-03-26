import unittest
from schedule_agent import ScheduleAgent

class TestScheduleAgent(unittest.TestCase):
    def test_update_schedule(self):
        # Create a ScheduleAgent instance
        agent = ScheduleAgent()

        # Define a sample schedule
        sample_schedule = {'Monday': ['Math', 'Science'], 'Tuesday': ['English', 'Art']}

        # Update the schedule
        agent.update_schedule(sample_schedule)

        # Check if the schedule is updated correctly
        self.assertEqual(agent.schedule, sample_schedule)

if __name__ == '__main__':
    unittest.main()