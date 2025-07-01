import React from 'react';

// Placeholder embed script. Replace with actual embed widget implementation if needed.
export default function SpoolEmbed() {
  return (
    <div className="spool-embed-placeholder">
      Spool Embed Placeholder
    </div>
  );
}

// If the embed is meant to be injected via script, you can expose it globally here
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.SpoolEmbed = SpoolEmbed;
} 