'use client'

export default function OneSignalSubscriptionCard() {
  const handleSubscribe = () => {
    // Trigger the OneSignal button in header
    const bellButton = document.querySelector('[aria-label="Subscribe to notifications"]') as HTMLButtonElement;
    if (bellButton) {
      bellButton.click();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        Get notified instantly when new Tamil song lyrics are added to our collection.
      </p>
      
      <button 
        onClick={handleSubscribe}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Subscribe to Notifications
      </button>
      
      <p className="text-xs text-gray-500 mt-3">
        You can unsubscribe at any time. Your privacy is important to us.
      </p>
    </div>
  );
}
