# config/clickhouse.py
import os
import logging
import clickhouse_connect
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv() # Load .env from the project root

CLICKHOUSE_HOST = os.getenv('CLICKHOUSE_HOST') # Sensible defaults
CLICKHOUSE_PORT_STR = os.getenv('CLICKHOUSE_PORT_STR')
CLICKHOUSE_USER = os.getenv('CLICKHOUSE_USER')
CLICKHOUSE_PASSWORD = os.getenv('CLICKHOUSE_PASSWORD')
CLICKHOUSE_DATABASE = os.getenv('CLICKHOUSE_DATABASE')
CLICKHOUSE_SECURE_STR = os.getenv('CLICKHOUSE_SECURE_STR')
CLICKHOUSE_VERIFY_STR = os.getenv('CLICKHOUSE_VERIFY_STR')



# Remove global client and connection_error
# Always create a new client for each call

def get_clickhouse_client():
    """Return a new ClickHouse client instance for each call (thread-safe)."""
    try:
        logger.info(f"Connecting to ClickHouse at {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT_STR} (secure={CLICKHOUSE_SECURE_STR}, verify={CLICKHOUSE_VERIFY_STR})")
        client = clickhouse_connect.get_client(
            host=CLICKHOUSE_HOST,
            port=int(CLICKHOUSE_PORT_STR),
            username=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            database=CLICKHOUSE_DATABASE,
            secure=CLICKHOUSE_SECURE_STR.lower() == 'true',
            verify=CLICKHOUSE_VERIFY_STR.lower() == 'true',
            connect_timeout=10,
            send_receive_timeout=60
        )
        # Test the connection
        client.query("SELECT 1")
        logger.info("Successfully connected to ClickHouse")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to ClickHouse: {str(e)}")
        raise