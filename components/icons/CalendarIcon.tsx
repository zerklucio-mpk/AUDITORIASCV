import React from 'react';

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M5.75 3a.75.75 0 00-.75.75v.5h14v-.5a.75.75 0 00-.75-.75h-12.5zM4.25 5.5A1.75 1.75 0 002.5 7.25v10.5A1.75 1.75 0 004.25 19.5h15.5A1.75 1.75 0 0021.5 17.75V7.25A1.75 1.75 0 0019.75 5.5H4.25zM12 11.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75zm-3.75.75a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3zm7.5 0a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
      clipRule="evenodd"
    />
  </svg>
);

export default CalendarIcon;
