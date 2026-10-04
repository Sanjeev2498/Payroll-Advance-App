
# Python error handling example
import requests
import time
from typing import Dict, Any

class APIClient:
    def handle_api_call(self, api_function):
        try:
            response = api_function()
            response.raise_for_status()
            return response.json()
        except requests.HTTPError as e:
            error_data = e.response.json()
            error_code = error_data.get('error', {}).get('code')
            
            if error_code == 'TOKEN_EXPIRED':
                self.refresh_auth_token()
                return self.handle_api_call(api_function)
            elif error_code == 'AUTHORIZATION_FAILED':
                raise PermissionError("Insufficient permissions")
            elif error_code == 'VALIDATION_ERROR':
                raise ValueError(f"Validation failed: {error_data}")
            elif error_code == 'RATE_LIMIT_EXCEEDED':
                retry_after = error_data.get('error', {}).get('details', {}).get('retryAfter', 60)
                time.sleep(retry_after)
                return self.handle_api_call(api_function)
            else:
                raise Exception(f"API Error: {error_data}")
      