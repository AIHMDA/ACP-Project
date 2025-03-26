import unittest
from schedule_agent import ScheduleAgent

class TestScheduleAgent(unittest.TestCase):
    def test_update_schedule(self):
        agent = ScheduleAgent()
        new_schedule = {'day': 'Monday', 'time': '10:00 AM'}
        agent.update_schedule(new_schedule)
        self.assertEqual(agent.schedule, new_schedule)

if __name__ == '__main__':
    unittest.main()