import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("API_KEY", "test-api-key")

from app.worker.incidents import MonitorState, decide_transition


def s(status, fails=0, succ=0):
    return MonitorState(status=status, consecutive_failures=fails, consecutive_successes=succ)


# --- false-down protection: a single failure must NOT open an incident ---

def test_first_failure_is_suspicious_not_down():
    d = decide_transition(s("UP"), "DOWN")
    assert d.status == "WARN"
    assert d.consecutive_failures == 1
    assert d.action == "NONE"          # no incident on the first failure


def test_second_consecutive_failure_marks_down_and_opens_incident():
    d = decide_transition(s("WARN", fails=1), "DOWN")
    assert d.status == "DOWN"
    assert d.consecutive_failures == 2
    assert d.action == "OPEN_INCIDENT"
    assert d.status_changed is True


def test_no_duplicate_incident_when_already_down():
    d = decide_transition(s("DOWN", fails=5), "DOWN")
    assert d.status == "DOWN"
    assert d.action == "NONE"          # already down -> do not open a second incident


# --- recovery ---

def test_success_after_down_resolves_incident():
    d = decide_transition(s("DOWN", fails=3), "UP")
    assert d.status == "UP"
    assert d.consecutive_failures == 0
    assert d.consecutive_successes == 1
    assert d.action == "RESOLVE_INCIDENT"
    assert d.status_changed is True


def test_success_after_single_failure_resets_without_incident():
    # WARN came from one failure; recovering needs no incident resolution
    d = decide_transition(s("WARN", fails=1), "UP")
    assert d.status == "UP"
    assert d.consecutive_failures == 0
    assert d.action == "NONE"


# --- steady states ---

def test_up_stays_up():
    d = decide_transition(s("UP", succ=10), "UP")
    assert d.status == "UP"
    assert d.consecutive_successes == 11
    assert d.action == "NONE"
    assert d.status_changed is False


def test_degraded_warn_check_is_a_success_path():
    # A WARN check (e.g. SSL expiring) is responding -> treated as success, no incident
    d = decide_transition(s("UP"), "WARN")
    assert d.status == "WARN"
    assert d.consecutive_failures == 0
    assert d.action == "NONE"


def test_pending_monitor_first_failure_is_suspicious():
    d = decide_transition(s("PENDING"), "DOWN")
    assert d.status == "WARN"
    assert d.action == "NONE"


def test_custom_threshold_of_three():
    d2 = decide_transition(s("WARN", fails=1), "DOWN", failure_threshold=3)
    assert d2.status == "WARN" and d2.action == "NONE"      # 2nd failure, still suspicious
    d3 = decide_transition(s("WARN", fails=2), "DOWN", failure_threshold=3)
    assert d3.status == "DOWN" and d3.action == "OPEN_INCIDENT"  # 3rd failure trips
