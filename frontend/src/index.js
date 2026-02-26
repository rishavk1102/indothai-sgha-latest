import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import 'primeicons/primeicons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

