/**
 * Validation utilities for wizard forms
 */

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate app name
 */
export function validateAppName(name: string): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return {
      field: 'name',
      message: 'App name is required',
      type: 'error'
    };
  }

  if (name.trim().length < 2) {
    return {
      field: 'name',
      message: 'App name must be at least 2 characters',
      type: 'error'
    };
  }

  if (name.trim().length > 50) {
    return {
      field: 'name',
      message: 'App name must be 50 characters or less',
      type: 'error'
    };
  }

  // Check for invalid characters
  const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNameRegex.test(name)) {
    return {
      field: 'name',
      message: 'App name can only contain letters, numbers, spaces, hyphens, and underscores',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate app description
 */
export function validateDescription(description: string): ValidationError | null {
  if (!description || description.trim().length === 0) {
    return {
      field: 'description',
      message: 'Description is required',
      type: 'error'
    };
  }

  if (description.trim().length < 10) {
    return {
      field: 'description',
      message: 'Description must be at least 10 characters',
      type: 'error'
    };
  }

  if (description.trim().length > 500) {
    return {
      field: 'description',
      message: 'Description must be 500 characters or less',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate app purpose
 */
export function validatePurpose(purpose: string): ValidationError | null {
  if (!purpose || purpose.trim().length === 0) {
    return {
      field: 'purpose',
      message: 'Purpose is required',
      type: 'error'
    };
  }

  if (purpose.trim().length < 10) {
    return {
      field: 'purpose',
      message: 'Purpose must be at least 10 characters',
      type: 'error'
    };
  }

  if (purpose.trim().length > 300) {
    return {
      field: 'purpose',
      message: 'Purpose must be 300 characters or less',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate target users
 */
export function validateTargetUsers(users: string): ValidationError | null {
  if (!users || users.trim().length === 0) {
    return {
      field: 'targetUsers',
      message: 'Target users is required',
      type: 'error'
    };
  }

  if (users.trim().length < 5) {
    return {
      field: 'targetUsers',
      message: 'Target users must be at least 5 characters',
      type: 'error'
    };
  }

  if (users.trim().length > 200) {
    return {
      field: 'targetUsers',
      message: 'Target users must be 200 characters or less',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate feature name
 */
export function validateFeatureName(
  name: string,
  existingFeatures: Array<{ name: string }>
): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return {
      field: 'featureName',
      message: 'Feature name is required',
      type: 'error'
    };
  }

  if (name.trim().length < 2) {
    return {
      field: 'featureName',
      message: 'Feature name must be at least 2 characters',
      type: 'error'
    };
  }

  if (name.trim().length > 50) {
    return {
      field: 'featureName',
      message: 'Feature name must be 50 characters or less',
      type: 'error'
    };
  }

  // Check for duplicate names
  const isDuplicate = existingFeatures.some(
    (f) => f.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (isDuplicate) {
    return {
      field: 'featureName',
      message: 'A feature with this name already exists',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate feature description
 */
export function validateFeatureDescription(description: string): ValidationError | null {
  if (!description || description.trim().length === 0) {
    return {
      field: 'featureDescription',
      message: 'Feature description is required',
      type: 'error'
    };
  }

  if (description.trim().length < 10) {
    return {
      field: 'featureDescription',
      message: 'Feature description must be at least 10 characters',
      type: 'error'
    };
  }

  if (description.trim().length > 300) {
    return {
      field: 'featureDescription',
      message: 'Feature description must be 300 characters or less',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate features array
 */
export function validateFeatures(
  features: Array<{ name: string; description: string }>
): ValidationError | null {
  if (!features || features.length === 0) {
    return {
      field: 'features',
      message: 'At least one feature is required',
      type: 'error'
    };
  }

  if (features.length > 20) {
    return {
      field: 'features',
      message: 'Maximum 20 features allowed',
      type: 'warning'
    };
  }

  return null;
}

/**
 * Validate color (hex format)
 */
export function validateColor(color: string): ValidationError | null {
  if (!color) {
    return null; // Color is optional
  }

  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorRegex.test(color)) {
    return {
      field: 'color',
      message: 'Invalid color format. Use hex format (e.g., #3B82F6)',
      type: 'error'
    };
  }

  return null;
}

/**
 * Validate basic info step
 */
export function validateBasicInfo(data: {
  name: string;
  description: string;
  purpose: string;
  targetUsers: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const nameError = validateAppName(data.name);
  if (nameError) errors.push(nameError);

  const descriptionError = validateDescription(data.description);
  if (descriptionError) errors.push(descriptionError);

  const purposeError = validatePurpose(data.purpose);
  if (purposeError) errors.push(purposeError);

  const targetUsersError = validateTargetUsers(data.targetUsers);
  if (targetUsersError) errors.push(targetUsersError);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get character count info
 */
export function getCharacterCount(
  text: string,
  limit: number
): {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
} {
  const current = text?.length || 0;
  const remaining = limit - current;
  const percentage = Math.min(100, (current / limit) * 100);

  return {
    current,
    limit,
    remaining,
    percentage,
    isOverLimit: current > limit,
    isNearLimit: percentage >= 80 && percentage < 100
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '');
}
