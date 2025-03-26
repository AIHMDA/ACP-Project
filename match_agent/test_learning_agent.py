import unittest
from learning_agent.learning_agent import LearningAgent

class TestLearningAgent(unittest.TestCase):
    def test_evaluate_student(self):
        # Create an instance of LearningAgent
        agent = LearningAgent("TestAgent")

        # Define a student performance to evaluate
        student_performance = {
            "name": "John Doe",
            "grades": [90, 85, 75, 80],
            "attendance": 95
        }

        # Call the evaluate_student method
        evaluation = agent.evaluate_student(student_performance)

        # Check if the evaluation is as expected
        self.assertEqual(evaluation, "John Doe is performing well.")

if __name__ == "__main__":
    unittest.main()