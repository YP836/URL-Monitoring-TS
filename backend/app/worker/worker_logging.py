import json
import logging
from datetime import datetime

from celery.signals import setup_logging


class JsonLineFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload)


@setup_logging.connect
def configure_worker_logging(**kwargs) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLineFormatter())

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    logging.getLogger("celery.beat").setLevel(logging.WARNING)
    logging.getLogger("kombu").setLevel(logging.WARNING)
