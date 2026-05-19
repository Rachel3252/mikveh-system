import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/index.css';
// import './styles/design-system.css';
import './i18n';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content is available.');
  },
  onOfflineReady() {
    console.log('App is ready to work offline.');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export { updateSW };
