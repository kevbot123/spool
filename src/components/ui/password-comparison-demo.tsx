import React, { useState } from 'react';
import { validatePassword, validatePasswordComplex, COMPLEX_REQUIREMENTS } from '@/lib/password-validation';
import { PasswordStrengthIndicator } from './password-strength-indicator';
import { Input } from './input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export function PasswordComparisonDemo() {
  const [password, setPassword] = useState('');
  
  const simpleValidation = validatePassword(password); // Now using simple by default
  const complexValidation = validatePasswordComplex(password);

  const testPasswords = [
    'Pass123!',     // 8 chars, complex
    'mypassword',   // 10 chars, simple
    'bluemountain2024', // 17 chars, simple
    'Tr0ub4dor&3',  // 12 chars, complex (xkcd reference)
    'correct horse battery staple', // 29 chars, spaces
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Password Security Approaches</h2>
        <p className="text-gray-600">Compare complex requirements vs. simple 10+ character minimum</p>
      </div>

      <div className="space-y-4">
        <label htmlFor="password-test" className="text-sm font-medium">
          Test Password:
        </label>
        <Input
          id="password-test"
          type="text"
          placeholder="Try different passwords..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Simple Approach */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current: 10+ Characters (Simple)</CardTitle>
            <CardDescription>
              Just 10+ characters minimum with rate limiting (6 fails/min per IP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Status:</strong> {' '}
                <span className={simpleValidation.isValid ? 'text-green-600' : 'text-red-600'}>
                  {simpleValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                </span>
              </div>
              
              <PasswordStrengthIndicator 
                password={password}
                showErrors={true}
                className="mt-3"
              />
              
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <strong>Security:</strong> ~62^{password.length} combinations = 
                {password.length >= 10 ? ' Highly secure with rate limiting' : ' Increase length for better security'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Complex Approach */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legacy: Complex Requirements</CardTitle>
            <CardDescription>
              8+ chars with uppercase, lowercase, numbers, symbols OR 15+ char passphrase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <strong>Status:</strong> {' '}
                <span className={complexValidation.isValid ? 'text-green-600' : 'text-red-600'}>
                  {complexValidation.isValid ? '✓ Valid' : '✗ Invalid'}
                </span>
              </div>
              
              <PasswordStrengthIndicator 
                password={password}
                requirements={COMPLEX_REQUIREMENTS}
                showErrors={true}
                className="mt-3"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Try These Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {testPasswords.map((testPass, index) => (
              <button
                key={index}
                onClick={() => setPassword(testPass)}
                className="text-left p-2 text-sm border rounded hover:bg-gray-50 font-mono"
              >
                {testPass}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Entropy Comparison:</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• 8 chars complex: ~6.6 × 10^15 combinations</li>
              <li>• 10 chars simple: ~8.4 × 10^17 combinations (127x stronger!)</li>
              <li>• 15 chars simple: ~7.9 × 10^26 combinations</li>
            </ul>
          </div>
          
          <div>
            <strong>With Rate Limiting (6 attempts/minute per IP):</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• 10 chars = ~2.6 billion years to crack online</li>
              <li>• Makes online brute force effectively impossible</li>
              <li>• No need for CAPTCHA or account lockouts</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <strong>✅ New Approach:</strong> Simple 10+ character minimum with IP-based rate limiting 
            provides better security AND user experience than complex short passwords.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 