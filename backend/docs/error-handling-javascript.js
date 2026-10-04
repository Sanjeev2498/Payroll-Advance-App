
// JavaScript/TypeScript error handling example
async function handleApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    return response.data;
  } catch (error) {
    if (error.response) {
      const { statusCode, error: errorDetails } = error.response.data;
      
      switch (errorDetails.code) {
        case 'TOKEN_EXPIRED':
          // Refresh token and retry
          await refreshAuthToken();
          return handleApiCall(apiFunction);
          
        case 'AUTHORIZATION_FAILED':
          // Redirect to unauthorized page
          window.location.href = '/unauthorized';
          break;
          
        case 'VALIDATION_ERROR':
          // Display field-specific errors
          displayValidationErrors(errorDetails.details.fields);
          break;
          
        case 'RATE_LIMIT_EXCEEDED':
          // Wait and retry
          const retryAfter = errorDetails.details.retryAfter;
          setTimeout(() => handleApiCall(apiFunction), retryAfter * 1000);
          break;
          
        default:
          // Log error and show generic message
          console.error('API Error:', errorDetails);
          showErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
    throw error;
  }
}
      