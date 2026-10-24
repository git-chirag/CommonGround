import pytest


@pytest.fixture(autouse=True)
def _no_real_subprocess(monkeypatch):
    """Safety net: no test may run a real process (and so never the real Kiro CLI).
    Tests that need subprocess behavior patch `app.llm.kiro_cli.subprocess.run` themselves."""

    def refuse(*_args, **_kwargs):
        raise AssertionError("Tests must not start real subprocesses; patch subprocess.run.")

    monkeypatch.setattr("app.llm.kiro_cli.subprocess.run", refuse)
