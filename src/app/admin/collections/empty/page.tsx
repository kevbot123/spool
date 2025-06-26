'use client';

import { Building2 } from 'lucide-react';

export default function EmptyCollectionsPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Collections Yet</h2>
        <p className="text-gray-500 mb-6">
          Get started by creating your first collection. Collections help you organize different types of content like blog posts, pages, or products.
        </p>
        <button
          onClick={() => {
            // Trigger collection creation modal via custom event
            window.dispatchEvent(new CustomEvent('openCollectionModal'));
          }}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 font-medium"
        >
          Create Your First Collection
        </button>
      </div>
    </div>
  );
} 