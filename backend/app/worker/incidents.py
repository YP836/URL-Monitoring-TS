"""Pure incident state machine with false-down protection.

A single failed probe is often a transient blip (DNS hiccup, a dropped packet,
a brief 5xx). Opening an incident on the first failure produces noisy, false
"down" alerts. So we require N consecutive failures before declaring DOWN:

  - 1st failure        -> WARN (suspicious), no incident
  - Nth failure (N=2)  -> DOWN + open incident (only if not already DOWN)
  - any success        -> reset failure streak; if we were DOWN, resolve

This module is intentionally pure (no DB, no I/O) so the transition logic is
trivially unit-testable. The worker maps the decision onto SQL.
"""
from dataclasses import dataclass

DEFAULT_FAILURE_THRESHOLD = 2

# Actions the worker must carry out for an incident as a result of a transition.
OPEN_INCIDENT = "OPEN_INCIDENT"
RESOLVE_INCIDENT = "RESOLVE_INCIDENT"
NONE = "NONE"


@dataclass
class MonitorState:
    status: str  # current persisted status: UP | WARN | DOWN | PENDING
    consecutive_failures: int = 0
    consecutive_successes: int = 0


@dataclass
class TransitionDecision:
    status: str
    consecutive_failures: int
    consecutive_successes: int
    action: str  # OPEN_INCIDENT | RESOLVE_INCIDENT | NONE
    status_changed: bool


def decide_transition(
    state: MonitorState,
    check_status: str,
    *,
    failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
) -> TransitionDecision:
    """Compute the next monitor state from the latest check.

    check_status is the worst status across the monitor's checks: a hard
    failure is "DOWN"; "UP" and "WARN" (degraded but responding) are successes.
    """
    is_failure = check_status == "DOWN"

    if is_failure:
        failures = state.consecutive_failures + 1
        successes = 0
        if failures >= failure_threshold:
            new_status = "DOWN"
            # Open exactly one incident on the UP/WARN/PENDING -> DOWN edge.
            action = OPEN_INCIDENT if state.status != "DOWN" else NONE
        else:
            new_status = "WARN"  # suspicious; not yet an incident
            action = NONE
    else:
        failures = 0
        successes = state.consecutive_successes + 1
        new_status = check_status  # UP, or WARN for a degraded-but-up signal
        # Resolve only if we were actually DOWN (an incident is open).
        action = RESOLVE_INCIDENT if state.status == "DOWN" else NONE

    return TransitionDecision(
        status=new_status,
        consecutive_failures=failures,
        consecutive_successes=successes,
        action=action,
        status_changed=new_status != state.status,
    )
