import unittest
from match_agent import MatchAgent

class TestMatchAgent(unittest.TestCase):
    def test_create_match_agent(self):
        match_agent = MatchAgent()
        self.assertIsNotNone(match_agent)
        self.assertIsInstance(match_agent, MatchAgent)

if __name__ == '__main__':
    unittest.main()