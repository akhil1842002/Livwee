/**
 * Reusable Form Validation Utility for Livwee Admin
 */

export interface ValidationRule<T = any> {
  required?: boolean | string
  min?: number | { value: number; message: string }
  max?: number | { value: number; message: string }
  positive?: boolean | string // number > 0
  nonZero?: boolean | string  // number !== 0
  minLength?: number | { value: number; message: string }
  pattern?: { regex: RegExp; message: string }
  email?: boolean | string
  phone?: boolean | string
  custom?: (value: any, formData: T) => string | undefined
  label?: string
}

export type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule<T>
}

export type FormErrors<T> = Partial<Record<keyof T, string>>

export interface ValidationResult<T> {
  errors: FormErrors<T>
  isValid: boolean
}

/**
 * Validates whether a value is provided (not empty string, null, undefined, or empty array).
 */
export function required(value: unknown, label = 'This field'): string | undefined {
  if (value === null || value === undefined) {
    return `${label} is required`
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${label} is required`
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${label} is required`
  }
  return undefined
}

/**
 * Validates a number is greater than 0.
 */
export function positiveNumber(value: unknown, label = 'Value'): string | undefined {
  const num = Number(value)
  if (isNaN(num) || num <= 0) {
    return `${label} must be greater than 0`
  }
  return undefined
}

/**
 * Validates a number is non-zero.
 */
export function nonZeroNumber(value: unknown, label = 'Value'): string | undefined {
  const num = Number(value)
  if (isNaN(num) || num === 0) {
    return `${label} cannot be 0`
  }
  return undefined
}

/**
 * Validates email format.
 */
export function emailFormat(value: string, label = 'Email'): string | undefined {
  if (!value) return undefined
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value.trim())) {
    return `Invalid ${label.toLowerCase()} format`
  }
  return undefined
}

/**
 * Validates a single field against a rule object.
 */
export function validateField<T>(
  value: any,
  rule: ValidationRule<T>,
  formData?: T,
  fieldKey?: string
): string | undefined {
  const fieldLabel = rule.label || (fieldKey ? formatLabel(fieldKey) : 'Field')

  // 1. Required check
  if (rule.required) {
    const customMsg = typeof rule.required === 'string' ? rule.required : undefined
    const err = required(value, customMsg ? undefined : fieldLabel)
    if (err) return customMsg || err
  }

  // If value is empty and not required, skip further validations
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return undefined
  }

  // 2. Custom validation function
  if (rule.custom && formData) {
    const customErr = rule.custom(value, formData)
    if (customErr) return customErr
  }

  // 3. Positive number check
  if (rule.positive) {
    const customMsg = typeof rule.positive === 'string' ? rule.positive : undefined
    const err = positiveNumber(value, customMsg ? undefined : fieldLabel)
    if (err) return customMsg || err
  }

  // 4. Non-zero number check
  if (rule.nonZero) {
    const customMsg = typeof rule.nonZero === 'string' ? rule.nonZero : undefined
    const err = nonZeroNumber(value, customMsg ? undefined : fieldLabel)
    if (err) return customMsg || err
  }

  // 5. Min number check
  if (rule.min !== undefined) {
    const minVal = typeof rule.min === 'number' ? rule.min : rule.min.value
    const customMsg = typeof rule.min === 'object' ? rule.min.message : undefined
    const num = Number(value)
    if (isNaN(num) || num < minVal) {
      return customMsg || `${fieldLabel} must be at least ${minVal}`
    }
  }

  // 6. Max number check
  if (rule.max !== undefined) {
    const maxVal = typeof rule.max === 'number' ? rule.max : rule.max.value
    const customMsg = typeof rule.max === 'object' ? rule.max.message : undefined
    const num = Number(value)
    if (isNaN(num) || num > maxVal) {
      return customMsg || `${fieldLabel} cannot exceed ${maxVal}`
    }
  }

  // 7. Min length check
  if (rule.minLength !== undefined) {
    const minLen = typeof rule.minLength === 'number' ? rule.minLength : rule.minLength.value
    const customMsg = typeof rule.minLength === 'object' ? rule.minLength.message : undefined
    const strVal = String(value ?? '')
    if (strVal.length < minLen) {
      return customMsg || `${fieldLabel} must be at least ${minLen} characters`
    }
  }

  // 8. Pattern check
  if (rule.pattern) {
    if (!rule.pattern.regex.test(String(value))) {
      return rule.pattern.message || `Invalid ${fieldLabel.toLowerCase()} format`
    }
  }

  // 9. Email check
  if (rule.email) {
    const customMsg = typeof rule.email === 'string' ? rule.email : undefined
    const err = emailFormat(String(value), customMsg ? undefined : fieldLabel)
    if (err) return customMsg || err
  }

  // 10. Phone check (Indian phone number: 10 digits starting with 6-9)
  if (rule.phone) {
    const customMsg = typeof rule.phone === 'string' ? rule.phone : undefined
    const err = indianPhoneFormat(String(value), customMsg ? undefined : fieldLabel)
    if (err) return customMsg || err
  }

  return undefined
}

/**
 * Validates Indian phone number format (10 digits starting with 6-9).
 */
export function indianPhoneFormat(value: string, label = 'Phone number'): string | undefined {
  if (!value) return undefined
  const cleaned = String(value).trim()
  if (!cleaned) return undefined
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return `${label} must be a valid 10-digit Indian number starting with 6-9`
  }
  return undefined
}

/**
 * Main form validation runner using a declarative schema.
 */
export function validateForm<T extends Record<string, any>>(
  formData: T,
  schema: ValidationSchema<T>
): ValidationResult<T> {
  const errors: FormErrors<T> = {}

  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      const rule = schema[key]
      if (rule) {
        const error = validateField(formData[key], rule, formData, key)
        if (error) {
          errors[key] = error
        }
      }
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

/**
 * Helper to convert camelCase field names to readable labels for error messages.
 * e.g., "purchasePrice" -> "Purchase price"
 */
function formatLabel(str: string): string {
  const result = str.replace(/([A-Z])/g, ' $1').toLowerCase()
  return result.charAt(0).toUpperCase() + result.slice(1)
}
