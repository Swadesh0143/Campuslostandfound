// Validation & Input Sanitization
const ALLOWED_CATEGORIES = [
  'electronics',
  'bags',
  'id_cards',
  'books',
  'clothing',
  'keys',
  'accessories',
  'other',
];

const ALLOWED_STATUSES = ['active', 'under_review', 'returned', 'archived'];

const ALLOWED_REPORT_REASONS = [
  'spam',
  'offensive',
  'inaccurate',
  'sensitive_info',
  'other',
];

/**
 * Basic HTML tag stripping for text sanitization
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validates an item creation or update payload
 */
export function validateItemInput(data, isCreate = true) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  // Type: 'lost' or 'found'
  if (isCreate || data.type !== undefined) {
    if (!['lost', 'found'].includes(data.type)) {
      errors.push("Field 'type' must be either 'lost' or 'found'");
    }
  }

  // Name: 3 - 100 chars
  if (isCreate || data.name !== undefined) {
    const name = sanitizeText(data.name);
    if (!name || name.length < 3 || name.length > 100) {
      errors.push("Field 'name' is required and must be between 3 and 100 characters");
    }
  }

  // Category
  if (isCreate || data.category !== undefined) {
    if (!data.category || !ALLOWED_CATEGORIES.includes(data.category)) {
      errors.push(`Field 'category' must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
    }
  }

  // Description: 5 - 1000 chars
  if (isCreate || data.description !== undefined) {
    const desc = sanitizeText(data.description);
    if (!desc || desc.length < 5 || desc.length > 1000) {
      errors.push("Field 'description' is required and must be between 5 and 1000 characters");
    }
  }

  // Location: 2 - 100 chars
  if (isCreate || data.location !== undefined) {
    const loc = sanitizeText(data.location);
    if (!loc || loc.length < 2 || loc.length > 100) {
      errors.push("Field 'location' is required and must be between 2 and 100 characters");
    }
  }

  // Event Date: YYYY-MM-DD
  if (isCreate || data.eventDate !== undefined) {
    if (!data.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) {
      errors.push("Field 'eventDate' must be in ISO format (YYYY-MM-DD)");
    } else {
      const parsed = new Date(data.eventDate);
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (isNaN(parsed.getTime()) || parsed < oneYearAgo || parsed > tomorrow) {
        errors.push("Field 'eventDate' must be a valid date within the last year and not in the future");
      }
    }
  }

  // Contact Name: 2 - 50 chars
  if (isCreate || data.contactName !== undefined) {
    const cName = sanitizeText(data.contactName);
    if (!cName || cName.length < 2 || cName.length > 50) {
      errors.push("Field 'contactName' is required and must be between 2 and 50 characters");
    }
  }

  // Contact Method: 3 - 100 chars
  if (isCreate || data.contactMethod !== undefined) {
    const cMethod = sanitizeText(data.contactMethod);
    if (!cMethod || cMethod.length < 3 || cMethod.length > 100) {
      errors.push("Field 'contactMethod' is required and must be between 3 and 100 characters (e.g. email, phone, room number)");
    }
  }

  // Optional imageKey validation
  if (data.imageKey !== undefined && data.imageKey !== null && data.imageKey !== '') {
    if (typeof data.imageKey !== 'string' || !/^uploads\/[a-zA-Z0-9._-]+$/.test(data.imageKey)) {
      errors.push("Field 'imageKey' is invalid. Must be an uploaded key under uploads/ prefix");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      type: data.type,
      name: sanitizeText(data.name),
      category: data.category,
      description: sanitizeText(data.description),
      location: sanitizeText(data.location),
      eventDate: data.eventDate,
      contactName: sanitizeText(data.contactName),
      contactMethod: sanitizeText(data.contactMethod),
      imageKey: data.imageKey ? data.imageKey.trim() : null,
    },
  };
}

/**
 * Validates allowed status transitions
 */
export function validateStatusTransition(currentStatus, nextStatus, isAdmin = false) {
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    return { isAllowed: false, reason: `Invalid status: ${nextStatus}. Allowed: ${ALLOWED_STATUSES.join(', ')}` };
  }

  if (currentStatus === nextStatus) {
    return { isAllowed: true, reason: 'No status change' };
  }

  // Admin can perform any transition
  if (isAdmin) {
    return { isAllowed: true };
  }

  // Standard user transitions:
  // active -> returned (recovered)
  // active -> archived
  // returned -> archived
  if (currentStatus === 'active' && (nextStatus === 'returned' || nextStatus === 'archived')) {
    return { isAllowed: true };
  }

  if (currentStatus === 'returned' && nextStatus === 'archived') {
    return { isAllowed: true };
  }

  if (currentStatus === 'under_review') {
    return { isAllowed: false, reason: 'This report is currently under review by campus moderators and cannot be altered by owners.' };
  }

  if (currentStatus === 'archived') {
    return { isAllowed: false, reason: 'Archived reports cannot be reopened.' };
  }

  return { isAllowed: false, reason: `Transition from '${currentStatus}' to '${nextStatus}' is not permitted.` };
}

/**
 * Validates abuse report payload
 */
export function validateReportInput(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object'] };
  }

  if (!data.reason || !ALLOWED_REPORT_REASONS.includes(data.reason)) {
    errors.push(`Field 'reason' must be one of: ${ALLOWED_REPORT_REASONS.join(', ')}`);
  }

  const details = sanitizeText(data.details || '');
  if (details.length > 500) {
    errors.push("Field 'details' cannot exceed 500 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      reason: data.reason,
      details,
    },
  };
}
