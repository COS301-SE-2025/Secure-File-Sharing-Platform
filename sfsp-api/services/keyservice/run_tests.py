import unittest
import sys

# Import test modules
from tests.test_store_key import TestStoreKeyEndpoint
from tests.test_retrieve_key import TestRetrieveKeyEndpoint
from tests.test_delete_key import TestDeleteKeyEndpoint
from tests.test_base import TestHealthEndpoint

if __name__ == '__main__':
    # Create a test loader
    loader = unittest.TestLoader()
    
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add test cases to the suite
    suite.addTest(loader.loadTestsFromTestCase(TestHealthEndpoint))
    suite.addTest(loader.loadTestsFromTestCase(TestStoreKeyEndpoint))
    suite.addTest(loader.loadTestsFromTestCase(TestRetrieveKeyEndpoint))
    suite.addTest(loader.loadTestsFromTestCase(TestDeleteKeyEndpoint))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with non-zero status if there were failures
    sys.exit(not result.wasSuccessful())
