import hvac
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class VaultClient:
    def __init__(self, url=None, token=None):
        self.url = url or os.getenv('VAULT_URL', 'http://localhost:8200')
        self.token = token or os.getenv('VAULT_TOKEN')
        if not self.token:
            raise ValueError("Missing Vault token.")
        self.client = hvac.Client(url=self.url, token=self.token)
        try:
            assert self.client.is_authenticated()
            logger.info(f"Successfully authenticated with Vault at {self.url}")
        except Exception as e:
            logger.error(f"Failed to authenticate with Vault: {e}")
            raise

    def write_private_key_bundle(self, encrypted_id, spk_private_key, ik_private_key, opks_private):
        path = f'userkeys/{encrypted_id}'
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret={
                    'spk_private_key': spk_private_key,
                    'ik_private_key': ik_private_key,
                    'opks_private': opks_private
                }
            )
            msg = f"ID: {encrypted_id[:8]}... key bundle stored successfully"
            logger.info(msg)
            return True
        except Exception as e:
            logger.error(f"Failed to store key bundle: {e}")
            return False

    def read_private_key_bundle(self, encrypted_id):
        path = f'userkeys/{encrypted_id}'
        try:
            read_response = self.client.secrets.kv.v2.read_secret_version(path=path)
            msg = f"ID: {encrypted_id[:8]}... key bundle retrieved successfully"
            logger.info(msg)
            return read_response['data']['data']
        except Exception as e:
            logger.error(f"Failed to retrieve key bundle: {e}")
            return None

    def delete_private_key(self, encrypted_id):
        path = f'userkeys/{encrypted_id}'
        try:
            self.client.secrets.kv.v2.delete_metadata_and_all_versions(path=path)
            msg = f"ID: {encrypted_id[:8]}... key bundle deleted successfully"
            logger.info(msg)
            return True
        except Exception as e:
            logger.error(f"Failed to delete key bundle: {e}")
            return False


_vault_instance = None


def get_vault_client():
    global _vault_instance
    if _vault_instance is None:
        try:
            _vault_instance = VaultClient()
        except Exception as e:
            logger.error(f"Failed to initialize Vault client: {e}")
            _vault_instance = None
    return _vault_instance
