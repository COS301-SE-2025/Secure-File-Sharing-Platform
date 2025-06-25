#!/usr/bin/env python
"""
Script to run tests with coverage reporting.
"""
import sys
import pytest

if __name__ == "__main__":
    # Run pytest with coverage options
    sys.exit(
        pytest.main([
            "--cov=routes",
            "--cov=services",
            "--cov=utils",
            "--cov-report=term",  # Terminal report
            "--cov-report=html:coverage_html",  # HTML report
            "-v",  # Verbose output
            "tests/"  # Test directory
        ])
    )
