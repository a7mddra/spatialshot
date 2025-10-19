import pytest
import platform
import os
import sys
from unittest.mock import MagicMock, patch
from pathlib import Path
from launcher import TMP_PATH_UNIX, TMP_PATH_WIN

@pytest.fixture
def mock_platform():
    """Mock platform.system() and related functions."""
    with patch("platform.system") as mock_system:
        yield mock_system

@pytest.fixture
def mock_os_environ():
    """Mock os.environ for display server detection."""
    with patch("os.environ", new={"XDG_SESSION_TYPE": "", "WAYLAND_DISPLAY": "", "DISPLAY": ""}):
        yield os.environ

@pytest.fixture
def mock_subprocess_run():
    """Mock subprocess.run for process execution."""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="",
            stderr=""
        )
        yield mock_run

@pytest.fixture
def mock_subprocess_popen():
    """Mock subprocess.Popen for Electron launch."""
    with patch("subprocess.Popen") as mock_popen:
        mock_popen.return_value = MagicMock()
        yield mock_popen

@pytest.fixture
def mock_shutil():
    """Mock shutil.rmtree and shutil.mkdir."""
    with patch("shutil.rmtree") as mock_rmtree, patch("pathlib.Path.mkdir") as mock_mkdir:
        yield mock_rmtree, mock_mkdir

@pytest.fixture
def mock_path_exists():
    """Mock Path.exists for file/directory checks."""
    with patch("pathlib.Path.exists") as mock_exists:
        mock_exists.return_value = True
        yield mock_exists

@pytest.fixture
def mock_glob():
    """Mock glob.glob for file searching."""
    with patch("glob.glob") as mock_glob:
        yield mock_glob

@pytest.fixture
def mock_time():
    """Mock time.time and time.sleep for timeouts."""
    with patch("time.time") as mock_time, patch("time.sleep") as mock_sleep:
        mock_time.side_effect = range(100)  # Simulate time progression
        yield mock_time, mock_sleep

@pytest.fixture
def tmp_path_platform():
    """Provide platform-specific temporary path."""
    return TMP_PATH_WIN if sys.platform == "win32" else TMP_PATH_UNIX

@pytest.fixture
def mock_sys_exit():
    """Mock sys.exit to prevent tests from exiting."""
    with patch("sys.exit") as mock_exit:
        yield mock_exit
