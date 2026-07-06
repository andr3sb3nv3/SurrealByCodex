import React from 'react';
import SurrealHorizonsApp from './SurrealHorizonsApp';

const ALLOWED_EMAIL = 'aigurubenvenuto@gmail.com';

const DemoApp: React.FC = () => {
  return <SurrealHorizonsApp allowedEmail={ALLOWED_EMAIL} />;
};

export default DemoApp;
