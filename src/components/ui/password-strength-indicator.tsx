import React from 'react';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthProgress, isPassphrase, type PasswordRequirements } from '@/lib/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  requirements?: Partial<PasswordRequirements>;
  showErrors?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  requirements = {}, 
  showErrors = true,
  className = '' 
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password, requirements);
  
  if (!password) {
    return null;
  }

  const progressColor = validation.strength === 'strong' ? 'bg-green-500' :
                       validation.strength === 'good' ? 'bg-blue-500' :
                       validation.strength === 'fair' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Password strength:</span>
          <span className={`text-xs font-medium capitalize ${getPasswordStrengthColor(validation.strength)}`}>
            {validation.strength}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${getPasswordStrengthProgress(validation.score)}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <PasswordRequirement 
          met={password.length >= (requirements.minLength || 8)} 
          text={`At least ${requirements.minLength || 8} characters`} 
        />
      </div>

      {/* Error messages */}
      {showErrors && validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="text-xs text-red-600">
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
        met ? 'bg-green-500' : 'bg-gray-300'
      }`}>
        {met && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className={met ? 'text-green-600' : 'text-gray-500'}>{text}</span>
    </div>
  );
} 